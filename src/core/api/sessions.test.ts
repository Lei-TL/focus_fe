import type { AxiosAdapter, AxiosResponse } from 'axios';

import { apiClient } from '@/core/api/client';
import {
  endSession,
  getCurrentSession,
  getSession,
  recordSessionEvents,
  startSession,
} from '@/core/api/sessions';

type Captured = {
  method?: string;
  url?: string;
  data?: unknown;
};

let captured: Captured[] = [];

function useAdapter(status: number, data: unknown) {
  apiClient.defaults.adapter = (async (config) => {
    captured.push({ method: config.method, url: config.url, data: config.data });
    return {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    } as AxiosResponse;
  }) as AxiosAdapter;
}

function bodyOf(entry: Captured | undefined): unknown {
  return entry?.data ? JSON.parse(String(entry.data)) : null;
}

beforeEach(() => {
  captured = [];
  apiClient.defaults.adapter = undefined;
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
});

describe('session API transport', () => {
  test('starts a session with the work item and planned seconds', async () => {
    useAdapter(201, {
      sessionId: 's1',
      workItemId: 'w1',
      serverStartTime: '2026-10-20T01:00:00.000Z',
      plannedSeconds: 1500,
      status: 'Active',
    });

    await startSession('w1', 1500);

    expect(captured[0]).toMatchObject({ method: 'post', url: '/sessions/start' });
    expect(bodyOf(captured[0])).toEqual({ workItemId: 'w1', plannedSeconds: 1500 });
  });

  test('omits plannedSeconds when the server default should be used', async () => {
    useAdapter(201, { sessionId: 's1' });

    await startSession('w1');

    expect(bodyOf(captured[0])).toEqual({ workItemId: 'w1' });
  });

  test('ends a session by id with an explicit reason', async () => {
    useAdapter(200, { sessionId: 's1', status: 'Completed' });

    await endSession('s1', 'Cancelled');

    expect(captured[0]).toMatchObject({ method: 'post', url: '/sessions/s1/end' });
    expect(bodyOf(captured[0])).toEqual({ reason: 'Cancelled' });
  });

  test('reads session detail by id', async () => {
    useAdapter(200, { sessionId: 's1' });

    await getSession('s1');

    expect(captured[0]).toMatchObject({ method: 'get', url: '/sessions/s1' });
  });

  test('returns the current session on 200', async () => {
    const current = {
      sessionId: 's1',
      workItemId: 'w1',
      status: 'Active',
      serverStartTime: '2026-10-20T01:00:00.000Z',
      plannedSeconds: 1500,
      serverNow: '2026-10-20T01:05:00.000Z',
    };
    useAdapter(200, current);

    await expect(getCurrentSession()).resolves.toEqual(current);
  });

  test('returns null when /sessions/current responds 204', async () => {
    useAdapter(204, undefined);

    await expect(getCurrentSession()).resolves.toBeNull();
  });

  test('records a batch of session events', async () => {
    const events = [
      {
        clientEventId: '0f7a1e4c-4a3c-4c1b-9b2e-0f9f0d1c2b3a',
        type: 'Heartbeat' as const,
        source: 'Device' as const,
        clientTs: '2026-10-21T09:00:00.000+07:00',
      },
      {
        clientEventId: '5d2b8f10-2c4e-4f6a-8b7c-1a2b3c4d5e6f',
        type: 'Background' as const,
        source: 'Device' as const,
        clientTs: '2026-10-21T09:00:30.000+07:00',
      },
    ];
    useAdapter(200, { receivedCount: 2, insertedCount: 1, duplicateCount: 1 });

    await expect(recordSessionEvents('s1', events)).resolves.toEqual({
      receivedCount: 2,
      insertedCount: 1,
      duplicateCount: 1,
    });

    expect(captured[0]).toMatchObject({ method: 'post', url: '/sessions/s1/events' });
    expect(bodyOf(captured[0])).toEqual({ events });
  });
});
