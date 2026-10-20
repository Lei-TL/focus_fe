import type { SessionStatus } from '@/core/api/types';

export const MIN_SESSION_MINUTES = 15;
export const MAX_SESSION_MINUTES = 90;
export const DEFAULT_PROFILE_SESSION_MINUTES = 50;
export const SESSION_DURATION_PRESETS = [15, 25, 30, 45, 60, 90] as const;

export type SessionAnchor = {
  serverStartTime: string;
  plannedSeconds: number;
  clockOffsetMs: number;
};

export type SessionTiming = {
  totalSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  overtimeSeconds: number;
  isOvertime: boolean;
};

export function clampSessionMinutes(value: number | null | undefined): number {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return DEFAULT_PROFILE_SESSION_MINUTES;
  }
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(value)));
}

export function sessionDurationOptions(defaultMinutes: number | null | undefined): number[] {
  const defaultOption = clampSessionMinutes(defaultMinutes);
  return Array.from(new Set<number>([...SESSION_DURATION_PRESETS, defaultOption])).sort(
    (left, right) => left - right
  );
}

export function minutesToPlannedSeconds(minutes: number): number {
  return clampSessionMinutes(minutes) * 60;
}

// Server time is authoritative. At the moment a response arrives we don't know
// the one-way network latency, so we approximate:
//   offset = serverTimestamp - deviceNow
// For /sessions/start the server timestamp is serverStartTime (the session was
// just created), so this treats the response as arriving instantly. The error is
// therefore the request/response latency, which is small and acceptable here.
// Every clock tick later uses deviceNow + offset against serverStartTime, so the
// display never decrements a local counter and cannot drift while backgrounded.
export function estimateClockOffset(serverTimestamp: string, receivedAtDeviceMs: number): number {
  const serverMs = Date.parse(serverTimestamp);
  if (Number.isNaN(serverMs) || !Number.isFinite(receivedAtDeviceMs)) {
    return 0;
  }
  return serverMs - receivedAtDeviceMs;
}

export function computeSessionTiming(anchor: SessionAnchor, deviceNowMs: number): SessionTiming {
  const totalSeconds = Math.max(0, Math.floor(anchor.plannedSeconds));
  const startMs = Date.parse(anchor.serverStartTime);
  const serverNowMs = deviceNowMs + anchor.clockOffsetMs;
  const elapsedMs = Number.isNaN(startMs) ? 0 : Math.max(0, serverNowMs - startMs);
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const overtimeSeconds = Math.max(0, elapsedSeconds - totalSeconds);

  return {
    totalSeconds,
    elapsedSeconds,
    remainingSeconds,
    overtimeSeconds,
    isOvertime: overtimeSeconds > 0,
  };
}

export function formatDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatSessionTimer(timing: SessionTiming): string {
  return timing.isOvertime
    ? `+${formatDuration(timing.overtimeSeconds)}`
    : formatDuration(timing.remainingSeconds);
}

export function formatSessionStatus(status: SessionStatus): string {
  switch (status) {
    case 'Completed':
      return 'Hoàn thành';
    case 'Cancelled':
      return 'Đã hủy';
    default:
      return 'Đang chạy';
  }
}
