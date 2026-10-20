import type { AxiosAdapter, AxiosResponse } from 'axios';

import { apiClient } from '@/core/api/client';
import {
  endSession,
  getCurrentSession,
  getSession,
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
});
