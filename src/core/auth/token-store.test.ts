import * as SecureStore from 'expo-secure-store';

import { REFRESH_TOKEN_KEY, tokenStore } from '@/core/auth/token-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

const secureStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('tokenStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tokenStore.clearAccessToken();
  });

  test('tokenStore_keepsAccessTokenInMemoryOnly', () => {
    tokenStore.setAccessToken('access-1');

    expect(tokenStore.getAccessToken()).toBe('access-1');
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();

    tokenStore.clearAccessToken();

    expect(tokenStore.getAccessToken()).toBeNull();
    expect(secureStore.setItemAsync).not.toHaveBeenCalled();
  });

  test('tokenStore_readsAndWritesRefreshTokenThroughSecureStore', async () => {
    secureStore.getItemAsync.mockResolvedValue('refresh-1');
    await expect(tokenStore.getRefreshToken()).resolves.toBe('refresh-1');
    expect(secureStore.getItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);

    secureStore.setItemAsync.mockResolvedValue();
    await tokenStore.setRefreshToken('refresh-2');
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY, 'refresh-2');

    secureStore.deleteItemAsync.mockResolvedValue();
    await tokenStore.clearRefreshToken();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_TOKEN_KEY);
  });

  test('tokenStore_clearsAccessBeforeSecureDelete', async () => {
    tokenStore.setAccessToken('access-1');
    let accessDuringDelete: string | null = 'unset';
    secureStore.deleteItemAsync.mockImplementation(async () => {
      accessDuringDelete = tokenStore.getAccessToken();
    });

    await tokenStore.clearAll();

    expect(accessDuringDelete).toBeNull();
    expect(tokenStore.getAccessToken()).toBeNull();
  });

  test('tokenStore_clearAllAdvancesEpochImmediately', async () => {
    const before = tokenStore.getSessionEpoch();
    let epochDuringDelete = -1;
    secureStore.deleteItemAsync.mockImplementation(async () => {
      epochDuringDelete = tokenStore.getSessionEpoch();
    });

    await tokenStore.clearAll();

    expect(tokenStore.getSessionEpoch()).toBe(before + 1);
    expect(epochDuringDelete).toBe(before + 1);
  });

  test('tokenStore_neverFallsBackWhenSecureStoreRejects', async () => {
    secureStore.setItemAsync.mockRejectedValue(new Error('secure store unavailable'));

    await expect(tokenStore.setRefreshToken('refresh-1')).rejects.toThrow(
      'secure store unavailable'
    );
    expect(secureStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(tokenStore.getRefreshToken).toBeDefined();
    expect(secureStore.getItemAsync).not.toHaveBeenCalled();
  });
});
