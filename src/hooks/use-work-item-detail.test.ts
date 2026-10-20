import { act, renderHook, waitFor } from '@testing-library/react-native';
import { AxiosError } from 'axios';

import type { WorkItemDetailWithLinks } from '@/core/api/types';
import { useWorkItemDetail } from '@/hooks/use-work-item-detail';
import { getWorkItemDetail } from '@/services/work-items-service';

jest.mock('@/services/work-items-service', () => ({
  getWorkItemDetail: jest.fn(),
}));

const getDetailMock = getWorkItemDetail as jest.MockedFunction<typeof getWorkItemDetail>;

beforeEach(() => {
  getDetailMock.mockReset();
});

function detailWithLinks(id = 'w1'): WorkItemDetailWithLinks {
  return {
    id,
    title: 'Việc chính',
    description: null,
    type: 'Coding',
    complexity: 'M',
    deadline: null,
    status: 'Open',
    userEstimateMinutes: null,
    closedAt: null,
    createdAt: '2026-10-19T03:00:00.000Z',
    updatedAt: '2026-10-19T03:00:00.000Z',
    dependsOnWorkItemIds: [],
  };
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

describe('useWorkItemDetail', () => {
  test('aborts the initial request when the component unmounts', async () => {
    const pending = deferred<WorkItemDetailWithLinks>();
    getDetailMock.mockReturnValue(pending.promise);

    const { unmount } = renderHook(() => useWorkItemDetail('w1'));
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledTimes(1));

    const signal = getDetailMock.mock.calls[0][1];
    unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(detailWithLinks());
      await pending.promise;
    });
  });

  test('aborts the request started by refresh when the component unmounts', async () => {
    getDetailMock.mockResolvedValueOnce(detailWithLinks());

    const { result, unmount } = renderHook(() => useWorkItemDetail('w1'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());

    const pending = deferred<WorkItemDetailWithLinks>();
    getDetailMock.mockReturnValueOnce(pending.promise);

    act(() => {
      void result.current.refresh();
    });
    await waitFor(() => expect(getDetailMock).toHaveBeenCalledTimes(2));

    const signal = getDetailMock.mock.calls[1][1];
    unmount();
    expect(signal?.aborted).toBe(true);

    await act(async () => {
      pending.resolve(detailWithLinks());
      await pending.promise;
    });
  });

  test('reports refresh success and failure to the caller', async () => {
    getDetailMock.mockResolvedValueOnce(detailWithLinks());

    const { result } = renderHook(() => useWorkItemDetail('w1'));
    await waitFor(() => expect(result.current.detail).not.toBeNull());

    getDetailMock.mockResolvedValueOnce(detailWithLinks());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.refresh();
    });
    expect(success).toBe(true);

    getDetailMock.mockRejectedValueOnce(new AxiosError('Server Error'));

    let failure: boolean | undefined;
    await act(async () => {
      failure = await result.current.refresh();
    });
    expect(failure).toBe(false);
    expect(result.current.error).not.toBeNull();
    expect(result.current.detail).not.toBeNull();
  });
});
