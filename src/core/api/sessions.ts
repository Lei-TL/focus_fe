import { apiClient } from '@/core/api/client';
import { request } from '@/core/api/request';
import type {
  CurrentSession,
  EndSessionReason,
  EndedSessionDetail,
  RecordedEvents,
  RecordSessionEventsRequest,
  SessionRead,
  SessionDetail,
  SessionEventInput,
  StartSessionRequest,
} from '@/core/api/types';

export async function startSession(
  workItemId: string,
  plannedSeconds?: number,
  signal?: AbortSignal
): Promise<SessionDetail> {
  const body: StartSessionRequest = { workItemId };
  if (plannedSeconds !== undefined) {
    body.plannedSeconds = plannedSeconds;
  }
  return request('post', '/sessions/start', { body, signal });
}

export async function endSession(
  id: string,
  reason: EndSessionReason,
  signal?: AbortSignal
): Promise<EndedSessionDetail> {
  return request('post', '/sessions/{id}/end', {
    pathParams: { id },
    body: { reason },
    signal,
  });
}

export async function getSession(id: string, signal?: AbortSignal): Promise<SessionRead> {
  return request('get', '/sessions/{id}', { pathParams: { id }, signal });
}

export async function recordSessionEvents(
  id: string,
  events: SessionEventInput[],
  signal?: AbortSignal
): Promise<RecordedEvents> {
  const body: RecordSessionEventsRequest = { events };
  return request('post', '/sessions/{id}/events', {
    pathParams: { id },
    body,
    signal,
  });
}

// `request()` types 200 ahead of 204, so it cannot represent the empty body of
// GET /sessions/current. This endpoint needs the raw response to return null on
// 204 instead of a phantom CurrentSession.
export async function getCurrentSession(signal?: AbortSignal): Promise<CurrentSession | null> {
  const response = await apiClient.request<CurrentSession>({
    method: 'get',
    url: '/sessions/current',
    signal,
  });
  return response.status === 204 ? null : response.data;
}
