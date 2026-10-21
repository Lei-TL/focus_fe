import { useEffect } from 'react';
import { act, render } from '@testing-library/react-native';
import { AppState, Text, type AppStateStatus } from 'react-native';

import { useSessionEvents, type SessionEventsEvidence } from '@/hooks/use-session-events';
import type { SessionEventInput } from '@/core/api/types';
import * as sessionService from '@/services/session-service';
import { SessionClientError } from '@/services/session-error';

jest.mock('@/services/session-service', () => ({
  recordFocusSessionEvents: jest.fn(),
}));

const recordMock = sessionService.recordFocusSessionEvents as jest.Mock;

let captured: SessionEventsEvidence | null = null;
let flushBeforeEnd: (() => Promise<void>) | null = null;
let appStateListener: ((state: AppStateStatus) => void) | null = null;
let removeListener: jest.Mock;
const renderProbe = jest.fn();

function Probe({ sessionId }: { sessionId: string | null }) {
  const stream = useSessionEvents(sessionId);

  useEffect(() => {
    captured = stream.evidence;
    flushBeforeEnd = stream.flushBeforeEnd;
  });

  renderProbe();

  return <Text testID="stats">{`${stream.evidence.sent}/${stream.evidence.pending}`}</Text>;
}

function typesOfCall(callIndex: number): string[] {
  const batch = recordMock.mock.calls[callIndex][1] as SessionEventInput[];
  return batch.map((event) => event.type);
}

async function advance(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('useSessionEvents', () => {
  const base = Date.parse('2026-10-21T02:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
    captured = null;
    flushBeforeEnd = null;
    appStateListener = null;
    removeListener = jest.fn();
    renderProbe.mockClear();
    recordMock.mockReset();
    recordMock.mockImplementation(async (_id: string, events: SessionEventInput[]) => ({
      receivedCount: events.length,
      insertedCount: events.length,
      duplicateCount: 0,
    }));
    jest.spyOn(AppState, 'addEventListener').mockImplementation(((
      _type: string,
      handler: (state: AppStateStatus) => void
    ) => {
      appStateListener = handler;
      return { remove: removeListener } as never;
    }) as never);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('sends nothing while there is no active session', async () => {
    render(<Probe sessionId={null} />);

    await advance(120_000);

    expect(recordMock).not.toHaveBeenCalled();
    expect(appStateListener).not.toBeNull();
  });

  test('records one Background and one Foreground pair and pauses heartbeats in between', async () => {
    render(<Probe sessionId="s1" />);

    // A short iOS `inactive` on its own must not produce an event.
    await act(async () => {
      appStateListener?.('inactive');
    });
    await advance(31_000);
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(typesOfCall(0)).toEqual(['Heartbeat']);

    await act(async () => {
      appStateListener?.('background');
    });
    expect(captured?.appState).toBe('background');
    await advance(1_000);
    expect(recordMock).toHaveBeenCalledTimes(2);
    expect(typesOfCall(1)).toEqual(['Background']);

    // JS timers are paused while backgrounded: no heartbeat is queued.
    await advance(120_000);
    expect(recordMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      appStateListener?.('inactive');
      appStateListener?.('active');
    });
    expect(captured?.appState).toBe('active');
    await advance(1_000);
    expect(recordMock).toHaveBeenCalledTimes(3);
    expect(typesOfCall(2)).toEqual(['Foreground']);

    // The cadence restarts after Foreground.
    await advance(31_000);
    expect(recordMock).toHaveBeenCalledTimes(4);
    expect(typesOfCall(3)).toEqual(['Heartbeat']);
  });

  test('does not repeat events when the same AppState is reported twice', async () => {
    render(<Probe sessionId="s1" />);

    await act(async () => {
      appStateListener?.('background');
      appStateListener?.('background');
      appStateListener?.('active');
      appStateListener?.('active');
    });
    await advance(1_000);

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(typesOfCall(0)).toEqual(['Background', 'Foreground']);
  });

  test('flushes the queue before ending even if the coalescing timer has not fired', async () => {
    render(<Probe sessionId="s1" />);

    await advance(30_000);
    expect(recordMock).not.toHaveBeenCalled();

    await act(async () => {
      await flushBeforeEnd?.();
    });

    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(typesOfCall(0)).toEqual(['Heartbeat']);
  });

  test('stops the emitter when the session closes with 409', async () => {
    recordMock.mockRejectedValue(
      new SessionClientError({ code: 'conflict', message: 'closed' })
    );
    render(<Probe sessionId="s1" />);

    await advance(31_000);

    expect(captured?.stoppedReason).toBe('closed');
    expect(captured?.pending).toBe(0);
    expect(captured?.failed).toBe(1);

    await advance(300_000);
    expect(recordMock).toHaveBeenCalledTimes(1);
  });

  test('clears the timers and the AppState listener on unmount', async () => {
    const view = render(<Probe sessionId="s1" />);

    view.unmount();
    await advance(120_000);

    expect(recordMock).not.toHaveBeenCalled();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  test('aborts the request in flight on unmount without warning', async () => {
    const signals: (AbortSignal | undefined)[] = [];
    recordMock.mockImplementation(
      (_id: string, _events: SessionEventInput[], signal?: AbortSignal) => {
        signals.push(signal);
        return new Promise((_resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      }
    );
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const view = render(<Probe sessionId="s1" />);
    await advance(30_000);
    await advance(1_000);

    expect(signals).toHaveLength(1);
    expect(signals[0]?.aborted).toBe(false);

    const rendersBeforeUnmount = renderProbe.mock.calls.length;
    view.unmount();
    await advance(10_000);

    expect(signals[0]?.aborted).toBe(true);
    expect(recordMock).toHaveBeenCalledTimes(1);
    expect(renderProbe).toHaveBeenCalledTimes(rendersBeforeUnmount);
    expect(consoleError).not.toHaveBeenCalled();
  });
});
