import * as Crypto from 'expo-crypto';

import type { SessionEventInput } from '@/core/api/types';

// The backend does not generate heartbeats; the client is the only source.
export const SESSION_HEARTBEAT_INTERVAL_MS = 30_000;
// The API accepts 1–200 events per batch and rejects the whole batch on 400.
export const SESSION_EVENT_BATCH_LIMIT = 200;
// Coalesce events that arrive close together (heartbeat + app state) into one
// request instead of one request per event.
export const SESSION_EVENT_FLUSH_DELAY_MS = 1_000;

export type SessionEventType = SessionEventInput['type'];

function pad(value: number, length = 2): string {
  return String(Math.abs(value)).padStart(length, '0');
}

// Local device time with an explicit numeric offset (e.g. +07:00). The contract
// requires ISO 8601 with an offset; `toISOString()` would print `Z` instead.
export function formatClientTimestamp(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const offset = `${sign}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(
    Math.abs(offsetMinutes) % 60
  )}`;
  const local =
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `.${pad(date.getMilliseconds(), 3)}`;

  return `${local}${offset}`;
}

// expo-crypto is an Expo Go module and randomUUID uses the platform CSPRNG.
// The fallback keeps event ids usable if the native module is unavailable
// (for example in a test runtime); dedupe only needs uniqueness per device, not
// cryptographic strength.
function fallbackUuidV4(): string {
  const bytes = new Uint8Array(16);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join(''),
  ].join('-');
}

export function createSessionEventId(): string {
  try {
    const id = Crypto.randomUUID();
    if (typeof id === 'string' && id.length === 36) {
      return id;
    }
  } catch {
    // Fall through to the pure JS generator.
  }
  return fallbackUuidV4();
}

// A retried event must keep both fields: the backend dedupes by clientEventId
// and keeps the first payload it received.
export function buildSessionEvent(
  type: SessionEventType,
  atMs: number = Date.now(),
  newId: () => string = createSessionEventId
): SessionEventInput {
  return {
    clientEventId: newId(),
    type,
    source: 'Device',
    clientTs: formatClientTimestamp(new Date(atMs)),
  };
}
