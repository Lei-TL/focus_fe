import * as sessionsApi from '@/core/api/sessions';
import type {
  CurrentSession,
  EndSessionReason,
  EndedSessionDetail,
  RecordedEvents,
  SessionDetail,
  SessionEventInput,
  SessionRead,
} from '@/core/api/types';
import {
  isAbortedSessionRequest,
  SessionClientError,
  toSessionError,
  type SessionAction,
} from '@/services/session-error';

function rethrowMapped(error: unknown, action: SessionAction): never {
  if (isAbortedSessionRequest(error)) {
    throw error;
  }
  throw new SessionClientError(toSessionError(error, action));
}

export async function startFocusSession(
  workItemId: string,
  plannedSeconds: number,
  signal?: AbortSignal
): Promise<SessionDetail> {
  try {
    return await sessionsApi.startSession(workItemId, plannedSeconds, signal);
  } catch (error) {
    rethrowMapped(error, 'start');
  }
}

export async function endFocusSession(
  sessionId: string,
  reason: EndSessionReason,
  signal?: AbortSignal
): Promise<EndedSessionDetail> {
  try {
    return await sessionsApi.endSession(sessionId, reason, signal);
  } catch (error) {
    rethrowMapped(error, 'end');
  }
}

export async function getFocusSession(
  sessionId: string,
  signal?: AbortSignal
): Promise<SessionRead> {
  try {
    return await sessionsApi.getSession(sessionId, signal);
  } catch (error) {
    rethrowMapped(error, 'detail');
  }
}

export async function recordFocusSessionEvents(
  sessionId: string,
  events: SessionEventInput[],
  signal?: AbortSignal
): Promise<RecordedEvents> {
  try {
    return await sessionsApi.recordSessionEvents(sessionId, events, signal);
  } catch (error) {
    rethrowMapped(error, 'events');
  }
}

export async function getCurrentFocusSession(
  signal?: AbortSignal
): Promise<CurrentSession | null> {
  try {
    return await sessionsApi.getCurrentSession(signal);
  } catch (error) {
    rethrowMapped(error, 'current');
  }
}
