import * as SecureStore from 'expo-secure-store';
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import { refresh as requestRefresh } from '@/core/api/auth';
import { apiClient, RefreshFailedError, refreshTokens } from '@/core/api/client';
import { subscribeExpired } from '@/core/auth/auth-events';
import { tokenStore } from '@/core/auth/token-store';
import type { TokenPair } from '@/domain/auth';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/core/api/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  refresh: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const refreshMock = requestRefresh as jest.Mock;

function tokenPair(overrides: Partial<TokenPair> = {}): TokenPair {
  return {
    accessToken: 'access-new',
    refreshToken: 'refresh-new',
    accessExpiresAt: '',
    refreshExpiresAt: '',
    ...overrides,
  };
}

function response(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown
): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config };
}

function failure(
  status: number,
  config: InternalAxiosRequestConfig = {} as InternalAxiosRequestConfig
): AxiosError {
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data: undefined,
  });
}

function authorizationOf(config: InternalAxiosRequestConfig): string {
  const headers = config.headers as { Authorization?: string; get?: (key: string) => unknown };
  if (typeof headers.get === 'function') {
    return String(headers.get('Authorization') ?? '');
  }
  return String(headers.Authorization ?? '');
}

beforeEach(() => {
  jest.clearAllMocks();
  tokenStore.clearAccessToken();
  apiClient.defaults.adapter = undefined;
});

describe('apiClient refresh lifecycle', () => {
  test('refresh401sAreSerializedAndEachRequestRetriesOnce', async () => {
    let refreshCalls = 0;
    let adapterCalls = 0;
    refreshMock.mockImplementation(async () => {
      refreshCalls += 1;
      await new Promise((resolve) => setTimeout(resolve, 10));
      return tokenPair();
    });
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.setItemAsync.mockResolvedValue();
    tokenStore.setAccessToken('access-old');

    apiClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      adapterCalls += 1;
      if (authorizationOf(config) === 'Bearer access-new') {
        return response(config, 200, { ok: true });
      }
      throw failure(401, config);
    }) as AxiosAdapter;

    const [first, second] = await Promise.all([
      apiClient.get('/protected'),
      apiClient.get('/protected'),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(refreshCalls).toBe(1);
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('focus.refreshToken', 'refresh-new');
    expect(tokenStore.getAccessToken()).toBe('access-new');
    expect(adapterCalls).toBe(4);
  });

  test('protectedRequestRetriesAtMostOnce', async () => {
    let refreshCalls = 0;
    let adapterCalls = 0;
    refreshMock.mockImplementation(async () => {
      refreshCalls += 1;
      return tokenPair();
    });
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.setItemAsync.mockResolvedValue();
    tokenStore.setAccessToken('access-old');

    apiClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      adapterCalls += 1;
      throw failure(401, config);
    }) as AxiosAdapter;

    await expect(apiClient.get('/protected')).rejects.toBeTruthy();
    expect(refreshCalls).toBe(1);
    expect(adapterCalls).toBe(2);
  });

  test('refreshStorageFailureDoesNotPublishNewAccessToken', async () => {
    refreshMock.mockResolvedValue(tokenPair());
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.setItemAsync.mockRejectedValue(new Error('secure store write failed'));
    tokenStore.setAccessToken('access-old');

    await expect(refreshTokens()).rejects.toThrow('secure store write failed');
    expect(tokenStore.getAccessToken()).toBe('access-old');
  });

  test('refreshReturnsDefinitiveFailureOn401', async () => {
    refreshMock.mockRejectedValue(failure(401));
    secureStore.getItemAsync.mockResolvedValue('refresh-old');

    await expect(refreshTokens()).rejects.toBeInstanceOf(RefreshFailedError);
    await expect(refreshTokens()).rejects.toMatchObject({ kind: 'definitive' });
  });

  test('refreshReturnsTransientFailureOnNetworkError', async () => {
    refreshMock.mockRejectedValue(new AxiosError('Network Error'));
    secureStore.getItemAsync.mockResolvedValue('refresh-old');

    await expect(refreshTokens()).rejects.toMatchObject({ kind: 'transient' });
  });

  test('interceptorClearsCredentialsAndEmitsExpiredOnDefinitiveRefresh401', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeExpired(listener);
    refreshMock.mockRejectedValue(failure(401));
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.deleteItemAsync.mockResolvedValue();
    tokenStore.setAccessToken('access-old');
    apiClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      throw failure(401, config);
    }) as AxiosAdapter;

    await expect(apiClient.get('/protected')).rejects.toBeTruthy();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('focus.refreshToken');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(tokenStore.getAccessToken()).toBeNull();
    unsubscribe();
  });

  test('transientRefreshFailureKeepsRefreshTokenAndDoesNotEmitExpired', async () => {
    const listener = jest.fn();
    const unsubscribe = subscribeExpired(listener);
    refreshMock.mockRejectedValue(new AxiosError('Network Error'));
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    apiClient.defaults.adapter = (async (config: InternalAxiosRequestConfig) => {
      throw failure(401, config);
    }) as AxiosAdapter;

    await expect(apiClient.get('/protected')).rejects.toBeTruthy();

    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
