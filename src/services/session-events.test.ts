import * as Crypto from 'expo-crypto';

import {
  buildSessionEvent,
  createSessionEventId,
  formatClientTimestamp,
} from '@/services/session-events';

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(),
}));

const randomUUID = Crypto.randomUUID as jest.Mock;

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('formatClientTimestamp', () => {
  test('keeps local time and adds a numeric offset', () => {
    const date = new Date(2026, 9, 21, 9, 5, 6, 7);
    const formatted = formatClientTimestamp(date);

    expect(formatted).toMatch(/^2026-10-21T09:05:06\.007[+-]\d{2}:\d{2}$/);
    expect(Date.parse(formatted)).toBe(date.getTime());
  });
});

describe('createSessionEventId', () => {
  test('uses expo-crypto when it returns a UUID', () => {
    randomUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174000');

    expect(createSessionEventId()).toBe('123e4567-e89b-42d3-a456-426614174000');
  });

  test('falls back to a UUID v4 when the native module is unavailable', () => {
    randomUUID.mockImplementation(() => {
      throw new Error('native module missing');
    });

    expect(createSessionEventId()).toMatch(UUID_V4);
  });
});

describe('buildSessionEvent', () => {
  test('builds a Device event with a stable id and the machine timestamp', () => {
    randomUUID.mockReturnValue('123e4567-e89b-42d3-a456-426614174000');
    const at = new Date(2026, 9, 21, 9, 0, 30, 0).getTime();

    const event = buildSessionEvent('Background', at);

    expect(event).toEqual({
      clientEventId: '123e4567-e89b-42d3-a456-426614174000',
      type: 'Background',
      source: 'Device',
      clientTs: formatClientTimestamp(new Date(at)),
    });
    expect(Date.parse(event.clientTs)).toBe(at);
  });
});
