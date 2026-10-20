import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';
import { Alert } from 'react-native';

import WorkItemDetailScreen from '@/app/(tabs)/tasks/[id]/index';
import type {
  DependencyDetail,
  WorkItemDetail,
  WorkItemDetailWithLinks,
} from '@/core/api/types';
import { useDependencyItems } from '@/hooks/use-dependency-items';
import { useWorkItemDetail } from '@/hooks/use-work-item-detail';
import {
  addWorkItemDependency,
  changeWorkItemStatus,
  deleteWorkItem,
  loadAllWorkItems,
  removeWorkItemDependency,
} from '@/services/work-items-service';

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'w1' }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/hooks/use-work-item-detail', () => ({
  useWorkItemDetail: jest.fn(),
}));

jest.mock('@/hooks/use-dependency-items', () => ({
  useDependencyItems: jest.fn(),
}));

jest.mock('@/services/work-items-service', () => ({
  addWorkItemDependency: jest.fn(),
  changeWorkItemStatus: jest.fn(),
  deleteWorkItem: jest.fn(),
  loadAllWorkItems: jest.fn(),
  removeWorkItemDependency: jest.fn(),
}));

const useDetailMock = useWorkItemDetail as jest.MockedFunction<typeof useWorkItemDetail>;
const useDependencyMock = useDependencyItems as jest.MockedFunction<typeof useDependencyItems>;
const addDependencyMock = addWorkItemDependency as jest.MockedFunction<
  typeof addWorkItemDependency
>;
const changeStatusMock = changeWorkItemStatus as jest.MockedFunction<
  typeof changeWorkItemStatus
>;
const deleteMock = deleteWorkItem as jest.MockedFunction<typeof deleteWorkItem>;
const loadAllMock = loadAllWorkItems as jest.MockedFunction<typeof loadAllWorkItems>;
const removeDependencyMock = removeWorkItemDependency as jest.MockedFunction<
  typeof removeWorkItemDependency
>;

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

function item(overrides: Partial<WorkItemDetail> = {}): WorkItemDetail {
  return {
    id: 'w1',
    title: 'Việc chính',
    description: 'Mô tả công việc',
    type: 'Coding',
    complexity: 'M',
    deadline: null,
    status: 'Open',
    userEstimateMinutes: 45,
    closedAt: null,
    createdAt: '2026-10-19T03:00:00.000Z',
    updatedAt: '2026-10-19T03:00:00.000Z',
    ...overrides,
  };
}

function detailWithLinks(
  overrides: Partial<WorkItemDetailWithLinks> = {}
): WorkItemDetailWithLinks {
  return { ...item(), dependsOnWorkItemIds: [], ...overrides };
}

function mockDetail(current: WorkItemDetailWithLinks = detailWithLinks()) {
  const value = {
    detail: current,
    loading: false,
    error: null,
    refresh: jest.fn(),
    applyWorkItem: jest.fn(),
  };
  useDetailMock.mockReturnValue(value);
  return value;
}

beforeEach(() => {
  jest.clearAllMocks();
  useDependencyMock.mockReturnValue({ items: {}, loading: false });
  loadAllMock.mockResolvedValue([]);
});

describe('WorkItemDetailScreen', () => {
  test('renders dependency titles resolved from the detail endpoint', () => {
    mockDetail(detailWithLinks({ dependsOnWorkItemIds: ['w2'] }));
    useDependencyMock.mockReturnValue({
      items: { w2: item({ id: 'w2', title: 'Việc phụ thuộc' }) },
      loading: false,
    });

    render(<WorkItemDetailScreen />);

    expect(screen.getByText('Việc phụ thuộc')).toBeTruthy();
    expect(screen.getByText('Mô tả công việc')).toBeTruthy();
  });

  test('shows the 409 message when deleting a work item that has sessions', async () => {
    mockDetail();
    deleteMock.mockRejectedValue(httpError(409));
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      buttons?.find((button) => button.style === 'destructive')?.onPress?.();
    });

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-delete'));

    await waitFor(() =>
      expect(
        screen.getByText('Công việc đã có phiên làm việc nên không thể xóa.')
      ).toBeTruthy()
    );
    expect(deleteMock).toHaveBeenCalledWith('w1');
    expect(mockBack).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('shows the duplicate dependency message on 409', async () => {
    mockDetail(detailWithLinks({ dependsOnWorkItemIds: [] }));
    loadAllMock.mockResolvedValue([item(), item({ id: 'w2', title: 'Việc ứng viên' })]);
    addDependencyMock.mockRejectedValue(httpError(409));

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-add-dependency'));

    const candidate = await screen.findByTestId('dependency-candidate-w2');
    fireEvent.press(candidate);

    await waitFor(() => expect(screen.getByText('Phụ thuộc này đã tồn tại.')).toBeTruthy());
    expect(addDependencyMock).toHaveBeenCalledWith('w1', 'w2');
  });

  test('applies the updated item after changing status', async () => {
    const value = mockDetail();
    changeStatusMock.mockResolvedValue(item({ status: 'Done' }));

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-status-Done'));

    await waitFor(() =>
      expect(value.applyWorkItem).toHaveBeenCalledWith(expect.objectContaining({ status: 'Done' }))
    );
  });

  test('reports a failed refresh after adding a dependency', async () => {
    const value = mockDetail(detailWithLinks({ dependsOnWorkItemIds: [] }));
    value.refresh.mockResolvedValue(false);
    loadAllMock.mockResolvedValue([item(), item({ id: 'w2', title: 'Việc ứng viên' })]);
    addDependencyMock.mockResolvedValue({
      workItemId: 'w1',
      dependsOnWorkItemId: 'w2',
    } as DependencyDetail);

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-add-dependency'));
    fireEvent.press(await screen.findByTestId('dependency-candidate-w2'));

    await waitFor(() =>
      expect(screen.getByTestId('work-item-detail-refresh-error')).toBeTruthy()
    );
    expect(screen.getByText(/Đã thêm phụ thuộc nhưng chưa tải lại được/)).toBeTruthy();
    expect(value.refresh).toHaveBeenCalledTimes(1);
  });

  test('reports a failed refresh after removing a dependency', async () => {
    const value = mockDetail(detailWithLinks({ dependsOnWorkItemIds: ['w2'] }));
    value.refresh.mockResolvedValue(false);
    useDependencyMock.mockReturnValue({
      items: { w2: item({ id: 'w2', title: 'Việc phụ thuộc' }) },
      loading: false,
    });
    removeDependencyMock.mockResolvedValue();

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-remove-dependency-w2'));

    await waitFor(() =>
      expect(screen.getByText(/Đã xóa phụ thuộc nhưng chưa tải lại được/)).toBeTruthy()
    );
  });

  test('removes a dependency and refreshes the detail', async () => {
    const value = mockDetail(detailWithLinks({ dependsOnWorkItemIds: ['w2'] }));
    useDependencyMock.mockReturnValue({
      items: { w2: item({ id: 'w2', title: 'Việc phụ thuộc' }) },
      loading: false,
    });
    removeDependencyMock.mockResolvedValue();

    render(<WorkItemDetailScreen />);
    fireEvent.press(screen.getByTestId('work-item-remove-dependency-w2'));

    await waitFor(() => expect(value.refresh).toHaveBeenCalledTimes(1));
    expect(removeDependencyMock).toHaveBeenCalledWith('w1', 'w2');
  });
});
