import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { AxiosError as AxiosErrorClass } from 'axios';

import * as sessionsApi from '@/core/api/sessions';
import { isSessionError, SessionClientError } from '@/services/session-error';
import {
  endFocusSession,
  getCurrentFocusSession,
  getFocusSession,
  recordFocusSessionEvents,
  startFocusSession,
} from '@/services/session-service';

jest.mock('@/core/api/sessions', () => ({
  startSession: jest.fn(),
  endSession: jest.fn(),
  getSession: jest.fn(),
  getCurrentSession: jest.fn(),
  recordSessionEvents: jest.fn(),
}));

const startApi = sessionsApi.startSession as jest.Mock;
const endApi = sessionsApi.endSession as jest.Mock;
const detailApi = sessionsApi.getSession as jest.Mock;
const currentApi = sessionsApi.getCurrentSession as jest.Mock;
const eventsApi = sessionsApi.recordSessionEvents as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('session-service error mapping', () => {
  test('maps a start 400 to a validation client error', async () => {
    startApi.mockRejectedValue(httpError(400, { error: 'Invalid planned seconds.' }));

    const failure = await startFocusSession('w1', 10).catch((error: unknown) => error);

    expect(isSessionError(failure)).toBe(true);
    expect(failure).toBeInstanceOf(SessionClientError);
    expect(failure).toMatchObject({ code: 'validation', status: 400 });
  });

  test('keeps the root sessionId of a start 409', async () => {
    startApi.mockRejectedValue(
      httpError(409, { error: 'An active session already exists.', sessionId: 's1' })
    );

    const failure = await startFocusSession('w1', 900).catch((error: unknown) => error);

    expect(failure).toMatchObject({
      code: 'activeSessionExists',
      status: 409,
      sessionId: 's1',
    });
  });

  test('maps an end 409 to a conflict', async () => {
    endApi.mockRejectedValue(httpError(409, { error: 'Session changed.' }));

    const failure = await endFocusSession('s1', 'Completed').catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: 'conflict', status: 409 });
  });

  test('maps an end 404 to notFound', async () => {
    endApi.mockRejectedValue(httpError(404));

    const failure = await endFocusSession('s1', 'Cancelled').catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: 'notFound', status: 404 });
  });

  test('maps a detail 400 for a non-UUID id to validation', async () => {
    detailApi.mockRejectedValue(httpError(400, { error: 'The id must be a UUID.' }));

    const failure = await getFocusSession('not-a-uuid').catch((error: unknown) => error);

    expect(detailApi).toHaveBeenCalledWith('not-a-uuid', undefined);
    expect(failure).toMatchObject({ code: 'validation', status: 400 });
    expect(failure).toBeInstanceOf(SessionClientError);
  });

  test('maps a current 401 to unauthorized', async () => {
    currentApi.mockRejectedValue(httpError(401));

    const failure = await getCurrentFocusSession().catch((error: unknown) => error);

    expect(failure).toMatchObject({ code: 'unauthorized', status: 401 });
  });

  test('rethrows a cancelled request unchanged so aborts stay detectable', async () => {
    const config = { headers: {} } as InternalAxiosRequestConfig;
    const cancelled = new AxiosErrorClass('canceled', 'ERR_CANCELED', config);
    startApi.mockRejectedValue(cancelled);

    const failure = await startFocusSession('w1', 900).catch((error: unknown) => error);

    expect(failure).toBe(cancelled);
    expect(isSessionError(failure)).toBe(false);
  });

  test('records session events and returns the server counts', async () => {
    const events = [
      {
        clientEventId: '0f7a1e4c-4a3c-4c1b-9b2e-0f9f0d1c2b3a',
        type: 'Heartbeat' as const,
        source: 'Device' as const,
        clientTs: '2026-10-21T09:00:00.000+07:00',
      },
    ];
    eventsApi.mockResolvedValue({ receivedCount: 1, insertedCount: 0, duplicateCount: 1 });

    await expect(recordFocusSessionEvents('s1', events)).resolves.toEqual({
      receivedCount: 1,
      insertedCount: 0,
      duplicateCount: 1,
    });
    expect(eventsApi).toHaveBeenCalledWith('s1', events, undefined);
  });

  test('maps an events 409 to a conflict about the closed session', async () => {
    eventsApi.mockRejectedValue(httpError(409));

    const failure = await recordFocusSessionEvents('s1', []).catch(
      (error: unknown) => error
    );

    expect(failure).toMatchObject({ code: 'conflict', status: 409 });
    expect((failure as SessionClientError).message).toContain('kết thúc');
  });
});
