import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import {
  login as loginRequest,
  refresh as requestRefresh,
  register as registerRequest,
} from '@/core/api/auth';
import { refreshTokens } from '@/core/api/client';
import { getMe } from '@/core/api/profile';
import { tokenStore } from '@/core/auth/token-store';
import type { TokenPair, UserProfile } from '@/domain/auth';
import * as authService from '@/services/auth-service';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

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

jest.mock('@/core/api/profile', () => ({
  getMe: jest.fn(),
}));

const storage = AsyncStorage as unknown as { removeItem: jest.Mock; getItem: jest.Mock };
const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const refreshMock = requestRefresh as jest.Mock;
const getMeMock = getMe as jest.Mock;
const loginMock = loginRequest as jest.Mock;
const registerMock = registerRequest as jest.Mock;

const profile: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  displayName: 'Người dùng',
  seed: 7,
  defaultSessionMinutes: 50,
  timeZoneId: 'Asia/Ho_Chi_Minh',
  role: 'Member',
};

function tokenPair(overrides: Partial<TokenPair> = {}): TokenPair {
  return {
    accessToken: 'access-new',
    refreshToken: 'refresh-new',
    accessExpiresAt: '',
    refreshExpiresAt: '',
    ...overrides,
  };
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

beforeEach(() => {
  jest.clearAllMocks();
  tokenStore.clearAccessToken();
});

describe('authService.bootstrap', () => {
  test('bootstrap_removesLegacyAsyncStorageAccessToken', async () => {
    storage.removeItem.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue(null);

    const result = await authService.bootstrap();

    expect(storage.removeItem).toHaveBeenCalledWith('focus.accessToken');
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(result).toEqual({ status: 'signedOut' });
  });

  test('bootstrap_legacyCleanupFailureDoesNotAuthenticate', async () => {
    storage.removeItem.mockRejectedValue(new Error('disk unavailable'));

    const result = await authService.bootstrap();

    expect(result).toEqual({ status: 'retryableError' });
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();
  });

  test('bootstrap_refreshesThenLoadsMe', async () => {
    storage.removeItem.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.setItemAsync.mockResolvedValue(undefined);
    refreshMock.mockResolvedValue(tokenPair());
    getMeMock.mockResolvedValue(profile);

    const result = await authService.bootstrap();

    expect(result).toEqual({ status: 'authenticated', profile });
    expect(refreshMock).toHaveBeenCalledWith('refresh-old');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('focus.refreshToken', 'refresh-new');
    expect(tokenStore.getAccessToken()).toBe('access-new');
    expect(getMeMock).toHaveBeenCalledTimes(1);
    expect(secureStore.setItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
      getMeMock.mock.invocationCallOrder[0]
    );
  });

  test('bootstrap_missingRefreshTokenSignsOut', async () => {
    storage.removeItem.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue(null);

    const result = await authService.bootstrap();

    expect(result).toEqual({ status: 'signedOut' });
    expect(refreshMock).not.toHaveBeenCalled();
    expect(getMeMock).not.toHaveBeenCalled();
  });

  test('bootstrap_refresh401ClearsCredentials', async () => {
    storage.removeItem.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    refreshMock.mockRejectedValue(failure(401));

    const result = await authService.bootstrap();

    expect(result).toEqual({ status: 'signedOut' });
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('focus.refreshToken');
    expect(getMeMock).not.toHaveBeenCalled();
  });

  test('bootstrap_transientFailureRetainsRefreshToken', async () => {
    storage.removeItem.mockResolvedValue(undefined);
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    refreshMock.mockRejectedValue(new AxiosError('Network Error'));

    const result = await authService.bootstrap();

    expect(result).toEqual({ status: 'retryableError' });
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});

describe('authService.login/register/logout', () => {
  test('login persists rotation then loads the profile', async () => {
    loginMock.mockResolvedValue(tokenPair());
    secureStore.setItemAsync.mockResolvedValue(undefined);
    getMeMock.mockResolvedValue(profile);

    const result = await authService.login({ email: 'user@example.com', password: 'password12345' });

    expect(result).toEqual(profile);
    expect(secureStore.setItemAsync).toHaveBeenCalledWith('focus.refreshToken', 'refresh-new');
    expect(tokenStore.getAccessToken()).toBe('access-new');
    expect(secureStore.setItemAsync.mock.invocationCallOrder[0]).toBeLessThan(
      getMeMock.mock.invocationCallOrder[0]
    );
  });

  test('login clears the session when the profile load fails', async () => {
    loginMock.mockResolvedValue(tokenPair());
    secureStore.setItemAsync.mockResolvedValue(undefined);
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    getMeMock.mockRejectedValue(new AxiosError('Network Error'));

    await expect(
      authService.login({ email: 'user@example.com', password: 'password12345' })
    ).rejects.toBeTruthy();

    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith('focus.refreshToken');
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  test('register sends the contract defaults and does not create a session', async () => {
    registerMock.mockResolvedValue(profile);

    const result = await authService.register({
      email: 'user@example.com',
      password: 'password12345',
      displayName: 'Người dùng',
    });

    expect(registerMock).toHaveBeenCalledWith({
      email: 'user@example.com',
      password: 'password12345',
      displayName: 'Người dùng',
      timeZoneId: 'Asia/Ho_Chi_Minh',
    });
    expect(result).toEqual(profile);
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('logoutInvalidatesPendingRefresh', async () => {
    secureStore.getItemAsync.mockResolvedValue('refresh-old');
    secureStore.deleteItemAsync.mockResolvedValue(undefined);
    let releaseRefresh: (value: TokenPair) => void = () => undefined;
    refreshMock.mockImplementation(
      () =>
        new Promise<TokenPair>((resolve) => {
          releaseRefresh = resolve;
        })
    );

    const pending = refreshTokens();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(refreshMock).toHaveBeenCalledWith('refresh-old');

    await authService.logout();
    releaseRefresh(tokenPair({ accessToken: 'late-access', refreshToken: 'late-refresh' }));

    await expect(pending).rejects.toMatchObject({ kind: 'invalidated' });
    expect(tokenStore.getAccessToken()).toBeNull();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });
});
