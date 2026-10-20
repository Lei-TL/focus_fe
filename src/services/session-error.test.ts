import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AxiosError as AxiosErrorClass } from 'axios';

import {
  isAbortedSessionRequest,
  readConflictSessionId,
  toSessionError,
} from '@/services/session-error';

function httpError(status: number, data?: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosErrorClass('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    data,
    config,
  });
}

describe('toSessionError', () => {
  test('maps 400 to validation', () => {
    expect(toSessionError(httpError(400, {}), 'start')).toMatchObject({
      code: 'validation',
      status: 400,
    });
  });

  test('maps 404 on start to notFound', () => {
    expect(toSessionError(httpError(404), 'start')).toMatchObject({
      code: 'notFound',
      status: 404,
    });
  });

  test('reads a root sessionId from a 409 start body', () => {
    const error = toSessionError(
      httpError(409, {
        error: 'An active session already exists.',
        sessionId: 'current-session',
      }),
      'start'
    );

    expect(error).toMatchObject({
      code: 'activeSessionExists',
      status: 409,
      sessionId: 'current-session',
    });
  });

  test('does not look for sessionId under meta', () => {
    const error = toSessionError(
      httpError(409, {
        error: 'An active session already exists.',
        meta: { sessionId: 'nested-session' },
      }),
      'start'
    );

    expect(error.code).toBe('workItemNotOpen');
    expect(error.sessionId).toBeUndefined();
  });

  test('maps a 409 start without sessionId to workItemNotOpen', () => {
    expect(
      toSessionError(httpError(409, { error: 'Work item is not open.' }), 'start')
    ).toMatchObject({ code: 'workItemNotOpen', status: 409 });
  });

  test('maps 409 on end to a generic conflict', () => {
    expect(toSessionError(httpError(409), 'end')).toMatchObject({
      code: 'conflict',
      status: 409,
    });
  });

  test('maps a missing response to network', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const error = new AxiosErrorClass('Network Error', 'ERR_NETWORK', config);

    expect(toSessionError(error, 'start')).toMatchObject({ code: 'network' });
  });

  test('maps 429 and 5xx', () => {
    expect(toSessionError(httpError(429), 'end').code).toBe('rateLimited');
    expect(toSessionError(httpError(500), 'end').code).toBe('server');
  });
});

describe('readConflictSessionId', () => {
  test('accepts only a non-empty root string', () => {
    expect(readConflictSessionId({ sessionId: 's1' })).toBe('s1');
    expect(readConflictSessionId({ sessionId: '' })).toBeNull();
    expect(readConflictSessionId({ meta: { sessionId: 's1' } })).toBeNull();
    expect(readConflictSessionId(null)).toBeNull();
  });
});

describe('isAbortedSessionRequest', () => {
  test('recognizes axios cancellation', () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const error = new AxiosErrorClass('canceled', 'ERR_CANCELED', config);

    expect(isAbortedSessionRequest(error)).toBe(true);
    expect(isAbortedSessionRequest(new Error('other'))).toBe(false);
  });
});
