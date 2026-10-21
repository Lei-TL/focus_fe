import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { recordFocusSessionEvents } from '@/services/session-service';
import {
  SessionEventPublisher,
  type SessionEventStats,
} from '@/services/session-event-publisher';

// Events sent after `end` answer 409, so the flush before ending must be short
// and must never block closing the session.
export const SESSION_END_FLUSH_DEADLINE_MS = 2_000;

const EMPTY_STATS: SessionEventStats = {
  sent: 0,
  pending: 0,
  failed: 0,
  duplicate: 0,
  lastError: null,
  stoppedReason: null,
};

type RecordedAppState = 'active' | 'background';

export type SessionEventsEvidence = SessionEventStats & {
  appState: AppStateStatus;
};

export type SessionEventsStream = {
  evidence: SessionEventsEvidence;
  // Sends whatever is queued, waited at most SESSION_END_FLUSH_DEADLINE_MS.
  flushBeforeEnd: () => Promise<void>;
};

function recordableState(state: AppStateStatus): RecordedAppState {
  // `inactive` is a short iOS transition (control centre, app switcher) and is
  // ignored; only active↔background pairs are recorded.
  return state === 'background' ? 'background' : 'active';
}

// One stream per provider: the heartbeat interval, the flush timer and the
// AppState listener all live here, not in a screen that can remount.
export function useSessionEvents(sessionId: string | null): SessionEventsStream {
  const [statsEntry, setStatsEntry] = useState<{
    sessionId: string;
    stats: SessionEventStats;
  } | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const publisherRef = useRef<SessionEventPublisher | null>(null);
  const lastRecordedStateRef = useRef<RecordedAppState>(
    recordableState(AppState.currentState)
  );
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionId) {
      publisherRef.current?.dispose();
      publisherRef.current = null;
      return;
    }

    const publisher = new SessionEventPublisher({
      sessionId,
      send: recordFocusSessionEvents,
      onChange: (next) => {
        if (mountedRef.current) {
          setStatsEntry({ sessionId, stats: next });
        }
      },
    });
    publisherRef.current = publisher;
    publisher.start();

    return () => {
      publisher.dispose();
      if (publisherRef.current === publisher) {
        publisherRef.current = null;
      }
    };
  }, [sessionId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (mountedRef.current) {
        setAppState(next);
      }

      if (next === 'background') {
        const publisher = publisherRef.current;
        if (lastRecordedStateRef.current !== 'background') {
          lastRecordedStateRef.current = 'background';
          publisher?.pauseHeartbeat();
          publisher?.enqueue('Background');
        }
        return;
      }

      if (next === 'active') {
        const publisher = publisherRef.current;
        if (lastRecordedStateRef.current === 'background') {
          lastRecordedStateRef.current = 'active';
          publisher?.enqueue('Foreground');
          publisher?.resumeHeartbeat();
        }
      }
      // `inactive` and other platform states do not change the recorded pair.
    });

    return () => subscription.remove();
  }, []);

  // While no session is active (result/dismissed) the last session's counters
  // stay visible as evidence; a new session starts from zero.
  const stats =
    statsEntry && (sessionId === null || statsEntry.sessionId === sessionId)
      ? statsEntry.stats
      : EMPTY_STATS;

  const flushBeforeEnd = useCallback(async () => {
    await publisherRef.current?.flushWithin(SESSION_END_FLUSH_DEADLINE_MS);
  }, []);

  const evidence = useMemo<SessionEventsEvidence>(
    () => ({ ...stats, appState }),
    [stats, appState]
  );

  return { evidence, flushBeforeEnd };
}
