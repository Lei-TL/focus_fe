import { create } from 'axios';

import type { LoginRequest, RegisterRequest, TokenPair, UserProfile } from '@/domain/auth';

// Public Auth transport. It must never import `apiClient`: the protected client
// installs a refresh interceptor, and the refresh call itself has to stay out of
// that interceptor to avoid a refresh loop.
export const authClient = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

export async function register(input: RegisterRequest): Promise<UserProfile> {
  const { data } = await authClient.post<UserProfile>('/auth/register', input);
  return data;
}

export async function login(input: LoginRequest): Promise<TokenPair> {
  const { data } = await authClient.post<TokenPair>('/auth/login', input);
  return data;
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const { data } = await authClient.post<TokenPair>('/auth/refresh', { refreshToken });
  return data;
}
