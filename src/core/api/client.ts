import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'axios';

const ACCESS_TOKEN_KEY = 'focus.accessToken';

export const apiClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use(async (config) => {
  const accessToken = await AsyncStorage.getItem(ACCESS_TOKEN_KEY);
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

export const tokenStorage = {
  get: () => AsyncStorage.getItem(ACCESS_TOKEN_KEY),
  set: (accessToken: string) => AsyncStorage.setItem(ACCESS_TOKEN_KEY, accessToken),
  clear: () => AsyncStorage.removeItem(ACCESS_TOKEN_KEY),
};
