import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';

import { login as loginRequest, register as registerRequest } from '@/core/api/auth';
import { RefreshFailedError, refreshTokens } from '@/core/api/client';
import { getMe } from '@/core/api/profile';
import { tokenStore } from '@/core/auth/token-store';
import type { LoginRequest, RegisterInput, UserProfile } from '@/domain/auth';
import { DEFAULT_TIME_ZONE_ID } from '@/domain/auth';

// Legacy key from the pre-Auth AsyncStorage flow. It is removed on bootstrap and
// its value is never read or used for authentication.
export const LEGACY_ACCESS_TOKEN_KEY = 'focus.accessToken';

export type BootstrapResult =
  | { status: 'authenticated'; profile: UserProfile }
  | { status: 'signedOut' }
  | { status: 'retryableError' };

async function clearSessionQuietly(): Promise<void> {
  await tokenStore.clearAll().catch(() => undefined);
}

export async function bootstrap(): Promise<BootstrapResult> {
  try {
    await AsyncStorage.removeItem(LEGACY_ACCESS_TOKEN_KEY);
  } catch {
    return { status: 'retryableError' };
  }

  try {
    const refreshToken = await tokenStore.getRefreshToken();
    if (!refreshToken) {
      return { status: 'signedOut' };
    }

    await refreshTokens();
    const profile = await getMe();
    return { status: 'authenticated', profile };
  } catch (error) {
    if (error instanceof RefreshFailedError && error.kind === 'definitive') {
      await clearSessionQuietly();
      return { status: 'signedOut' };
    }
    if (isAxiosError(error) && error.response?.status === 401) {
      await clearSessionQuietly();
      return { status: 'signedOut' };
    }
    return { status: 'retryableError' };
  }
}

export async function register(input: RegisterInput): Promise<UserProfile> {
  return registerRequest({
    email: input.email,
    password: input.password,
    displayName: input.displayName,
    timeZoneId: DEFAULT_TIME_ZONE_ID,
  });
}

export async function login(input: LoginRequest): Promise<UserProfile> {
  const pair = await loginRequest(input);
  await tokenStore.setRefreshToken(pair.refreshToken);
  tokenStore.setAccessToken(pair.accessToken);

  try {
    return await getMe();
  } catch (error) {
    await clearSessionQuietly();
    throw error;
  }
}

export async function logout(): Promise<void> {
  await tokenStore.clearAll();
}
