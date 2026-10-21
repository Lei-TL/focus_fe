import { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  SessionProvider,
  useSession,
  type SessionContextValue,
  type StartSessionInput,
} from '@/context/session-context';
import { SessionClientError } from '@/services/session-error';
import * as sessionService from '@/services/session-service';
import * as workItemsService from '@/services/work-items-service';

let mockAuthStatus: 'signedIn' | 'signedOut' = 'signedIn';

jest.mock('@/context/auth-context', () => ({
  useAuth: () => ({ status: mockAuthStatus }),
}));

jest.mock('@/services/session-service', () => ({
  startFocusSession: jest.fn(),
  endFocusSession: jest.fn(),
  getCurrentFocusSession: jest.fn(),
  getFocusSession: jest.fn(),
  recordFocusSessionEvents: jest.fn(),
}));

jest.mock('@/services/work-items-service', () => ({
  getWorkItemDetail: jest.fn(),
}));

const startMock = sessionService.startFocusSession as jest.Mock;
const endMock = sessionService.endFocusSession as jest.Mock;
const currentMock = sessionService.getCurrentFocusSession as jest.Mock;
const detailMock = sessionService.getFocusSession as jest.Mock;
const recordMock = sessionService.recordFocusSessionEvents as jest.Mock;
const workItemDetailMock = workItemsService.getWorkItemDetail as jest.Mock;

const started = {
  sessionId: 's1',
  workItemId: 'w1',
  serverStartTime: '2026-10-20T01:00:00.000Z',
  plannedSeconds: 3000,
  status: 'Active' as const,
};

const ended = {
  sessionId: 's1',
  workItemId: 'w1',
  serverStartTime: '2026-10-20T01:00:00.000Z',
  serverEndTime: '2026-10-20T01:03:05.000Z',
  plannedSeconds: 3000,
  grossSeconds: 185,
  status: 'Completed' as const,
};

const input: StartSessionInput = {
  workItemId: 'w1',
  workItemTitle: 'Việc chính',
  plannedSeconds: 3000,
};

const base = Date.parse('2026-10-21T02:00:00.000Z');
const currentSession = {
  sessionId: 's1',
  workItemId: 'w1',
  status: 'Active' as const,
  serverStartTime: '2026-10-21T01:00:00.000Z',
  plannedSeconds: 1800,
  // The server clock is 5 minutes ahead of the device clock. Anchoring the
  // offset on serverStartTime instead would give 0 and show 60 minutes.
  serverNow: '2026-10-21T02:05:00.000Z',
};

let captured: SessionContextValue | null = null;

function Probe() {
  const value = useSession();

  useEffect(() => {
    captured = value;
  });

  return <Text testID="kind">{value.state.kind}</Text>;
}

function renderProvider() {
  return render(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );
}

// waitFor would advance the fake clock and skew the offset assertion, so the
// mocked promises are settled by flushing microtasks inside act instead.
async function settle() {
  await act(async () => {
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthStatus = 'signedIn';
  captured = null;
  jest.useFakeTimers();
  jest.setSystemTime(base);
  currentMock.mockResolvedValue(null);
  workItemDetailMock.mockResolvedValue({ id: 'w1', title: 'Việc chính' });
  recordMock.mockImplementation(async (_id: string, events: unknown[]) => ({
    receivedCount: events.length,
    insertedCount: events.length,
    duplicateCount: 0,
  }));
});

afterEach(() => {
  jest.useRealTimers();
});

test('restores the session, anchors the clock on serverNow and keeps one heartbeat', async () => {
  currentMock.mockResolvedValue(currentSession);

  renderProvider();
  await settle();

  expect(captured?.state).toMatchObject({
    kind: 'active',
    session: {
      sessionId: 's1',
      workItemId: 'w1',
      workItemTitle: 'Việc chính',
      plannedSeconds: 1800,
    },
  });
  const restored = captured?.state;
  expect(restored?.kind === 'active' ? restored.session.clockOffsetMs : null).toBe(300_000);
  expect(captured?.latestSessionByWorkItem).toEqual({ w1: 's1' });
  expect(captured?.recovery).toEqual({ status: 'idle', message: null });

  await act(async () => {
    await jest.advanceTimersByTimeAsync(91_000);
  });
  // Three ticks, each flushed once: a duplicated publisher or a second timer
  // would send six.
  expect(recordMock).toHaveBeenCalledTimes(3);
});

test('keeps the app without a session when /sessions/current answers 204', async () => {
  currentMock.mockResolvedValue(null);

  renderProvider();
  await settle();

  expect(currentMock).toHaveBeenCalledTimes(1);
  expect(captured?.state.kind).toBe('idle');
  expect(captured?.recovery.status).toBe('idle');
});

test('reports an unchecked state on a network error and retries on demand', async () => {
  currentMock.mockRejectedValueOnce(
    new SessionClientError({ code: 'network', message: 'Không kết nối được máy chủ.' })
  );

  renderProvider();
  await settle();
  expect(captured?.recovery.status).toBe('unavailable');
  expect(captured?.recovery.message).toContain('Không kiểm tra được phiên đang chạy');
  // A failed check must not be reported as "there is no session".
  expect(captured?.state.kind).toBe('idle');

  currentMock.mockResolvedValue(currentSession);
  await act(async () => {
    await captured?.checkCurrent({ force: true });
  });
  await settle();

  expect(captured?.state.kind).toBe('active');
  expect(captured?.recovery.status).toBe('idle');
});

test('coalesces an in-flight check instead of calling current twice', async () => {
  let release: (value: unknown) => void = () => undefined;
  currentMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );

  renderProvider();
  await settle();
  expect(currentMock).toHaveBeenCalledTimes(1);

  let second: Promise<void> | undefined;
  await act(async () => {
    second = captured?.checkCurrent({ force: true });
    await Promise.resolve();
  });
  expect(currentMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    release(null);
    await second;
  });
  await settle();
  expect(captured?.state.kind).toBe('idle');
});

