import type { RecordedEvents, SessionEventInput } from '@/core/api/types';
import { toSessionError } from '@/services/session-error';
import {
  SESSION_EVENT_BATCH_LIMIT,
  SESSION_EVENT_FLUSH_DELAY_MS,
  SESSION_HEARTBEAT_INTERVAL_MS,
  buildSessionEvent,
  createSessionEventId,
  type SessionEventType,
} from '@/services/session-events';

// Bounded retry: 1s, 2s, 4s, 8s, 15s, then 30s per attempt. Never unbounded
// because the queue lives in memory only.
export const SESSION_EVENT_RETRY_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000];

// Retries are capped as well: an unreachable server would otherwise keep one
// request per 30s going for the whole session. After this many retries the
// batch is dropped (counted as failed, last error kept) and only newer events
// are sent.
export const SESSION_EVENT_MAX_RETRY_ATTEMPTS = 6;

export type SessionEventStoppedReason = 'closed' | 'missing' | 'disposed';

export type SessionEventStats = {
  // Events the server acknowledged (inserted + duplicate).
  sent: number;
  // Events still waiting in the in-memory queue.
  pending: number;
  // Events discarded: rejected batch (400), closed session, or disposed queue.
  failed: number;
  // Server-reported duplicateCount across batches.
  duplicate: number;
  lastError: string | null;
  stoppedReason: SessionEventStoppedReason | null;
};

export type SessionEventSender = (
  sessionId: string,
  events: SessionEventInput[],
  signal?: AbortSignal
) => Promise<RecordedEvents>;

type SessionEventPublisherOptions = {
  sessionId: string;
  send: SessionEventSender;
  onChange?: (stats: SessionEventStats) => void;
  newId?: () => string;
  now?: () => number;
  heartbeatIntervalMs?: number;
  flushDelayMs?: number;
  maxBatchSize?: number;
  retryDelaysMs?: number[];
  maxRetryAttempts?: number;
};

const INITIAL_STATS: SessionEventStats = {
  sent: 0,
  pending: 0,
  failed: 0,
  duplicate: 0,
  lastError: null,
  stoppedReason: null,
};

type FailureKind = 'retry' | 'drop' | 'closed';

function classifyFailure(mapped: { code: string }): FailureKind {
  if (mapped.code === 'validation') {
    return 'drop';
  }
  if (mapped.code === 'conflict' || mapped.code === 'notFound') {
    return 'closed';
  }
  // Network, timeout, 5xx, 429 and 401 (after the auth interceptor already
  // tried to refresh) are retried with the bounded backoff.
  return 'retry';
}

export class SessionEventPublisher {
  private readonly sessionId: string;
  private readonly send: SessionEventSender;
  private readonly onChange?: (stats: SessionEventStats) => void;
  private readonly newId: () => string;
  private readonly now: () => number;
  private readonly heartbeatIntervalMs: number;
  private readonly flushDelayMs: number;
  private readonly maxBatchSize: number;
  private readonly retryDelaysMs: number[];
  private readonly maxRetryAttempts: number;
  // Cancels the request in flight when the publisher stops (end, logout, new
  // session) instead of waiting for the axios timeout.
  private readonly abortController = new AbortController();

  private readonly queue: SessionEventInput[] = [];
  private stats: SessionEventStats = { ...INITIAL_STATS };
  private started = false;
  private stopped = false;
  private retryAttempt = 0;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;

  constructor(options: SessionEventPublisherOptions) {
    this.sessionId = options.sessionId;
    this.send = options.send;
    this.onChange = options.onChange;
    this.newId = options.newId ?? createSessionEventId;
    this.now = options.now ?? (() => Date.now());
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? SESSION_HEARTBEAT_INTERVAL_MS;
    this.flushDelayMs = options.flushDelayMs ?? SESSION_EVENT_FLUSH_DELAY_MS;
    this.maxBatchSize = Math.min(
      SESSION_EVENT_BATCH_LIMIT,
      Math.max(1, options.maxBatchSize ?? SESSION_EVENT_BATCH_LIMIT)
    );
    this.retryDelaysMs =
      options.retryDelaysMs && options.retryDelaysMs.length > 0
        ? options.retryDelaysMs
        : SESSION_EVENT_RETRY_DELAYS_MS;
    this.maxRetryAttempts = Math.max(
      0,
      options.maxRetryAttempts ?? SESSION_EVENT_MAX_RETRY_ATTEMPTS
    );
  }

  getStats(): SessionEventStats {
    return { ...this.stats, pending: this.queue.length };
  }

  // Idempotent on purpose: a re-render or a second caller must not create a
  // second heartbeat interval.
  start(): void {
    if (this.started || this.stopped) {
      return;
    }
    this.started = true;
    this.startHeartbeat();
  }

  // App in background: JS timers may be suspended anyway, and the contract does
  // not promise heartbeats while backgrounded. Resume creates a fresh interval.
  pauseHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  resumeHeartbeat(): void {
    if (this.started && !this.stopped) {
      this.startHeartbeat();
    }
  }

  enqueue(type: SessionEventType, atMs: number = this.now()): void {
    if (this.stopped) {
      return;
    }
    this.queue.push(buildSessionEvent(type, atMs, this.newId));
    this.emit();

    if (this.queue.length >= this.maxBatchSize && !this.retryTimer) {
      void this.flush();
      return;
    }
    this.scheduleFlush();
  }

