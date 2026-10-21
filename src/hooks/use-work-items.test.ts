import { act, renderHook, waitFor } from '@testing-library/react-native';

import type { WorkItemDetail, WorkItemsPage } from '@/core/api/types';
import { useWorkItems } from '@/hooks/use-work-items';
import { fetchWorkItemsPage } from '@/services/work-items-service';

jest.mock('@/services/work-items-service', () => {
  const actual = jest.requireActual('@/services/work-items-service');
  return { ...actual, fetchWorkItemsPage: jest.fn() };
});

const fetchPageMock = fetchWorkItemsPage as jest.MockedFunction<typeof fetchWorkItemsPage>;

beforeEach(() => {
  fetchPageMock.mockReset();
});

function item(id: string): WorkItemDetail {
  return {
    id,
    title: `Việc ${id}`,
    description: null,
    type: 'Coding',
    complexity: 'M',
    deadline: null,
    status: 'Open',
    userEstimateMinutes: null,
    closedAt: null,
    createdAt: '2026-10-19T03:00:00.000Z',
    updatedAt: '2026-10-19T03:00:00.000Z',
  };
}

function page(items: WorkItemDetail[], pageNumber: number, totalCount: number): WorkItemsPage {
  return { items, page: pageNumber, pageSize: 20, totalCount };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useWorkItems', () => {
  test('does not request anything until it is enabled', async () => {
    fetchPageMock.mockResolvedValue(page([item('a')], 1, 1));

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useWorkItems({ enabled }),
      { initialProps: { enabled: false } }
    );

    expect(fetchPageMock).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.refresh();
    });
    expect(fetchPageMock).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(fetchPageMock).toHaveBeenCalledTimes(1);
  });

  test('starts from the provided filters without a second request', async () => {
    fetchPageMock.mockResolvedValue(page([item('a')], 1, 1));

    const { result } = renderHook(() =>
      useWorkItems({ initialFilters: { status: 'Open', type: null } })
    );

    await waitFor(() => expect(result.current.items).toHaveLength(1));

    expect(fetchPageMock).toHaveBeenCalledTimes(1);
    expect(fetchPageMock.mock.calls[0][1]).toEqual({ status: 'Open', type: null });
    expect(result.current.filters).toEqual({ status: 'Open', type: null });
  });

  test('aborts the initial request when the component unmounts', async () => {
    const pending = deferred<WorkItemsPage>();
    fetchPageMock.mockReturnValue(pending.promise);

    const { unmount } = renderHook(() => useWorkItems());
    await waitFor(() => expect(fetchPageMock).toHaveBeenCalledTimes(1));

    const signal = fetchPageMock.mock.calls[0][2];
    expect(signal).toBeDefined();

    unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(page([], 1, 0));
      await pending.promise;
    });
  });

  test('aborts the request started by refresh when the component unmounts', async () => {
    fetchPageMock.mockResolvedValueOnce(page([item('a')], 1, 2));

    const { result, unmount } = renderHook(() => useWorkItems());
    await waitFor(() => expect(result.current.items).toHaveLength(1));

    const pending = deferred<WorkItemsPage>();
    fetchPageMock.mockReturnValueOnce(pending.promise);

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(fetchPageMock).toHaveBeenCalledTimes(2));

    const signal = fetchPageMock.mock.calls[1][2];
    unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(page([item('a')], 1, 2));
      await pending.promise;
    });
  });

  test('ignores a second loadMore call in the same tick', async () => {
    fetchPageMock.mockResolvedValueOnce(page([item('a')], 1, 3));

    const { result } = renderHook(() => useWorkItems());
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    const pending = deferred<WorkItemsPage>();
    fetchPageMock.mockReturnValueOnce(pending.promise);

    act(() => {
      void result.current.loadMore();
      void result.current.loadMore();
    });

    expect(fetchPageMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      pending.resolve(page([item('b')], 2, 3));
      await pending.promise;
    });

    expect(result.current.items.map((entry) => entry.id)).toEqual(['a', 'b']);
  });

  test('stops paging when a page only repeats already loaded items', async () => {
    fetchPageMock.mockResolvedValueOnce(page([item('a'), item('b')], 1, 5));

    const { result } = renderHook(() => useWorkItems());
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    fetchPageMock.mockResolvedValueOnce(page([item('a'), item('b')], 2, 5));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.items).toHaveLength(2);
    expect(result.current.hasMore).toBe(false);
  });

  test('stops paging when the next page is empty', async () => {
    fetchPageMock.mockResolvedValueOnce(page([item('a')], 1, 5));

    const { result } = renderHook(() => useWorkItems());
    await waitFor(() => expect(result.current.hasMore).toBe(true));

    fetchPageMock.mockResolvedValueOnce(page([], 2, 5));

    await act(async () => {
      await result.current.loadMore();
    });

    expect(result.current.hasMore).toBe(false);
  });
});
