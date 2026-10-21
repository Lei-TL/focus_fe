import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { EndSessionReason, SessionRead, SessionStatus } from '@/core/api/types';
import { useAuth } from '@/context/auth-context';
import {
  useSessionEvents,
  type SessionEventsEvidence,
} from '@/hooks/use-session-events';
import { SessionClientError, isSessionError } from '@/services/session-error';
import {
  endFocusSession,
  getCurrentFocusSession,
  getFocusSession,
  startFocusSession,
} from '@/services/session-service';
import { estimateClockOffset } from '@/services/session-time';
import { getWorkItemDetail } from '@/services/work-items-service';

export type ActiveFocusSession = {
  sessionId: string;
  workItemId: string;
  workItemTitle: string;
  serverStartTime: string;
  plannedSeconds: number;
  clockOffsetMs: number;
};

export type FocusSessionResult = {
  sessionId: string;
  workItemId: string;
  workItemTitle: string;
  status: Exclude<SessionStatus, 'Active'>;
  grossSeconds: number;
  serverStartTime: string;
  serverEndTime: string | null;
};

export type SessionState =
  | { kind: 'idle' }
  | { kind: 'active'; session: ActiveFocusSession }
  | { kind: 'result'; result: FocusSessionResult }
  // The server says the session no longer exists (end and detail both 404).
  // There is no result to show, but the user must not stay stuck on a session
  // that can never be ended successfully.
  | { kind: 'missing'; sessionId: string; workItemTitle: string; message: string };

export type StartSessionInput = {
  workItemId: string;
  workItemTitle: string;
  plannedSeconds: number;
};

