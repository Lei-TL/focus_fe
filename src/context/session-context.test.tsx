import { useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import {
  SessionProvider,
  useSession,
  type SessionContextValue,
  type StartSessionInput,
} from '@/context/session-context';
import { SessionClientError } from '@/services/session-error';
import * as sessionService from '@/services/session-service';

let mockAuthStatus: 'signedIn' | 'signedOut' = 'signedIn';

jest.mock('@/context/auth-context', () => ({
  useAuth: () => ({ status: mockAuthStatus }),
}));

jest.mock('@/services/session-service', () => ({
  startFocusSession: jest.fn(),
  endFocusSession: jest.fn(),
  getCurrentFocusSession: jest.fn(),
  getFocusSession: jest.fn(),
}));

const startMock = sessionService.startFocusSession as jest.Mock;
const endMock = sessionService.endFocusSession as jest.Mock;
const currentMock = sessionService.getCurrentFocusSession as jest.Mock;
const detailMock = sessionService.getFocusSession as jest.Mock;

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

beforeEach(() => {
  jest.clearAllMocks();
  mockAuthStatus = 'signedIn';
  captured = null;
});

describe('SessionProvider', () => {
  test('stores the active session returned by the server', async () => {
    startMock.mockResolvedValue(started);

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });

    expect(captured?.state).toMatchObject({
      kind: 'active',
      session: {
        sessionId: 's1',
        workItemId: 'w1',
        workItemTitle: 'Việc chính',
        plannedSeconds: 3000,
      },
    });
    expect(startMock).toHaveBeenCalledWith('w1', 3000);
  });

  test('sends only one start request on a double press', async () => {
    let release: (value: unknown) => void = () => undefined;
    startMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    renderProvider();
    await act(async () => {
      const first = captured?.start(input);
      const second = captured?.start(input);
      expect(startMock).toHaveBeenCalledTimes(1);
      release(started);
      await Promise.all([first, second]);
    });

    expect(captured?.state.kind).toBe('active');
  });

  test('sends only one end request when both buttons are pressed', async () => {
    startMock.mockResolvedValue(started);
    let release: (value: unknown) => void = () => undefined;
    endMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        })
    );

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });

    await act(async () => {
      const first = captured?.end('Completed');
      const second = captured?.end('Cancelled');
      expect(endMock).toHaveBeenCalledTimes(1);
      expect(endMock).toHaveBeenCalledWith('s1', 'Completed');
      release(ended);
      await Promise.all([first, second]);
    });

    expect(captured?.state).toMatchObject({
      kind: 'result',
      result: { status: 'Completed', grossSeconds: 185 },
    });
  });

  test('does not end again once the result is already stored', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockResolvedValue(ended);

    renderProvider();
    await act(async () => {
      await captured?.start(input);
      await captured?.end('Completed');
    });
    await act(async () => {
      await captured?.end('Cancelled');
    });

    expect(endMock).toHaveBeenCalledTimes(1);
  });

  test('shows the stored result when end returns 404 for an already closed session', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockRejectedValue(
      new SessionClientError({ code: 'notFound', message: 'not found' })
    );
    detailMock.mockResolvedValue({
      ...ended,
      status: 'Completed',
      grossSeconds: 125,
    });

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });
    await act(async () => {
      await captured?.end('Completed');
    });

    expect(detailMock).toHaveBeenCalledWith('s1');
    expect(captured?.state).toMatchObject({
      kind: 'result',
      result: { grossSeconds: 125, status: 'Completed' },
    });
  });

  test('keeps the active session when end fails with a network error', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockRejectedValue(
      new SessionClientError({ code: 'network', message: 'network' })
    );

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });

    await expect(
      act(async () => {
        await captured?.end('Completed');
      })
    ).rejects.toMatchObject({ code: 'network' });

    expect(captured?.state.kind).toBe('active');
  });

  test('resumes the active session using serverNow as the clock anchor', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(Date.parse('2026-10-20T01:04:30.000Z'));
    currentMock.mockResolvedValue({
      sessionId: 's1',
      workItemId: 'w1',
      status: 'Active',
      serverStartTime: '2026-10-20T01:00:00.000Z',
      plannedSeconds: 1800,
      serverNow: '2026-10-20T01:05:00.000Z',
    });

    try {
      renderProvider();
      await act(async () => {
        await captured?.resume('s1', 'Việc chính');
      });

      expect(captured?.state).toMatchObject({
        kind: 'active',
        session: { sessionId: 's1', plannedSeconds: 1800, workItemTitle: 'Việc chính' },
      });
      const resumed = captured?.state;
      // serverNow (01:05) minus device now (01:04:30). Anchoring on
      // serverStartTime instead would give -270000 and restart/reset the clock.
      expect(resumed?.kind === 'active' ? resumed.session.clockOffsetMs : null).toBe(30_000);
    } finally {
      nowSpy.mockRestore();
    }
  });

  test('drops a session the server no longer has instead of staying stuck', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockRejectedValue(new SessionClientError({ code: 'notFound', message: 'not found' }));
    detailMock.mockRejectedValue(
      new SessionClientError({ code: 'notFound', message: 'not found' })
    );

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });
    await act(async () => {
      await captured?.end('Completed');
    });

    expect(detailMock).toHaveBeenCalledWith('s1');
    expect(captured?.state).toMatchObject({ kind: 'missing', sessionId: 's1' });

    await act(async () => {
      captured?.dismissResult();
    });
    expect(captured?.state.kind).toBe('idle');
  });

  test('keeps the active session when the follow-up read fails for another reason', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockRejectedValue(new SessionClientError({ code: 'notFound', message: 'not found' }));
    detailMock.mockRejectedValue(new SessionClientError({ code: 'network', message: 'network' }));

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });

    await expect(
      act(async () => {
        await captured?.end('Completed');
      })
    ).rejects.toMatchObject({ code: 'notFound' });

    expect(captured?.state.kind).toBe('active');
  });

  test('keeps the active session when the follow-up read still says Active', async () => {
    startMock.mockResolvedValue(started);
    endMock.mockRejectedValue(new SessionClientError({ code: 'notFound', message: 'not found' }));
    detailMock.mockResolvedValue({
      ...started,
      grossSeconds: null,
      serverEndTime: null,
    });

    renderProvider();
    await act(async () => {
      await captured?.start(input);
    });

    await expect(
      act(async () => {
        await captured?.end('Completed');
      })
    ).rejects.toMatchObject({ code: 'notFound' });

    expect(captured?.state.kind).toBe('active');
  });

  test('clears the session when the auth state leaves signedIn', async () => {
    startMock.mockResolvedValue(started);

    const view = renderProvider();
    await act(async () => {
      await captured?.start(input);
    });
    expect(captured?.state.kind).toBe('active');

    mockAuthStatus = 'signedOut';
    view.rerender(
      <SessionProvider>
        <Probe />
      </SessionProvider>
    );

    await waitFor(() => expect(captured?.state.kind).toBe('idle'));
  });
});
