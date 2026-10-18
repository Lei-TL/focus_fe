import type { InternalAxiosRequestConfig } from 'axios';
import { create, isAxiosError } from 'axios';

import { refresh as requestRefresh } from '@/core/api/auth';
import { emitExpired } from '@/core/auth/auth-events';
import { tokenStore } from '@/core/auth/token-store';
import type { TokenPair } from '@/domain/auth';

export type RefreshFailureKind = 'definitive' | 'transient' | 'invalidated';

export class RefreshFailedError extends Error {
  readonly kind: RefreshFailureKind;

  constructor(kind: RefreshFailureKind, message: string) {
    super(message);
    this.name = 'RefreshFailedError';
    this.kind = kind;
  }
}

export const apiClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

function classifyRefreshFailure(error: unknown): RefreshFailureKind {
  if (isAxiosError(error) && error.response?.status === 401) {
    return 'definitive';
  }
  return 'transient';
}

// One rotation of the refresh token. The rotated refresh token is persisted
// before the new access token is published, and the result is discarded if the
// session epoch changed while the request was in flight (e.g. logout).
export async function refreshTokens(): Promise<TokenPair> {
  const epoch = tokenStore.getSessionEpoch();
  const currentRefreshToken = await tokenStore.getRefreshToken();
  if (!currentRefreshToken) {
    throw new RefreshFailedError('definitive', 'No refresh token available');
  }

  let pair: TokenPair;
  try {
    pair = await requestRefresh(currentRefreshToken);
  } catch (error) {
    throw new RefreshFailedError(classifyRefreshFailure(error), 'Refresh request failed');
  }

  if (tokenStore.getSessionEpoch() !== epoch) {
    throw new RefreshFailedError('invalidated', 'Session changed during refresh');
  }

  await tokenStore.setRefreshToken(pair.refreshToken);
  tokenStore.setAccessToken(pair.accessToken);
  return pair;
}

let inFlightRefresh: Promise<TokenPair> | null = null;

// Serializes refresh so simultaneous 401 responses share a single rotation and
// clears credentials exactly once when the refresh token is definitively gone.
function refreshOnce(): Promise<TokenPair> {
  if (!inFlightRefresh) {
    inFlightRefresh = (async () => {
      try {
        return await refreshTokens();
      } catch (error) {
        if (error instanceof RefreshFailedError && error.kind === 'definitive') {
          await tokenStore.clearAll().catch(() => undefined);
          emitExpired();
        }
        throw error;
      } finally {
        inFlightRefresh = null;
      }
    })();
  }
  return inFlightRefresh;
}

type RetriableConfig = InternalAxiosRequestConfig & { _authRetried?: boolean };

apiClient.interceptors.request.use((config) => {
  const accessToken = tokenStore.getAccessToken();
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`);
  }
  return config;
});

apiClient.interceptors.response.use(undefined, async (error) => {
  const config = error.config as RetriableConfig | undefined;
  const status = isAxiosError(error) ? error.response?.status : undefined;
  if (!config || status !== 401 || config._authRetried) {
    return Promise.reject(error);
  }

  config._authRetried = true;
  try {
    const pair = await refreshOnce();
    config.headers.set('Authorization', `Bearer ${pair.accessToken}`);
    return await apiClient.request(config);
  } catch {
    return Promise.reject(error);
  }
});