  // Used before `end`: send what is queued now and give up after the deadline,
  // because a closed session answers 409 and waiting longer cannot help. A
  // pending backoff is cleared so this last attempt happens immediately.
  async flushWithin(deadlineMs: number): Promise<void> {
    if (this.stopped || this.queue.length === 0) {
      return;
    }
    this.clearTimer('flush');
    this.clearTimer('retry');
    this.retryAttempt = 0;

    let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
    const deadline = new Promise<void>((resolve) => {
      deadlineTimer = setTimeout(resolve, deadlineMs);
    });

    try {
      await Promise.race([this.flush(), deadline]);
    } finally {
      if (deadlineTimer) {
        clearTimeout(deadlineTimer);
      }
    }
  }

  flush(): Promise<void> {
    if (this.stopped) {
      return Promise.resolve();
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.clearTimer('flush');
    this.inFlight = this.drain().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  // Clears timers, cancels the request in flight and gives up on unsent events
  // (in-memory queue only).
  dispose(): void {
    if (this.stopped) {
      return;
    }
    this.stopped = true;
    this.clearTimer('heartbeat');
    this.clearTimer('flush');
    this.clearTimer('retry');
    this.abortController.abort();
    if (this.queue.length > 0) {
      this.stats.failed += this.queue.length;
      this.queue.length = 0;
    }
    this.stats.stoppedReason = this.stats.stoppedReason ?? 'disposed';
    this.emit();
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer || this.stopped) {
      return;
    }
    this.heartbeatTimer = setInterval(() => {
      this.enqueue('Heartbeat');
    }, this.heartbeatIntervalMs);
  }

  private scheduleFlush(): void {
    if (this.stopped || this.flushTimer || this.retryTimer || this.inFlight) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, this.flushDelayMs);
  }

  private scheduleRetry(): void {
    if (this.stopped || this.retryTimer) {
      return;
    }
    const delay =
      this.retryDelaysMs[Math.min(this.retryAttempt, this.retryDelaysMs.length - 1)];
    this.retryAttempt += 1;
    this.scheduleRetryTimer(delay);
  }

  // Separate from scheduleRetry so a fresh batch can be attempted after a short
  // pause without consuming the retry budget of that new batch.
  private scheduleRetryTimer(delayMs: number): void {
    if (this.stopped || this.retryTimer) {
      return;
    }
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      void this.flush();
    }, delayMs);
  }

  private async drain(): Promise<void> {
    while (!this.stopped && this.queue.length > 0) {
      const batch = this.queue.slice(0, this.maxBatchSize);
      try {
        const result = await this.send(this.sessionId, batch, this.abortController.signal);
        if (this.stopped) {
          return;
        }
        this.queue.splice(0, batch.length);
        this.stats.sent += batch.length;
        this.stats.duplicate += Math.max(0, result?.duplicateCount ?? 0);
        this.stats.lastError = null;
        this.retryAttempt = 0;
        this.emit();
      } catch (error) {
        if (this.stopped) {
          return;
        }
        const mapped = toSessionError(error, 'events');
        const failure = classifyFailure(mapped);

        if (failure === 'closed') {
          this.stopOnClosed(mapped.code === 'notFound' ? 'missing' : 'closed', mapped.message);
          return;
        }

        if (failure === 'drop') {
          // 400 rejects the whole batch: drop it and keep going, otherwise a
          // malformed event would retry forever. Details are kept for evidence.
          this.queue.splice(0, batch.length);
          this.stats.failed += batch.length;
          this.stats.lastError = `Máy chủ từ chối lô ${batch.length} event: ${mapped.message}`;
          this.emit();
          continue;
        }

        if (this.retryAttempt >= this.maxRetryAttempts) {
          this.dropExhaustedBatch(batch, mapped.message);
          return;
        }

        this.stats.lastError = mapped.message;
        this.emit();
        this.scheduleRetry();
        return;
      }
    }
  }

  // The retry cap was reached: drop this batch (counted as failed, last error
  // kept) so a permanently failing server cannot keep the retry loop alive for
  // the whole session. Events queued afterwards are still sent.
  private dropExhaustedBatch(batch: SessionEventInput[], message: string): void {
    this.queue.splice(0, batch.length);
    this.stats.failed += batch.length;
    this.stats.lastError =
      `Bỏ ${batch.length} event sau ${this.maxRetryAttempts + 1} lần thử: ${message}`;
    this.retryAttempt = 0;
    this.emit();
    if (this.queue.length > 0) {
      // Short pause before trying the next batch instead of a tight loop.
      this.scheduleRetryTimer(this.retryDelaysMs[0]);
    }
  }

  private stopOnClosed(reason: 'closed' | 'missing', message: string): void {
    this.stopped = true;
    this.clearTimer('heartbeat');
    this.clearTimer('flush');
    this.clearTimer('retry');
    this.abortController.abort();
    this.stats.failed += this.queue.length;
    this.queue.length = 0;
    this.stats.lastError =
      reason === 'missing'
        ? `Máy chủ không còn phiên này: ${message}`
        : `Phiên đã kết thúc nên sự kiện không được ghi: ${message}`;
    this.stats.stoppedReason = reason;
    this.emit();
  }

  private clearTimer(kind: 'heartbeat' | 'flush' | 'retry'): void {
    if (kind === 'heartbeat' && this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (kind === 'flush' && this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (kind === 'retry' && this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private emit(): void {
    this.onChange?.(this.getStats());
  }
}
