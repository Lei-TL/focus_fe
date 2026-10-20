import { AxiosError } from 'axios';

import { getWorkItem, listWorkItems } from '@/core/api/work-items';
import type {
  WorkItemDetail,
  WorkItemDetailWithLinks,
  WorkItemsPage,
} from '@/core/api/types';
import {
  DEPENDENCY_DETAIL_BATCH_SIZE,
  DEPENDENCY_PICKER_MAX_PAGES,
  fetchWorkItemsPage,
  getDependencyItems,
  loadAllWorkItems,
  mergeWorkItems,
} from '@/services/work-items-service';

jest.mock('@/core/api/work-items', () => ({
  getWorkItem: jest.fn(),
  listWorkItems: jest.fn(),
}));

const listWorkItemsMock = listWorkItems as jest.MockedFunction<typeof listWorkItems>;
const getWorkItemMock = getWorkItem as jest.MockedFunction<typeof getWorkItem>;

beforeEach(() => {
  listWorkItemsMock.mockReset();
  getWorkItemMock.mockReset();
});

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function item(id: string, overrides: Partial<WorkItemDetail> = {}): WorkItemDetail {
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
    ...overrides,
  };
}

function page(items: WorkItemDetail[], pageNumber: number, totalCount: number): WorkItemsPage {
  return { items, page: pageNumber, pageSize: 2, totalCount };
}

describe('mergeWorkItems', () => {
  test('appends new pages without duplicating existing ids', () => {
    const merged = mergeWorkItems([item('a'), item('b')], [item('b'), item('c')]);

    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  test('keeps the existing object when a duplicate id arrives', () => {
    const original = item('a', { title: 'Bản gốc' });
    const merged = mergeWorkItems([original], [item('a', { title: 'Bản mới' })]);

    expect(merged).toHaveLength(1);
    expect(merged[0].title).toBe('Bản gốc');
  });
});

describe('fetchWorkItemsPage', () => {
  test('passes pagination and AND filters to the API', async () => {
    listWorkItemsMock.mockResolvedValue(page([item('a')], 2, 5));

    await fetchWorkItemsPage(2, { status: 'Done', type: 'Coding' });

    expect(listWorkItemsMock).toHaveBeenCalledWith(
      { page: 2, pageSize: 20, status: 'Done', type: 'Coding' },
      undefined
    );
  });
});

describe('loadAllWorkItems', () => {
  test('loads every page and merges overlapping items without duplicates', async () => {
    listWorkItemsMock
      .mockResolvedValueOnce(page([item('a'), item('b')], 1, 3))
      .mockResolvedValueOnce(page([item('b'), item('c')], 2, 3));

    const items = await loadAllWorkItems();

    expect(items.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(listWorkItemsMock).toHaveBeenCalledTimes(2);
    expect(listWorkItemsMock).toHaveBeenNthCalledWith(
      1,
      { page: 1, pageSize: 100 },
      undefined
    );
    expect(listWorkItemsMock).toHaveBeenNthCalledWith(
      2,
      { page: 2, pageSize: 100 },
      undefined
    );
  });

  test('stops when a page is empty', async () => {
    listWorkItemsMock.mockResolvedValueOnce(page([], 1, 10));

    const items = await loadAllWorkItems();

    expect(items).toEqual([]);
    expect(listWorkItemsMock).toHaveBeenCalledTimes(1);
  });

  test('reports instead of stopping silently when the page limit is reached', async () => {
    listWorkItemsMock.mockImplementation(async ({ page: pageNumber = 1 }) =>
      page([item(`w${pageNumber}`)], pageNumber, 10_000)
    );

    await expect(loadAllWorkItems()).rejects.toThrow(/vượt quá/);
    expect(listWorkItemsMock).toHaveBeenCalledTimes(DEPENDENCY_PICKER_MAX_PAGES);
  });
});

describe('getDependencyItems', () => {
  test('maps a missing dependency detail to null', async () => {
    getWorkItemMock
      .mockResolvedValueOnce(
        item('a') as unknown as WorkItemDetailWithLinks
      )
      .mockRejectedValueOnce(new AxiosError('Not Found'));

    const result = await getDependencyItems(['a', 'b']);

    expect(result).toEqual({ a: expect.objectContaining({ id: 'a' }), b: null });
  });

  test('rethrows an aborted request', async () => {
    getWorkItemMock.mockRejectedValue(new AxiosError('canceled', 'ERR_CANCELED'));

    await expect(getDependencyItems(['a'])).rejects.toMatchObject({ code: 'ERR_CANCELED' });
  });

  test('limits dependency detail requests to a fixed batch size', async () => {
    let active = 0;
    let maxActive = 0;
    const pending: (() => void)[] = [];

    getWorkItemMock.mockImplementation(
      (id) =>
        new Promise((resolve) => {
          active += 1;
          maxActive = Math.max(maxActive, active);
          pending.push(() => {
            active -= 1;
            resolve(item(id) as unknown as WorkItemDetailWithLinks);
          });
        })
    );

    const ids = Array.from({ length: 12 }, (_, index) => `w${index}`);
    const loading = getDependencyItems(ids);

    expect(getWorkItemMock).toHaveBeenCalledTimes(DEPENDENCY_DETAIL_BATCH_SIZE);
    expect(pending).toHaveLength(DEPENDENCY_DETAIL_BATCH_SIZE);

    while (pending.length > 0) {
      const batch = pending.splice(0, DEPENDENCY_DETAIL_BATCH_SIZE);
      batch.forEach((resolve) => resolve());
      await flush();
    }

    const result = await loading;

    expect(Object.keys(result)).toHaveLength(12);
    expect(maxActive).toBeLessThanOrEqual(DEPENDENCY_DETAIL_BATCH_SIZE);
    expect(getWorkItemMock).toHaveBeenCalledTimes(12);
  });
});
