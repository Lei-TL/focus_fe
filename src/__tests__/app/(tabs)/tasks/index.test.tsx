import { fireEvent, render, screen } from '@testing-library/react-native';

import TasksScreen from '@/app/(tabs)/tasks/index';
import type { WorkItemDetail } from '@/core/api/types';
import { useWorkItems } from '@/hooks/use-work-items';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: jest.fn(),
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

function mockHook(overrides: Partial<ReturnType<typeof useWorkItems>> = {}) {
  const value: ReturnType<typeof useWorkItems> = {
    items: [],
    totalCount: 0,
    filters: { status: null, type: null },
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
  };
  useWorkItemsMock.mockReturnValue(value);
  return value;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('TasksScreen', () => {
  test('renders real work item fields without priority or session placeholders', () => {
    mockHook({
      items: [item({ deadline: '2026-12-15T12:00:00.000Z' })],
      totalCount: 1,
    });

    render(<TasksScreen />);

    expect(screen.getByText('Học React Native')).toBeTruthy();
    expect(screen.getByText('Lập trình · M')).toBeTruthy();
    expect(screen.getAllByText('Đang mở').length).toBeGreaterThan(0);
    expect(screen.getByText(/Hạn chót:/)).toBeTruthy();
    expect(screen.queryByText(/phiên/)).toBeNull();
  });

  test('opens the detail route when a card is pressed', () => {
    mockHook({ items: [item()], totalCount: 1 });

    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('work-item-w1'));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/tasks/[id]',
      params: { id: 'w1' },
    });
  });

  test('shows the loading state on the first load', () => {
    mockHook({ loading: true });

    render(<TasksScreen />);

    expect(screen.getByTestId('tasks-loading')).toBeTruthy();
  });

  test('shows an empty state when there are no items', () => {
    mockHook();

    render(<TasksScreen />);

    expect(screen.getByTestId('tasks-empty')).toBeTruthy();
  });

  test('shows an error with retry', () => {
    const value = mockHook({ error: 'Không tải được danh sách công việc.' });

    render(<TasksScreen />);

    expect(screen.getByTestId('tasks-error')).toBeTruthy();
    fireEvent.press(screen.getByTestId('tasks-retry'));
    expect(value.reload).toHaveBeenCalledTimes(1);
  });

  test('updates the status filter', () => {
    const value = mockHook();

    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('filter-status-Done'));

    expect(value.setFilters).toHaveBeenCalledWith({ status: 'Done', type: null });
  });

  test('requests the next page from the load-more button', () => {
    const value = mockHook({ items: [item()], totalCount: 2, hasMore: true });

    render(<TasksScreen />);
    fireEvent.press(screen.getByTestId('tasks-load-more'));

    expect(value.loadMore).toHaveBeenCalledTimes(1);
  });
});