export type SessionContextValue = {
  state: SessionState;
  isStarting: boolean;
  isEnding: boolean;
  // Heartbeat/AppState evidence for the active (or last) session.
  events: SessionEventsEvidence;
  start: (input: StartSessionInput) => Promise<void>;
  end: (reason: EndSessionReason) => Promise<void>;
  resume: (sessionId: string, workItemTitle?: string) => Promise<void>;
  dismissResult: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function finishedStatus(status: SessionStatus, reason: EndSessionReason): 'Completed' | 'Cancelled' {
  if (status === 'Completed' || status === 'Cancelled') {
    return status;
  }
  return reason;
}

async function resolveWorkItemTitle(workItemId: string, fallback: string): Promise<string> {
  try {
    const item = await getWorkItemDetail(workItemId);
    return item.title;
  } catch {
    return fallback;
  }
}

type ClosedSessionLookup =
  | { kind: 'finished'; detail: SessionRead }
  | { kind: 'missing' }
  | { kind: 'unknown' };

// After a 404 on end, re-read the session. `missing` means the server has no
// record of it at all; any other failure stays `unknown` so the caller keeps
// the active session and can retry (network errors must not drop a session).
async function lookupClosedSession(sessionId: string): Promise<ClosedSessionLookup> {
  try {
    const detail = await getFocusSession(sessionId);
    return detail.status === 'Active'
      ? { kind: 'unknown' }
      : { kind: 'finished', detail };
  } catch (error) {
    return isSessionError(error) && error.code === 'notFound'
      ? { kind: 'missing' }
      : { kind: 'unknown' };
  }
}

// Remounting on auth changes keeps session state scoped to one signed-in user:
// signing out (or switching accounts) drops the active session without a
// setState-in-effect reset.
export function SessionProvider({ children }: PropsWithChildren) {
  const { status } = useAuth();
  const signedIn = status === 'signedIn';

  return (
    <SessionStateProvider
      key={signedIn ? 'signed-in' : 'signed-out'}
      signedIn={signedIn}
    >
      {children}
    </SessionStateProvider>
  );
}

function SessionStateProvider({
  children,
  signedIn,
}: PropsWithChildren<{ signedIn: boolean }>) {
  const [state, setState] = useState<SessionState>({ kind: 'idle' });
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const startRef = useRef(false);
  const endRef = useRef(false);
  const mountedRef = useRef(true);

  const activeSessionId = state.kind === 'active' ? state.session.sessionId : null;
  const { evidence: events, flushBeforeEnd } = useSessionEvents(activeSessionId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const canCommit = useCallback(
    () => mountedRef.current && signedIn,
    [signedIn]
  );

  const start = useCallback(
    async (input: StartSessionInput) => {
      if (startRef.current || endRef.current) {
        return;
      }
      startRef.current = true;
      setIsStarting(true);
      try {
        const detail = await startFocusSession(input.workItemId, input.plannedSeconds);
        if (!canCommit()) {
          return;
        }
        setState({
          kind: 'active',
          session: {
            sessionId: detail.sessionId,
            workItemId: detail.workItemId,
            workItemTitle: input.workItemTitle,
            serverStartTime: detail.serverStartTime,
            plannedSeconds: detail.plannedSeconds,
            clockOffsetMs: estimateClockOffset(detail.serverStartTime, Date.now()),
          },
        });
      } finally {
        startRef.current = false;
        if (mountedRef.current) {
          setIsStarting(false);
        }
      }
    },
    [canCommit]
  );

  const end = useCallback(
    async (reason: EndSessionReason) => {
      if (endRef.current || startRef.current || state.kind !== 'active') {
        return;
      }
      const active = state.session;
      endRef.current = true;
      setIsEnding(true);
      try {
        // Events sent after the session closes answer 409, so try to drain the
        // queue first, but never wait longer than the flush deadline.
        await flushBeforeEnd();
        if (!canCommit()) {
          return;
        }
        const ended = await endFocusSession(active.sessionId, reason);
        if (!canCommit()) {
          return;
        }
        setState({
          kind: 'result',
          result: {
            sessionId: ended.sessionId,
            workItemId: ended.workItemId,
            workItemTitle: active.workItemTitle,
            status: finishedStatus(ended.status, reason),
            grossSeconds: ended.grossSeconds,
            serverStartTime: ended.serverStartTime,
            serverEndTime: ended.serverEndTime,
          },
        });
      } catch (error) {
        // A 404 on end means the session may already be closed. Re-read it and
        // show the persisted result instead of losing the finished session.
        if (isSessionError(error) && error.code === 'notFound') {
          const lookup = await lookupClosedSession(active.sessionId);
          if (!canCommit()) {
            return;
          }
          if (lookup.kind === 'finished') {
            setState({
              kind: 'result',
              result: {
                sessionId: lookup.detail.sessionId,
                workItemId: lookup.detail.workItemId,
                workItemTitle: active.workItemTitle,
                status: finishedStatus(lookup.detail.status, reason),
                grossSeconds: lookup.detail.grossSeconds ?? 0,
                serverStartTime: lookup.detail.serverStartTime,
                serverEndTime: lookup.detail.serverEndTime,
              },
            });
            return;
          }
          if (lookup.kind === 'missing') {
            setState({
              kind: 'missing',
              sessionId: active.sessionId,
              workItemTitle: active.workItemTitle,
              message:
                'Máy chủ không còn phiên này nên ứng dụng đã đóng nó lại. Không có kết quả để hiển thị.',
            });
            return;
          }
        }
        throw error;
      } finally {
        endRef.current = false;
        if (mountedRef.current) {
          setIsEnding(false);
        }
      }
    },
    [canCommit, flushBeforeEnd, state]
  );

  const resume = useCallback(
    async (sessionId: string, workItemTitle?: string) => {
      if (startRef.current || endRef.current) {
        return;
      }
      startRef.current = true;
      setIsStarting(true);
      try {
        const current = await getCurrentFocusSession();
        if (!canCommit()) {
          return;
        }
        if (current) {
          if (current.sessionId !== sessionId) {
            throw new SessionClientError({
              code: 'conflict',
              message: 'Phiên đang chạy đã thay đổi. Vui lòng thử lại.',
            });
          }
          const resolvedTitle =
            workItemTitle ??
            (await resolveWorkItemTitle(current.workItemId, 'Công việc đang tập trung'));
          if (!canCommit()) {
            return;
          }
          setState({
            kind: 'active',
            session: {
              sessionId: current.sessionId,
              workItemId: current.workItemId,
              workItemTitle: resolvedTitle,
              serverStartTime: current.serverStartTime,
              plannedSeconds: current.plannedSeconds,
              clockOffsetMs: estimateClockOffset(current.serverNow, Date.now()),
            },
          });
          return;
        }

        const detail = await getFocusSession(sessionId);
        if (!canCommit()) {
          return;
        }
        if (detail.status === 'Active') {
          // /sessions/current already returned 204 although /sessions/{id} says
          // Active. Without serverNow there is no reliable clock anchor, so ask
          // the user to retry instead of showing a drifted timer.
          throw new SessionClientError({
            code: 'conflict',
            message: 'Chưa xác định được mốc giờ máy chủ cho phiên đang chạy. Vui lòng thử lại.',
          });
        }
        setState({
          kind: 'result',
          result: {
            sessionId: detail.sessionId,
            workItemId: detail.workItemId,
            workItemTitle: workItemTitle ?? 'Công việc đã kết thúc',
            status: finishedStatus(detail.status, 'Completed'),
            grossSeconds: detail.grossSeconds ?? 0,
            serverStartTime: detail.serverStartTime,
            serverEndTime: detail.serverEndTime,
          },
        });
      } finally {
        startRef.current = false;
        if (mountedRef.current) {
          setIsStarting(false);
        }
      }
    },
    [canCommit]
  );

  const dismissResult = useCallback(() => {
    setState((current) =>
      current.kind === 'result' || current.kind === 'missing' ? { kind: 'idle' } : current
    );
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ state, isStarting, isEnding, events, start, end, resume, dismissResult }),
    [state, isStarting, isEnding, events, start, end, resume, dismissResult]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return value;
}
