import { fireEvent, render, screen } from '@testing-library/react-native';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import SessionResultScreen, {
  INVALID_SESSION_ID_MESSAGE,
} from '@/app/session/[id]';
import type { SessionRead } from '@/core/api/types';
import { getFocusSession } from '@/services/session-service';

const SESSION_ID = '0f7a1e4c-4a3c-4c1b-9b2e-0f9f0d1c2b3a';

let mockParams: { id?: string | string[] } = { id: SESSION_ID };
let mockTimeZone = 'Asia/Ho_Chi_Minh';
const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('@/context/auth-context', () => ({
  useAuth: () => ({ profile: { timeZoneId: mockTimeZone } }),
}));

jest.mock('@/services/session-service', () => ({
  getFocusSession: jest.fn(),
}));

const detailMock = getFocusSession as jest.MockedFunction<typeof getFocusSession>;

function httpError(status: number): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data: undefined,
  });
}

function sessionDetail(overrides: Partial<SessionRead> = {}): SessionRead {
  return {
    sessionId: SESSION_ID,
    workItemId: 'w1',
    status: 'Completed',
    serverStartTime: '2026-10-20T01:00:00.000Z',
    serverEndTime: '2026-10-20T01:03:05.000Z',
    plannedSeconds: 1800,
    grossSeconds: 185,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: SESSION_ID };
  mockTimeZone = 'Asia/Ho_Chi_Minh';
});

describe('SessionResultScreen', () => {
  test('shows a stored completed session in the profile time zone', async () => {
    detailMock.mockResolvedValue(sessionDetail());

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-status')).toHaveTextContent('Hoàn thành');
    expect(screen.getByTestId('session-detail-start')).toHaveTextContent('20/10/2026 08:00');
    expect(screen.getByTestId('session-detail-end')).toHaveTextContent('20/10/2026 08:03');
    expect(screen.getByTestId('session-detail-gross')).toHaveTextContent(/03:05/);
    expect(screen.getByTestId('session-detail-timezone')).toHaveTextContent(
      /Asia\/Ho_Chi_Minh/
    );
    expect(screen.queryByTestId('session-detail-timezone-fallback')).toBeNull();
    expect(detailMock).toHaveBeenCalledWith(SESSION_ID, expect.any(AbortSignal));
  });

  test('shows a cancelled session and the fallback note for an invalid profile zone', async () => {
    mockTimeZone = 'Mars/Olympus_Mons';
    detailMock.mockResolvedValue(
      sessionDetail({ status: 'Cancelled', serverEndTime: '2026-10-20T01:03:05.000Z' })
    );

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-status')).toHaveTextContent('Đã hủy');
    expect(screen.getByTestId('session-detail-timezone-fallback')).toHaveTextContent(
      /không hợp lệ/
    );
    expect(screen.getByTestId('session-detail-timezone-fallback')).toHaveTextContent(
      /giờ cục bộ/
    );
    expect(screen.getByTestId('session-detail-timezone')).toHaveTextContent(/local/);
  });

  test('explains a fallback when the profile has no time zone', async () => {
    mockTimeZone = '';
    detailMock.mockResolvedValue(sessionDetail());

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-timezone-fallback')).toHaveTextContent(
      /Hồ sơ chưa có múi giờ/
    );
    expect(screen.getByTestId('session-detail-timezone')).toHaveTextContent(/local/);
  });

  test('shows an active session without inventing an end time or duration', async () => {
    detailMock.mockResolvedValue(
      sessionDetail({ status: 'Active', serverEndTime: null, grossSeconds: null })
    );

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-status')).toHaveTextContent('Đang chạy');
    expect(screen.getByTestId('session-detail-gross')).toHaveTextContent(/Đang chạy/);
    expect(screen.getByTestId('session-detail-end')).toHaveTextContent('Chưa kết thúc');
    expect(screen.getByTestId('session-detail-active-note')).toBeTruthy();

    fireEvent.press(screen.getByTestId('session-detail-open-focus'));
    expect(mockPush).toHaveBeenCalledWith('/focus');
  });

  test('explains a 404 instead of showing an empty result', async () => {
    detailMock.mockRejectedValue(httpError(404));

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-error')).toHaveTextContent(
      /Không tìm thấy phiên làm việc/
    );
    expect(screen.getByTestId('session-detail-retry')).toBeTruthy();
  });

  test('explains a 400 returned by the detail endpoint', async () => {
    detailMock.mockRejectedValue(httpError(400));

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-error')).toHaveTextContent(
      /chưa hợp lệ/
    );
  });

  test('rejects a malformed id before calling the endpoint', async () => {
    mockParams = { id: 'not-a-uuid' };

    render(<SessionResultScreen />);

    expect(await screen.findByTestId('session-detail-error')).toHaveTextContent(
      INVALID_SESSION_ID_MESSAGE
    );
    expect(detailMock).not.toHaveBeenCalled();
  });

  test('aborts the detail request when the screen is left', async () => {
    let capturedSignal: AbortSignal | undefined;
    detailMock.mockImplementation(
      (_id, signal) =>
        new Promise((_resolve, reject) => {
          capturedSignal = signal;
          signal?.addEventListener('abort', () => reject(new Error('aborted')));
        })
    );

    const view = render(<SessionResultScreen />);
    expect(capturedSignal?.aborted).toBe(false);

    view.unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });
});
