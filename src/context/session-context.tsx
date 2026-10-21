import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type {
  CurrentSession,
  EndSessionReason,
  SessionRead,
  SessionStatus,
} from '@/core/api/types';
import { useAuth } from '@/context/auth-context';
import {
  useSessionEvents,
  type SessionEventsEvidence,
} from '@/hooks/use-session-events';
import {
  SessionClientError,
  isAbortedSessionRequest,
  isSessionError,
} from '@/services/session-error';
import {
  endFocusSession,
  getCurrentFocusSession,
  getFocusSession,
  startFocusSession,
} from '@/services/session-service';
import { estimateClockOffset } from '@/services/session-time';
import { getWorkItemDetail } from '@/services/work-items-service';

// After sign-in and on every tab focus the provider asks for the running
// session. The tab can focus repeatedly (tab switches, returning from a route),
// so identical checks are coalesced by time and by the in-flight promise.
export const SESSION_CURRENT_MIN_INTERVAL_MS = 5_000;

export const SESSION_CURRENT_FAILED_MESSAGE =
  'Không kiểm tra được phiên đang chạy. Kiểm tra kết nối rồi thử lại.';

export const SESSION_CURRENT_CONFLICT_MESSAGE =
  'Máy chủ đang chạy một phiên khác với phiên trên ứng dụng. Hãy kết thúc phiên này rồi kiểm tra lại để mở phiên của máy chủ.';

export const SESSION_CURRENT_GONE_MESSAGE =
  'Máy chủ báo không còn phiên đang chạy trong khi ứng dụng vẫn giữ một phiên. Hãy kết thúc phiên để đồng bộ lại.';

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

// `unavailable` means the check itself failed (offline/server down) and says
// nothing about whether a session exists. `conflict` means the server answered
// but disagrees with the session held in memory. `checking` means the answer is
// still outstanding, so the app knows nothing yet.
export type SessionRecovery = {
  status: 'idle' | 'checking' | 'unavailable' | 'conflict';
  message: string | null;
};

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
  recovery: SessionRecovery;
  // True once at least one current-session check has finished in this provider
  // run. While it is false, a `checking` recovery means the app genuinely does
  // not know yet whether a session is running (cold start), so the focus screen
  // must not offer the "pick a work item" flow as if there were no session.
  checkedOnce: boolean;
  // Session ids the app has actually seen in this run, per work item. This is
  // not history: the backend has no GET /sessions list yet.
  latestSessionByWorkItem: Record<string, string>;
  start: (input: StartSessionInput) => Promise<void>;
  end: (reason: EndSessionReason) => Promise<void>;
  resume: (sessionId: string, workItemTitle?: string) => Promise<void>;
  checkCurrent: (options?: { force?: boolean }) => Promise<void>;
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

function resultFromDetail(
  detail: SessionRead,
  workItemTitle: string,
  reason: EndSessionReason
): FocusSessionResult {
  return {
    sessionId: detail.sessionId,
    workItemId: detail.workItemId,
    workItemTitle,
    status: finishedStatus(detail.status, reason),
    grossSeconds: detail.grossSeconds ?? 0,
    serverStartTime: detail.serverStartTime,
    serverEndTime: detail.serverEndTime,
  };
}

type ClosedSessionLookup =
  | { kind: 'finished'; detail: SessionRead }
  | { kind: 'missing' }
  | { kind: 'unknown' };

// After a 404/409 on end, re-read the session. `missing` means the server has
// no record of it at all; any other failure stays `unknown` so the caller keeps
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

const IDLE_RECOVERY: SessionRecovery = { status: 'idle', message: null };

