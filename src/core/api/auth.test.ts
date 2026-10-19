import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import { authClient, login, refresh, register } from '@/core/api/auth';
import type { TokenPair, UserProfile } from '@/domain/auth';

const profile: UserProfile = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'user@example.com',
  displayName: 'Người dùng',
  seed: 42,
  defaultSessionMinutes: 50,
  timeZoneId: 'Asia/Ho_Chi_Minh',
  role: 'Member',
};

const tokenPair: TokenPair = {
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  accessExpiresAt: '2026-01-01T00:00:00Z',
  refreshExpiresAt: '2026-02-01T00:00:00Z',
};

let requests: InternalAxiosRequestConfig[] = [];

function response(
  config: InternalAxiosRequestConfig,
  status: number,
  data: unknown
): AxiosResponse {
  return { data, status, statusText: String(status), headers: {}, config };
}

function failure(
  status: number,
  data?: unknown,
  config: InternalAxiosRequestConfig = {} as InternalAxiosRequestConfig
): AxiosError {
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data,
  });
}

function useAdapter(
  handler: (config: InternalAxiosRequestConfig) => AxiosResponse | AxiosError
): void {
  requests = [];
  const adapter: AxiosAdapter = async (config) => {
    requests.push(config);
    const result = handler(config);
    if (result instanceof AxiosError) {
      throw result;
    }
    return result;
  };
  authClient.defaults.adapter = adapter;
}

const registerBody = {
  email: 'user@example.com',
  password: 'password12345',
  displayName: 'Người dùng',
  timeZoneId: 'Asia/Ho_Chi_Minh',
};

afterEach(() => {
  authClient.defaults.adapter = undefined;
});

describe('auth API', () => {
  test('register posts the contract body and resolves the profile only (201)', async () => {
    useAdapter((config) => response(config, 201, profile));

    const result = await register(registerBody);

    expect(result).toEqual(profile);
    expect(requests).toHaveLength(1);
    expect(requests[0].method).toBe('post');
    expect(requests[0].url).toBe('/auth/register');
    expect(JSON.parse(requests[0].data as string)).toEqual(registerBody);
    expect(result).not.toHaveProperty('accessToken');
  });

  test('login posts credentials and resolves a TokenPair (200)', async () => {
    useAdapter((config) => response(config, 200, tokenPair));

    const result = await login({ email: 'user@example.com', password: 'password12345' });

    expect(result).toEqual(tokenPair);
    expect(requests[0].url).toBe('/auth/login');
    expect(JSON.parse(requests[0].data as string)).toEqual({
      email: 'user@example.com',
      password: 'password12345',
    });
  });

  test('refresh posts the refresh token and resolves a rotated TokenPair (200)', async () => {
    useAdapter((config) => response(config, 200, tokenPair));

    const result = await refresh('refresh-token');

    expect(result).toEqual(tokenPair);
    expect(requests[0].url).toBe('/auth/refresh');
    expect(JSON.parse(requests[0].data as string)).toEqual({ refreshToken: 'refresh-token' });
  });

  test('register surfaces a 409 conflict', async () => {
    useAdapter((config) => failure(409, { detail: 'Email already exists' }, config));

    await expect(register(registerBody)).rejects.toMatchObject({ response: { status: 409 } });
  });

  test('register surfaces a 400 validation error', async () => {
    useAdapter((config) => failure(400, { errors: {} }, config));

    await expect(register(registerBody)).rejects.toMatchObject({ response: { status: 400 } });
  });

  test('login surfaces a 401', async () => {
    useAdapter((config) => failure(401, undefined, config));

    await expect(
      login({ email: 'user@example.com', password: 'wrong' })
    ).rejects.toMatchObject({ response: { status: 401 } });
  });

  test('refresh surfaces a 401', async () => {
    useAdapter((config) => failure(401, undefined, config));

    await expect(refresh('stale-token')).rejects.toMatchObject({ response: { status: 401 } });
  });

  test('login surfaces a 429', async () => {
    useAdapter((config) => failure(429, undefined, config));

    await expect(
      login({ email: 'user@example.com', password: 'password12345' })
    ).rejects.toMatchObject({ response: { status: 429 } });
  });

  test('login surfaces the HTTP status even when the body carries a conflicting message', async () => {
    useAdapter((config) => failure(401, { detail: 'Email already exists' }, config));

    const error = await login({ email: 'user@example.com', password: 'x' }).catch((e) => e);

    expect(error.response.status).toBe(401);
  });
});
