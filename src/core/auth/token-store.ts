import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export const REFRESH_TOKEN_KEY = 'focus.refreshToken';

let accessToken: string | null = null;
let sessionEpoch = 0;

type RefreshTokenBackend = {
  read(key: string): Promise<string | null>;
  write(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
};

function getWebStorage(): Storage | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    return storage ?? null;
  } catch {
    return null;
  }
}

const webBackend: RefreshTokenBackend = {
  async read(key) {
    return getWebStorage()?.getItem(key) ?? null;
  },
  async write(key, value) {
    getWebStorage()?.setItem(key, value);
  },
  async remove(key) {
    getWebStorage()?.removeItem(key);
  },
};

const nativeBackend: RefreshTokenBackend = {
  read: (key) => SecureStore.getItemAsync(key),
  write: (key, value) => SecureStore.setItemAsync(key, value),
  remove: (key) => SecureStore.deleteItemAsync(key),
};

function refreshTokenBackend(): RefreshTokenBackend {
  return Platform.OS === 'web' ? webBackend : nativeBackend;
}

export const tokenStore = {
  getAccessToken(): string | null {
    return accessToken;
  },
  setAccessToken(token: string): void {
    accessToken = token;
  },
  clearAccessToken(): void {
    accessToken = null;
  },
  getRefreshToken(): Promise<string | null> {
    return refreshTokenBackend().read(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): Promise<void> {
    return refreshTokenBackend().write(REFRESH_TOKEN_KEY, token);
  },
  clearRefreshToken(): Promise<void> {
    return refreshTokenBackend().remove(REFRESH_TOKEN_KEY);
  },
  getSessionEpoch(): number {
    return sessionEpoch;
  },
  async clearAll(): Promise<void> {
    accessToken = null;
    sessionEpoch += 1;
    await refreshTokenBackend().remove(REFRESH_TOKEN_KEY);
  },
};