// Remounting on auth changes keeps session state scoped to one signed-in user:
// signing out (or switching accounts) drops the active session, the known
// session ids and the pending current-session read without a
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
  const [recovery, setRecovery] = useState<SessionRecovery>(IDLE_RECOVERY);
  const [checkedOnce, setCheckedOnce] = useState(false);
  const [latestSessionByWorkItem, setLatestSessionByWorkItem] = useState<
    Record<string, string>
  >({});
  const startRef = useRef(false);
  const endRef = useRef(false);
  const mountedRef = useRef(true);
  const stateRef = useRef<SessionState>(state);
  // Kept in sync in an effect (not during render) but read by async callbacks
  // that may be created before the last render, e.g. the restore path.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  // Async callbacks read `stateRef`, so every transition is written to the ref
  // at the moment it is requested. Without this the ref would lag behind by a
  // render and a restore response could overwrite a session the user just
  // started (the render/effect that syncs the ref has not happened yet).
  const commitState = useCallback((next: SessionState) => {
    stateRef.current = next;
    setState(next);
  }, []);
  const checkRef = useRef<Promise<void> | null>(null);
  const checkControllerRef = useRef<AbortController | null>(null);
  const lastCheckRef = useRef(0);
  const closedHandledRef = useRef<string | null>(null);

  const activeSessionId = state.kind === 'active' ? state.session.sessionId : null;
  const { evidence: events, flushBeforeEnd } = useSessionEvents(activeSessionId);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Never leave a restore request running after the provider unmounts
  // (sign-out or account switch).
  useEffect(
    () => () => {
      checkControllerRef.current?.abort();
      checkControllerRef.current = null;
    },
    []
  );

  const canCommit = useCallback(
    () => mountedRef.current && signedIn,
    [signedIn]
  );

  const rememberSession = useCallback((sessionId: string, workItemId: string) => {
    if (!mountedRef.current) {
      return;
    }
    setLatestSessionByWorkItem((current) =>
      current[workItemId] === sessionId ? current : { ...current, [workItemId]: sessionId }
    );
  }, []);

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
        commitState({
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
        rememberSession(detail.sessionId, detail.workItemId);
        setRecovery(IDLE_RECOVERY);
      } finally {
        startRef.current = false;
        if (mountedRef.current) {
          setIsStarting(false);
        }
      }
    },
    [canCommit, commitState, rememberSession]
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
        commitState({
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
        rememberSession(ended.sessionId, ended.workItemId);
        setRecovery(IDLE_RECOVERY);
      } catch (error) {
        // 404 means the session may already be closed; 409 means the server
        // considers it closed (worker timeout / another device). Both are
        // resolved by reading the persisted session instead of losing it.
        if (
          isSessionError(error) &&
          (error.code === 'notFound' || error.code === 'conflict')
        ) {
          const lookup = await lookupClosedSession(active.sessionId);
          if (!canCommit()) {
            return;
          }
          if (lookup.kind === 'finished') {
            commitState({
              kind: 'result',
              result: resultFromDetail(lookup.detail, active.workItemTitle, reason),
            });
            rememberSession(lookup.detail.sessionId, lookup.detail.workItemId);
            setRecovery(IDLE_RECOVERY);
            return;
          }
          if (lookup.kind === 'missing') {
            commitState({
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
    [canCommit, commitState, flushBeforeEnd, rememberSession, state]
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
          commitState({
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
          rememberSession(current.sessionId, current.workItemId);
          setRecovery(IDLE_RECOVERY);
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
        commitState({
          kind: 'result',
          result: resultFromDetail(
            detail,
            workItemTitle ?? 'Công việc đã kết thúc',
            'Completed'
          ),
        });
        rememberSession(detail.sessionId, detail.workItemId);
        setRecovery(IDLE_RECOVERY);
      } finally {
        startRef.current = false;
        if (mountedRef.current) {
          setIsStarting(false);
        }
      }
    },
    [canCommit, commitState, rememberSession]
  );

  const applyCurrentSession = useCallback(
    async (current: CurrentSession, clockOffsetMs: number, signal: AbortSignal) => {
      // `clockOffsetMs` is sampled the moment the response lands (see
      // checkCurrent), so the restored clock is not shifted by the work-item
      // title lookup below.
      // Re-read the state after every await: a start/resume can commit while
      // the restore request is in flight and must win over the restore.
      const commit = (resolvedTitle: string | null) => {
        const latest = stateRef.current;
        if (latest.kind === 'result' || latest.kind === 'missing') {
          // The restore was issued before the session closed, so its "Active"
          // answer is stale. Keep the outcome already read from the server
          // instead of bringing a finished timer back.
          return;
        }
        if (latest.kind === 'active') {
          if (latest.session.sessionId !== current.sessionId) {
            // Never replace a session the user is timing: ending it is the only
            // safe way to accept the server's session, so report the mismatch.
            setRecovery({ status: 'conflict', message: SESSION_CURRENT_CONFLICT_MESSAGE });
            rememberSession(current.sessionId, current.workItemId);
            return;
          }
          // Same session: refresh the anchor (serverNow is a better offset
          // sample than the start response) without touching title/id.
          commitState({
            kind: 'active',
            session: {
              ...latest.session,
              serverStartTime: current.serverStartTime,
              plannedSeconds: current.plannedSeconds,
              clockOffsetMs,
            },
          });
          setRecovery(IDLE_RECOVERY);
          rememberSession(current.sessionId, current.workItemId);
          return;
        }

        commitState({
          kind: 'active',
          session: {
            sessionId: current.sessionId,
            workItemId: current.workItemId,
            workItemTitle: resolvedTitle ?? 'Công việc đang tập trung',
            serverStartTime: current.serverStartTime,
            plannedSeconds: current.plannedSeconds,
            // serverNow is the server clock when it answered; serverStartTime is
            // when the session began. Anchoring the offset on the former keeps a
            // restored clock on real elapsed time.
            clockOffsetMs,
          },
        });
        setRecovery(IDLE_RECOVERY);
        rememberSession(current.sessionId, current.workItemId);
      };

      if (stateRef.current.kind !== 'idle') {
        commit(null);
        return;
      }

      const resolvedTitle = await resolveWorkItemTitle(
        current.workItemId,
        'Công việc đang tập trung'
      );
      if (!canCommit() || signal.aborted) {
        return;
      }
      commit(resolvedTitle);
    },
    [canCommit, commitState, rememberSession]
  );

  const applyNoCurrentSession = useCallback(() => {
    const existing = stateRef.current;
    if (existing.kind === 'active') {
      // Deliberate UX-safety decision that deviates from "204 = no session"
      // (spec §1). A 204 contradicting a session the user is actively timing is
      // not proof that the session is gone: it can be a racy answer right after
      // start, or another device closing the session server-side. Dropping the
      // timer here would lose a running session; instead the clock is kept and
      // the mismatch is surfaced as "not synced". Ending the session answers
      // 404/409 and the normal end path resolves the real server state, so the
      // user always has a way out and no data is lost.
      setRecovery({ status: 'conflict', message: SESSION_CURRENT_GONE_MESSAGE });
      return;
    }
    setRecovery(IDLE_RECOVERY);
  }, []);

  const checkCurrent = useCallback(
    (options?: { force?: boolean }): Promise<void> => {
      if (!signedIn || startRef.current || endRef.current || !mountedRef.current) {
        return Promise.resolve();
      }
      const inFlight = checkRef.current;
      if (inFlight) {
        return inFlight;
      }
      if (!options?.force && Date.now() - lastCheckRef.current < SESSION_CURRENT_MIN_INTERVAL_MS) {
        return Promise.resolve();
      }

      const controller = new AbortController();
      checkControllerRef.current = controller;
      const task = (async () => {
        if (mountedRef.current) {
          setRecovery((previous) =>
            previous.status === 'checking' ? previous : { status: 'checking', message: null }
          );
        }
        try {
          const current = await getCurrentFocusSession(controller.signal);
          if (!canCommit() || controller.signal.aborted) {
            return;
          }
          lastCheckRef.current = Date.now();
          if (current) {
            // Sample the offset the moment the answer lands, before any other
            // await: resolving the work-item title can take up to the client
            // timeout, and sampling afterwards would lag the restored clock by
            // that wait until the next focus/foreground check.
            const clockOffsetMs = estimateClockOffset(current.serverNow, Date.now());
            await applyCurrentSession(current, clockOffsetMs, controller.signal);
          } else {
            applyNoCurrentSession();
          }
        } catch (error) {
          if (controller.signal.aborted || isAbortedSessionRequest(error)) {
            return;
          }
          if (!canCommit()) {
            return;
          }
          lastCheckRef.current = Date.now();
          setRecovery({
            status: 'unavailable',
            message:
              isSessionError(error) && error.message
                ? `${SESSION_CURRENT_FAILED_MESSAGE} (${error.message})`
                : SESSION_CURRENT_FAILED_MESSAGE,
          });
        } finally {
          if (checkControllerRef.current === controller) {
            checkControllerRef.current = null;
          }
          // Any finished check (success, failure or abort before unmount) means
          // the app is no longer in the "knows nothing yet" cold-start state.
          if (mountedRef.current) {
            setCheckedOnce(true);
          }
        }
      })();

      checkRef.current = task;
      // The task never rejects (all failures become recovery state), so this
      // cleanup promise cannot raise an unhandled rejection.
      void task.finally(() => {
        if (checkRef.current === task) {
          checkRef.current = null;
        }
      });
      return task;
    },
    [applyCurrentSession, applyNoCurrentSession, canCommit, signedIn]
  );

  // Restore once authentication settles (bootstrap or a fresh login).
  useEffect(() => {
    if (!signedIn) {
      return;
    }
    void checkCurrent({ force: true });
  }, [checkCurrent, signedIn]);

  // Coming back to the foreground is when the clock may have drifted and when
  // another device may have closed the session. The dedupe window keeps this
  // from hammering the endpoint on quick app switches.
  useEffect(() => {
    if (!signedIn) {
      return;
    }
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        void checkCurrent();
      }
    });
    return () => subscription.remove();
  }, [checkCurrent, signedIn]);

  // A heartbeat rejected with 409 means the server closed the session (worker
  // timeout or another device). Read the stored result instead of leaving the
  // user on a timer that can never be ended. Depend on the id/title (stable
  // across clock-anchor refreshes) rather than the whole state object.
  const activeSessionTitle = state.kind === 'active' ? state.session.workItemTitle : null;
  useEffect(() => {
    if (!activeSessionId || activeSessionTitle === null) {
      closedHandledRef.current = null;
      return;
    }
    if (events.stoppedReason !== 'closed' || endRef.current) {
      return;
    }
    if (closedHandledRef.current === activeSessionId) {
      return;
    }
    closedHandledRef.current = activeSessionId;
    let cancelled = false;
    void (async () => {
      const lookup = await lookupClosedSession(activeSessionId);
      if (cancelled || !canCommit()) {
        return;
      }
      if (lookup.kind === 'finished') {
        commitState({
          kind: 'result',
          result: resultFromDetail(lookup.detail, activeSessionTitle, 'Completed'),
        });
        rememberSession(lookup.detail.sessionId, lookup.detail.workItemId);
        setRecovery(IDLE_RECOVERY);
        return;
      }
      if (lookup.kind === 'missing') {
        commitState({
          kind: 'missing',
          sessionId: activeSessionId,
          workItemTitle: activeSessionTitle,
          message:
            'Máy chủ không còn phiên này nên ứng dụng đã đóng nó lại. Không có kết quả để hiển thị.',
        });
        return;
      }
      // Still Active or unreachable: keep the session and let the user retry.
      closedHandledRef.current = null;
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeSessionId,
    activeSessionTitle,
    canCommit,
    commitState,
    events.stoppedReason,
    rememberSession,
  ]);

  const dismissResult = useCallback(() => {
    const current = stateRef.current;
    if (current.kind === 'result' || current.kind === 'missing') {
      commitState({ kind: 'idle' });
    }
  }, [commitState]);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      isStarting,
      isEnding,
      events,
      recovery,
      checkedOnce,
      latestSessionByWorkItem,
      start,
      end,
      resume,
      checkCurrent,
      dismissResult,
    }),
    [
      state,
      isStarting,
      isEnding,
      events,
      recovery,
      checkedOnce,
      latestSessionByWorkItem,
      start,
      end,
      resume,
      checkCurrent,
      dismissResult,
    ]
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