test('does not overwrite the session in memory when current returns the same id', async () => {
  startMock.mockResolvedValue(started);

  renderProvider();
  await settle();
  await act(async () => {
    await captured?.start(input);
  });

  currentMock.mockResolvedValue({ ...currentSession, plannedSeconds: 3000 });
  await act(async () => {
    await captured?.checkCurrent({ force: true });
  });
  await settle();

  expect(captured?.state).toMatchObject({
    kind: 'active',
    session: {
      sessionId: 's1',
      workItemTitle: 'Việc chính',
      plannedSeconds: 3000,
    },
  });
  const refreshed = captured?.state;
  expect(refreshed?.kind === 'active' ? refreshed.session.clockOffsetMs : null).toBe(300_000);
  expect(captured?.recovery.status).toBe('idle');
});

test('reports a conflict when current returns a different session', async () => {
  startMock.mockResolvedValue(started);

  renderProvider();
  await settle();
  await act(async () => {
    await captured?.start(input);
  });

  currentMock.mockResolvedValue({ ...currentSession, sessionId: 's2' });
  await act(async () => {
    await captured?.checkCurrent({ force: true });
  });
  await settle();

  expect(captured?.state).toMatchObject({ kind: 'active', session: { sessionId: 's1' } });
  expect(captured?.recovery.status).toBe('conflict');
  expect(captured?.recovery.message).toMatch(/phiên khác/);
});

test('opens the running session from the 409 start id without starting another one', async () => {
  startMock.mockRejectedValue(
    new SessionClientError({
      code: 'activeSessionExists',
      message: 'Bạn đang có một phiên tập trung chưa kết thúc.',
      sessionId: 's1',
    })
  );

  renderProvider();
  await settle();

  let failure: unknown;
  await act(async () => {
    try {
      await captured?.start(input);
    } catch (error) {
      failure = error;
    }
  });
  expect(failure).toMatchObject({ code: 'activeSessionExists', sessionId: 's1' });

  currentMock.mockResolvedValue(currentSession);
  await act(async () => {
    await captured?.resume('s1');
  });
  await settle();

  expect(captured?.state).toMatchObject({
    kind: 'active',
    session: { sessionId: 's1', workItemTitle: 'Việc chính' },
  });
  // The conflict is resolved by resuming, not by a second start request.
  expect(startMock).toHaveBeenCalledTimes(1);
});

test('turns a 409 on end into a stored result', async () => {
  startMock.mockResolvedValue(started);
  endMock.mockRejectedValue(
    new SessionClientError({ code: 'conflict', status: 409, message: 'closed' })
  );
  detailMock.mockResolvedValue({
    ...ended,
    status: 'Cancelled',
    grossSeconds: 185,
  });

  renderProvider();
  await settle();
  await act(async () => {
    await captured?.start(input);
  });
  await act(async () => {
    await captured?.end('Completed');
  });
  await settle();

  expect(captured?.state).toMatchObject({
    kind: 'result',
    result: { status: 'Cancelled', grossSeconds: 185 },
  });
});

test('shows the result when a heartbeat reports the session closed', async () => {
  startMock.mockResolvedValue(started);
  recordMock.mockRejectedValue(
    new SessionClientError({ code: 'conflict', status: 409, message: 'closed' })
  );
  detailMock.mockResolvedValue({
    ...ended,
    status: 'Completed',
    grossSeconds: 185,
  });

  renderProvider();
  await settle();
  await act(async () => {
    await captured?.start(input);
  });
  await act(async () => {
    await jest.advanceTimersByTimeAsync(31_000);
  });
  await settle();

  expect(detailMock).toHaveBeenCalledWith('s1');
  expect(captured?.state).toMatchObject({
    kind: 'result',
    result: { status: 'Completed', grossSeconds: 185 },
  });
});

test('ignores a restore that answers after the session was already ended', async () => {
  let release: (value: unknown) => void = () => undefined;
  currentMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      })
  );
  startMock.mockResolvedValue(started);
  endMock.mockResolvedValue(ended);

  renderProvider();
  await settle();
  expect(currentMock).toHaveBeenCalledTimes(1);

  await act(async () => {
    await captured?.start(input);
  });
  await act(async () => {
    await captured?.end('Completed');
  });
  expect(captured?.state.kind).toBe('result');

  await act(async () => {
    release(currentSession);
    for (let i = 0; i < 8; i += 1) {
      await Promise.resolve();
    }
  });

  // A stale "still Active" answer must not resurrect the finished timer.
  expect(captured?.state).toMatchObject({ kind: 'result', result: { sessionId: 's1' } });
});

test('clears the known sessions when the user signs out', async () => {
  startMock.mockResolvedValue(started);

  const view = renderProvider();
  await settle();
  await act(async () => {
    await captured?.start(input);
  });
  expect(captured?.latestSessionByWorkItem).toEqual({ w1: 's1' });

  mockAuthStatus = 'signedOut';
  view.rerender(
    <SessionProvider>
      <Probe />
    </SessionProvider>
  );
  await settle();

  expect(captured?.state.kind).toBe('idle');
  expect(captured?.latestSessionByWorkItem).toEqual({});
  expect(captured?.recovery).toEqual({ status: 'idle', message: null });
});
