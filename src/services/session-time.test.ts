import {
  clampSessionMinutes,
  computeSessionTiming,
  estimateClockOffset,
  formatDuration,
  formatSessionTimer,
  minutesToPlannedSeconds,
  sessionDurationOptions,
} from '@/services/session-time';

const SERVER_START = '2026-10-20T01:00:00.000Z';
const START_MS = Date.parse(SERVER_START);

describe('clampSessionMinutes', () => {
  test('keeps values inside 15-90 and falls back to 50', () => {
    expect(clampSessionMinutes(5)).toBe(15);
    expect(clampSessionMinutes(120)).toBe(90);
    expect(clampSessionMinutes(45)).toBe(45);
    expect(clampSessionMinutes(null)).toBe(50);
    expect(clampSessionMinutes(undefined)).toBe(50);
  });

  test('builds options including the clamped profile default', () => {
    expect(sessionDurationOptions(50)).toContain(50);
    expect(sessionDurationOptions(5)[0]).toBe(15);
    const highOptions = sessionDurationOptions(120);
    expect(highOptions[highOptions.length - 1]).toBe(90);
  });

  test('converts minutes to planned seconds', () => {
    expect(minutesToPlannedSeconds(50)).toBe(3000);
    expect(minutesToPlannedSeconds(1)).toBe(900);
  });
});

describe('estimateClockOffset', () => {
  test('is zero when the device clock matches the server', () => {
    expect(estimateClockOffset(SERVER_START, START_MS)).toBe(0);
  });

  test('is negative when the device clock runs ahead of the server', () => {
    expect(estimateClockOffset(SERVER_START, START_MS + 30_000)).toBe(-30_000);
  });

  test('is positive when the device clock runs behind the server', () => {
    expect(estimateClockOffset(SERVER_START, START_MS - 10_000)).toBe(10_000);
  });
});

describe('computeSessionTiming', () => {
  test('computes remaining time from the server anchor with a skewed device clock', () => {
    const receivedAtDeviceMs = START_MS + 30_000;
    const offset = estimateClockOffset(SERVER_START, receivedAtDeviceMs);
    const anchor = { serverStartTime: SERVER_START, plannedSeconds: 900, clockOffsetMs: offset };

    expect(computeSessionTiming(anchor, receivedAtDeviceMs)).toMatchObject({
      elapsedSeconds: 0,
      remainingSeconds: 900,
      overtimeSeconds: 0,
      isOvertime: false,
    });

    expect(computeSessionTiming(anchor, receivedAtDeviceMs + 60_000)).toMatchObject({
      elapsedSeconds: 60,
      remainingSeconds: 840,
    });

    expect(computeSessionTiming(anchor, receivedAtDeviceMs + 900_000)).toMatchObject({
      elapsedSeconds: 900,
      remainingSeconds: 0,
      isOvertime: false,
    });
  });

  test('reports overtime after the planned duration', () => {
    const anchor = { serverStartTime: SERVER_START, plannedSeconds: 900, clockOffsetMs: 0 };

    expect(computeSessionTiming(anchor, START_MS + 905_000)).toMatchObject({
      elapsedSeconds: 905,
      remainingSeconds: 0,
      overtimeSeconds: 5,
      isOvertime: true,
    });
  });

  test('never reports negative elapsed time before the server start', () => {
    const anchor = { serverStartTime: SERVER_START, plannedSeconds: 900, clockOffsetMs: 0 };

    expect(computeSessionTiming(anchor, START_MS - 5_000)).toMatchObject({
      elapsedSeconds: 0,
      remainingSeconds: 900,
    });
  });
});

describe('formatDuration', () => {
  test('formats minutes and seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3720)).toBe('62:00');
    expect(formatDuration(-4)).toBe('00:00');
  });

  test('prefixes overtime with a plus sign', () => {
    const anchor = { serverStartTime: SERVER_START, plannedSeconds: 60, clockOffsetMs: 0 };
    const timing = computeSessionTiming(anchor, START_MS + 125_000);

    expect(formatSessionTimer(timing)).toBe('+01:05');
    expect(formatSessionTimer(computeSessionTiming(anchor, START_MS + 30_000))).toBe('00:30');
  });
});
