import type { RecordedEvents, SessionEventInput } from '@/core/api/types';
import {
  SessionEventPublisher,
  type SessionEventStats,
} from '@/services/session-event-publisher';
import { SessionClientError } from '@/services/session-error';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function recorded(count: number, duplicateCount = 0): RecordedEvents {
  return {
    receivedCount: count,
    insertedCount: count - duplicateCount,
    duplicateCount,
  };
}

function mapError(code: 'validation' | 'conflict' | 'notFound' | 'network' | 'server') {
  return new SessionClientError({ code, message: code });
}

describe('SessionEventPublisher', () => {
  const base = Date.parse('2026-10-21T02:00:00.000Z');

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(base);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('emits one heartbeat every 30 seconds and stops on dispose', async () => {
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length)
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.start();
    expect(send).not.toHaveBeenCalled();

    // The event is queued at 30s and flushed after the coalescing delay.
    await jest.advanceTimersByTimeAsync(30_000);
    expect(send).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1_000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('s1', [
      expect.objectContaining({ type: 'Heartbeat', source: 'Device' }),
    ]);
    const first = send.mock.calls[0][1][0];
    expect(first.clientEventId).toMatch(UUID_V4);
    expect(Date.parse(first.clientTs)).toBe(base + 30_000);

    await jest.advanceTimersByTimeAsync(31_000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(publisher.getStats().sent).toBe(2);

    publisher.dispose();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(publisher.getStats().stoppedReason).toBe('disposed');
  });

  test('creates a single heartbeat interval even if start is called twice', async () => {
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length)
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.start();
    publisher.start();
    await jest.advanceTimersByTimeAsync(31_000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1]).toHaveLength(1);

    publisher.dispose();
  });

  test('pauses heartbeats while backgrounded and resumes them on foreground', async () => {
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length)
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });
    publisher.start();

    publisher.pauseHeartbeat();
    publisher.enqueue('Background');
    await jest.advanceTimersByTimeAsync(90_000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1].map((event) => event.type)).toEqual(['Background']);

    publisher.enqueue('Foreground');
    publisher.resumeHeartbeat();
    await jest.advanceTimersByTimeAsync(31_000);

    const types = send.mock.calls.flatMap((call) =>
      (call[1] as SessionEventInput[]).map((event) => event.type)
    );
    expect(types).toEqual(['Background', 'Foreground', 'Heartbeat']);

    publisher.dispose();
  });

  test('retries with the same clientEventId and payload', async () => {
    const send = jest
      .fn<Promise<RecordedEvents>, [string, SessionEventInput[]]>()
      .mockRejectedValueOnce(mapError('network'))
      .mockResolvedValueOnce(recorded(1));
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.start();
    await jest.advanceTimersByTimeAsync(31_000);
    expect(send).toHaveBeenCalledTimes(1);

    // First retry delay is 1s.
    await jest.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
    expect(send.mock.calls[1][1][0].clientEventId).toBe(
      send.mock.calls[0][1][0].clientEventId
    );
    expect(publisher.getStats()).toMatchObject({ sent: 1, pending: 0, failed: 0 });

    publisher.dispose();
  });

  test('keeps the batch and backs off after 5xx, then recovers', async () => {
    const send = jest
      .fn<Promise<RecordedEvents>, [string, SessionEventInput[]]>()
      .mockRejectedValueOnce(mapError('server'))
      .mockRejectedValueOnce(mapError('server'))
      .mockResolvedValue(recorded(1));
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });
    publisher.enqueue('Heartbeat');

    await jest.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(publisher.getStats().pending).toBe(1);

    await jest.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(2);
    // Second retry waits 2s, not 1s.
    await jest.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1_000);
    expect(send).toHaveBeenCalledTimes(3);
    expect(publisher.getStats()).toMatchObject({ sent: 1, pending: 0, failed: 0 });

    publisher.dispose();
  });

  test('stops and clears the queue when the session is closed (409)', async () => {
    const send = jest.fn(async () => {
      throw mapError('conflict');
    });
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.start();
    await jest.advanceTimersByTimeAsync(31_000);

    expect(send).toHaveBeenCalledTimes(1);
    expect(publisher.getStats()).toMatchObject({
      pending: 0,
      failed: 1,
      stoppedReason: 'closed',
    });

    await jest.advanceTimersByTimeAsync(300_000);
    expect(send).toHaveBeenCalledTimes(1);

    publisher.enqueue('Heartbeat');
    expect(publisher.getStats().pending).toBe(0);
    publisher.dispose();
  });

  test('stops on 404 because the session no longer exists', async () => {
    const send = jest.fn(async () => {
      throw mapError('notFound');
    });
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.enqueue('Heartbeat');
    await jest.advanceTimersByTimeAsync(1_000);

    expect(publisher.getStats().stoppedReason).toBe('missing');
    expect(publisher.getStats().pending).toBe(0);
    publisher.dispose();
  });

  test('splits the queue into batches of at most 200', async () => {
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length)
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    for (let index = 0; index < 250; index += 1) {
      publisher.enqueue('Heartbeat');
    }
    await publisher.flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][1]).toHaveLength(200);
    expect(send.mock.calls[1][1]).toHaveLength(50);
    expect(publisher.getStats()).toMatchObject({ sent: 250, pending: 0, failed: 0 });

    publisher.dispose();
  });

  test('drops a 400 batch instead of retrying it forever', async () => {
    const send = jest.fn(async () => {
      throw mapError('validation');
    });
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    for (let index = 0; index < 250; index += 1) {
      publisher.enqueue('Heartbeat');
    }
    await publisher.flush();

    expect(send).toHaveBeenCalledTimes(2);
    expect(publisher.getStats()).toMatchObject({ pending: 0, failed: 250, sent: 0 });
    expect(publisher.getStats().lastError).toContain('từ chối');

    await jest.advanceTimersByTimeAsync(600_000);
    expect(send).toHaveBeenCalledTimes(2);

    publisher.dispose();
  });

  test('flushWithin sends immediately and empties the queue', async () => {
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length, 1)
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.enqueue('Heartbeat');
    const flushing = publisher.flushWithin(2_000);
    await jest.advanceTimersByTimeAsync(0);
    await flushing;

    expect(send).toHaveBeenCalledTimes(1);
    expect(publisher.getStats()).toMatchObject({
      sent: 1,
      pending: 0,
      duplicate: 1,
    });

    publisher.dispose();
  });

  test('flushWithin gives up at the deadline and dispose counts the lost events', async () => {
    let release: (value: RecordedEvents) => void = () => undefined;
    const send = jest.fn(
      () =>
        new Promise<RecordedEvents>((resolve) => {
          release = resolve;
        })
    );
    const publisher = new SessionEventPublisher({ sessionId: 's1', send });

    publisher.enqueue('Heartbeat');
    const flushing = publisher.flushWithin(2_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await flushing;

    expect(send).toHaveBeenCalledTimes(1);
    expect(publisher.getStats()).toMatchObject({ pending: 1, sent: 0 });

    publisher.dispose();
    expect(publisher.getStats()).toMatchObject({ pending: 0, failed: 1 });

    release(recorded(1));
    await jest.advanceTimersByTimeAsync(0);
    expect(publisher.getStats().sent).toBe(0);
  });

  test('reports stats through onChange', async () => {
    const snapshots: SessionEventStats[] = [];
    const send = jest.fn(async (_id: string, events: SessionEventInput[]) =>
      recorded(events.length)
    );
    const publisher = new SessionEventPublisher({
      sessionId: 's1',
      send,
      onChange: (stats) => snapshots.push(stats),
    });

    publisher.enqueue('Heartbeat');
    await publisher.flush();

    expect(snapshots.at(-1)).toMatchObject({ sent: 1, pending: 0 });
    publisher.dispose();
  });
});
