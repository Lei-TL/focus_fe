import { fireEvent, render, screen } from '@testing-library/react-native';

import FocusScreen from '@/app/(tabs)/focus';
import type { WorkItemDetail } from '@/core/api/types';
import type { SessionContextValue } from '@/context/session-context';
import { useWorkItems } from '@/hooks/use-work-items';
import { SessionClientError } from '@/services/session-error';

let mockSession: SessionContextValue;

jest.mock('@/context/session-context', () => ({
  useSession: () => mockSession,
}));

jest.mock('@/context/auth-context', () => ({
  useAuth: () => ({ profile: { defaultSessionMinutes: 50 } }),
}));

jest.mock('@/hooks/use-work-items', () => ({
  useWorkItems: jest.fn(),
}));

const useWorkItemsMock = useWorkItems as jest.MockedFunction<typeof useWorkItems>;

function item(overrides: Partial<WorkItemDetail> = {}): WorkItemDetail {
  return {
    id: 'w1',
    title: 'Học React Native',
    description: null,
    type: 'Coding',
    complexity: 'M',
    deadline: null,
    status: 'Open',
    userEstimateMinutes: null,
    closedAt: null,
    createdAt: '2026-10-19T03:00:00.000Z',
    updatedAt: '2026-10-19T03:00:00.000Z',
    ...overrides,
  };
}

function mockWorkItems(overrides: Partial<ReturnType<typeof useWorkItems>> = {}) {
  useWorkItemsMock.mockReturnValue({
    items: [item()],
    totalCount: 1,
    filters: { status: 'Open', type: null },
    setFilters: jest.fn(),
    loading: false,
    refreshing: false,
    loadingMore: false,
    error: null,
    hasMore: false,
    reload: jest.fn(),
    refresh: jest.fn(),
    loadMore: jest.fn(),
    ...overrides,
  });
}

function sessionValue(overrides: Partial<SessionContextValue> = {}): SessionContextValue {
  mockSession = {
    state: { kind: 'idle' },
    isStarting: false,
    isEnding: false,
    start: jest.fn(),
    end: jest.fn(),
    resume: jest.fn(),
    dismissResult: jest.fn(),
    ...overrides,
  };
  return mockSession;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockWorkItems();
  sessionValue();
});

describe('FocusScreen', () => {
  test('lists open work items and lets the user pick one to start', () => {
    render(<FocusScreen />);

    fireEvent.press(screen.getByTestId('focus-item-w1'));

    expect(screen.getAllByText('Học React Native').length).toBeGreaterThan(0);
    expect(screen.getByTestId('session-start')).toBeTruthy();
    expect(screen.getByTestId('focus-app-state')).toBeTruthy();
  });

  test('shows an empty state when no work item is open', () => {
    mockWorkItems({ items: [], totalCount: 0 });

    render(<FocusScreen />);

    expect(screen.getByTestId('focus-items-empty')).toBeTruthy();
  });

  test('counts down from the server start time', () => {
    const now = Date.parse('2026-10-20T01:05:00.000Z');
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    sessionValue({
      state: {
        kind: 'active',
        session: {
          sessionId: 's1',
          workItemId: 'w1',
          workItemTitle: 'Học React Native',
          serverStartTime: '2026-10-20T01:00:00.000Z',
          plannedSeconds: 900,
          clockOffsetMs: 0,
        },
      },
    });

    render(<FocusScreen />);

    expect(screen.getByTestId('session-timer')).toHaveTextContent('10:00');
    expect(screen.getByTestId('session-active-title')).toHaveTextContent('Học React Native');
    expect(screen.getByTestId('session-complete')).toBeTruthy();
    expect(screen.getByTestId('session-cancel')).toBeTruthy();

    nowSpy.mockRestore();
  });

  test('shows the persisted gross duration and the raw-time disclaimer', () => {
    sessionValue({
      state: {
        kind: 'result',
        result: {
          sessionId: 's1',
          workItemId: 'w1',
          workItemTitle: 'Học React Native',
          status: 'Cancelled',
          grossSeconds: 185,
          serverStartTime: '2026-10-20T01:00:00.000Z',
          serverEndTime: '2026-10-20T01:03:05.000Z',
        },
      },
    });

    render(<FocusScreen />);

    expect(screen.getByTestId('session-result-status')).toHaveTextContent('Đã hủy');
    expect(screen.getByTestId('session-result-gross')).toHaveTextContent('03:05');
    expect(screen.getByText(/thời gian thô/)).toBeTruthy();
    expect(screen.getAllByText(/điểm chất lượng/).length).toBeGreaterThan(0);
  });

  test('offers to open the active session after a 409 start conflict', async () => {
    const start = jest.fn().mockRejectedValue(
      new SessionClientError({
        code: 'activeSessionExists',
        message: 'Bạn đang có một phiên tập trung chưa kết thúc.',
        sessionId: 's1',
      })
    );
    sessionValue({ start });

    render(<FocusScreen />);
    fireEvent.press(screen.getByTestId('focus-item-w1'));
    fireEvent.press(screen.getByTestId('session-start'));

    expect(await screen.findByTestId('session-open-active')).toBeTruthy();
  });
});
