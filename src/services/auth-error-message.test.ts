import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import { authErrorMessage } from '@/services/auth-error-message';

function httpError(status: number, data?: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data,
  });
}

describe('authErrorMessage', () => {
  test('maps 400 even when the body text looks like another error', () => {
    expect(authErrorMessage(httpError(400, { detail: 'Email already exists' }))).toContain('hợp lệ');
  });

  test('maps 401 even when the body text looks like a conflict', () => {
    expect(authErrorMessage(httpError(401, { detail: 'Email đã tồn tại' }))).toContain(
      'không đúng'
    );
  });

  test('maps 409 even when the body text looks like a validation error', () => {
    expect(authErrorMessage(httpError(409, { detail: 'invalid password' }))).toContain(
      'đã được đăng ký'
    );
  });

  test('maps 429 by status', () => {
    expect(authErrorMessage(httpError(429))).toContain('quá nhanh');
  });

  test('maps a response-less network error', () => {
    expect(authErrorMessage(new AxiosError('Network Error'))).toContain('Không kết nối');
  });
});
