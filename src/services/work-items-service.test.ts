import { listWorkItems } from '@/core/api/work-items';
import type { WorkItemDetail, WorkItemsPage } from '@/core/api/types';
import {
  fetchWorkItemsPage,
  loadAllWorkItems,
  mergeWorkItems,
} from '@/services/work-items-service';

jest.mock('@/core/api/work-items', () => ({
  listWorkItems: jest.fn(),
}));

const listWorkItemsMock = listWorkItems as jest.MockedFunction<typeof listWorkItems>;

beforeEach(() => {
  listWorkItemsMock.mockReset();
});

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
});
