import { formatDuration } from '@/services/session-time';

// Everything the app knows about a session is scoped by id; a malformed id is
// rejected before it reaches GET /sessions/{id} (which would answer 400).
const GENERIC_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSessionId(value: string | null | undefined): value is string {
  return typeof value === 'string' && GENERIC_UUID.test(value.trim());
}

export type SessionMoment = {
  // "20/10/2026 08:00" built from parts, so the output does not depend on the
  // device locale's punctuation.
  text: string;
  // Resolved IANA id, or "local" when the profile zone could not be used.
  timeZoneId: string;
  // True when device-local time was used because the profile supplied no usable
  // zone (missing or unknown); the result screen must then say so.
  usedFallbackTimeZone: boolean;
  // Why the fallback happened, so the screen can tell "the profile has no time
  // zone" apart from "the profile time zone is invalid".
  fallbackReason: 'missing' | 'invalid' | null;
};

const LOCALE = 'en-GB';
const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZoneId: string | undefined): Intl.DateTimeFormat {
  const key = timeZoneId ?? 'local';
  const cached = formatterCache.get(key);
  if (cached) {
    return cached;
  }
  const formatter = new Intl.DateTimeFormat(LOCALE, {
    ...(timeZoneId ? { timeZone: timeZoneId } : {}),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  formatterCache.set(key, formatter);
  return formatter;
}

export function isValidTimeZone(timeZoneId: string | null | undefined): boolean {
  if (typeof timeZoneId !== 'string' || timeZoneId.trim().length === 0) {
    return false;
  }
  try {
    formatterFor(timeZoneId.trim());
    return true;
  } catch {
    return false;
  }
}

// Formats an ISO instant in the profile's time zone. An unknown/absent zone
// falls back to device-local time instead of throwing, because a broken profile
// value must never block showing a stored session. The returned
// `fallbackReason` lets the UI explain which case happened.
export function formatSessionMoment(
  iso: string | null | undefined,
  timeZoneId: string | null | undefined
): SessionMoment | null {
  if (!iso) {
    return null;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const preferred = typeof timeZoneId === 'string' ? timeZoneId.trim() : '';
  const usable = preferred.length > 0 && isValidTimeZone(preferred) ? preferred : null;
  const fallbackReason: SessionMoment['fallbackReason'] =
    usable !== null ? null : preferred.length > 0 ? 'invalid' : 'missing';
  const formatter = formatterFor(usable ?? undefined);

  let text: string;
  try {
    const parts = formatter.formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value ?? '';
    // Some engines report midnight as 24 with hour12: false.
    const hour = pick('hour') === '24' ? '00' : pick('hour');
    text = `${pick('day')}/${pick('month')}/${pick('year')} ${hour}:${pick('minute')}`;
  } catch {
    text = formatter.format(date);
  }

  return {
    text,
    timeZoneId: usable ?? 'local',
    usedFallbackTimeZone: fallbackReason !== null,
    fallbackReason,
  };
}

// grossSeconds is null while the session is still Active (the server stores it
// only when closing), so the UI must not render "00:00" for a running session.
export function formatSessionGrossSeconds(grossSeconds: number | null | undefined): string {
  return grossSeconds === null || grossSeconds === undefined
    ? 'Đang chạy'
    : formatDuration(grossSeconds);
}
