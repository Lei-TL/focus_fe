import {
  formatSessionGrossSeconds,
  formatSessionMoment,
  isSessionId,
  isValidTimeZone,
} from '@/services/session-format';

describe('isSessionId', () => {
  test('accepts a single UUID and rejects route noise', () => {
    expect(isSessionId('0f7a1e4c-4a3c-4c1b-9b2e-0f9f0d1c2b3a')).toBe(true);
    expect(isSessionId(' 0f7a1e4c-4a3c-4c1b-9b2e-0f9f0d1c2b3a ')).toBe(true);
    expect(isSessionId('s1')).toBe(false);
    expect(isSessionId('0f7a1e4c4a3c4c1b9b2e0f9f0d1c2b3a')).toBe(false);
    expect(isSessionId(['a'] as unknown as string)).toBe(false);
    expect(isSessionId(null)).toBe(false);
    expect(isSessionId(undefined)).toBe(false);
  });
});

describe('isValidTimeZone', () => {
  test('accepts IANA ids and rejects unknown ones', () => {
    expect(isValidTimeZone('Asia/Ho_Chi_Minh')).toBe(true);
    expect(isValidTimeZone('UTC')).toBe(true);
    expect(isValidTimeZone('Mars/Olympus_Mons')).toBe(false);
    expect(isValidTimeZone('')).toBe(false);
    expect(isValidTimeZone(null)).toBe(false);
  });
});

describe('formatSessionMoment', () => {
  const iso = '2026-10-20T01:00:00.000Z';

  test('renders the instant in the profile time zone', () => {
    expect(formatSessionMoment(iso, 'Asia/Ho_Chi_Minh')).toEqual({
      text: '20/10/2026 08:00',
      timeZoneId: 'Asia/Ho_Chi_Minh',
      usedFallbackTimeZone: false,
      fallbackReason: null,
    });
    expect(formatSessionMoment(iso, 'UTC')).toMatchObject({
      text: '20/10/2026 01:00',
      usedFallbackTimeZone: false,
      fallbackReason: null,
    });
  });

  test('falls back to device-local time when the profile zone is invalid', () => {
    const formatted = formatSessionMoment(iso, 'Mars/Olympus_Mons');

    expect(formatted).not.toBeNull();
    expect(formatted?.timeZoneId).toBe('local');
    expect(formatted?.usedFallbackTimeZone).toBe(true);
    expect(formatted?.fallbackReason).toBe('invalid');
    expect(formatted?.text).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  test('reports the fallback when the profile has no time zone at all', () => {
    const blank = formatSessionMoment(iso, '');
    const absent = formatSessionMoment(iso, undefined);

    // A profile without a zone is a fallback too, but a different one: the UI
    // must say "no time zone in the profile", not "invalid time zone".
    for (const formatted of [blank, absent]) {
      expect(formatted?.timeZoneId).toBe('local');
      expect(formatted?.usedFallbackTimeZone).toBe(true);
      expect(formatted?.fallbackReason).toBe('missing');
    }
  });

  test('returns null for missing or unreadable timestamps', () => {
    expect(formatSessionMoment(null, 'UTC')).toBeNull();
    expect(formatSessionMoment(undefined, 'UTC')).toBeNull();
    expect(formatSessionMoment('not-a-date', 'UTC')).toBeNull();
  });
});

describe('formatSessionGrossSeconds', () => {
  test('shows a running session instead of a fake 00:00', () => {
    expect(formatSessionGrossSeconds(null)).toBe('Đang chạy');
    expect(formatSessionGrossSeconds(undefined)).toBe('Đang chạy');
    expect(formatSessionGrossSeconds(185)).toBe('03:05');
    expect(formatSessionGrossSeconds(0)).toBe('00:00');
  });
});
