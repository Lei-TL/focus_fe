import * as SecureStore from 'expo-secure-store';

export const REFRESH_TOKEN_KEY = 'focus.refreshToken';

let accessToken: string | null = null;
let sessionEpoch = 0;

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
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string): Promise<void> {
    return SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
  },
  clearRefreshToken(): Promise<void> {
    return SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
  getSessionEpoch(): number {
    return sessionEpoch;
  },
  async clearAll(): Promise<void> {
    accessToken = null;
    sessionEpoch += 1;
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
