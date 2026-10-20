import type { AxiosAdapter, AxiosResponse } from 'axios';

import { apiClient } from '@/core/api/client';
import {
  addWorkItemDependency,
  changeWorkItemStatus,
  deleteWorkItem,
  getWorkItem,
  listWorkItems,
  removeWorkItemDependency,
} from '@/core/api/work-items';

type Captured = {
  method?: string;
  url?: string;
  params?: unknown;
  data?: unknown;
};

let captured: Captured[] = [];

function useAdapter(status: number, data: unknown) {
  apiClient.defaults.adapter = (async (config) => {
    captured.push({
      method: config.method,
      url: config.url,
      params: config.params,
      data: config.data,
    });
    return {
      data,
      status,
      statusText: String(status),
      headers: {},
      config,
    } as AxiosResponse;
  }) as AxiosAdapter;
}

function bodyOf(entry: Captured | undefined): unknown {
  return entry?.data ? JSON.parse(String(entry.data)) : null;
}

beforeEach(() => {
  captured = [];
  apiClient.defaults.adapter = undefined;
});

afterEach(() => {
  apiClient.defaults.adapter = undefined;
});

describe('work item API transport', () => {
  test('lists work items with query filters', async () => {
    useAdapter(200, { items: [], page: 1, pageSize: 20, totalCount: 0 });

    await listWorkItems({ page: 2, pageSize: 20, status: 'Done', type: 'Coding' });

    expect(captured[0]).toMatchObject({
      method: 'get',
      url: '/work-items',
      params: { page: 2, pageSize: 20, status: 'Done', type: 'Coding' },
    });
  });

  test('interpolates the work item id into the detail path', async () => {
    useAdapter(200, { id: 'abc', dependsOnWorkItemIds: [] });

    await getWorkItem('abc');

    expect(captured[0]).toMatchObject({ method: 'get', url: '/work-items/abc' });
  });

  test('posts a dependency with an explicit dependsOnWorkItemId body', async () => {
    useAdapter(201, { workItemId: 'abc', dependsOnWorkItemId: 'def' });

    await addWorkItemDependency('abc', 'def');

    expect(captured[0]).toMatchObject({
      method: 'post',
      url: '/work-items/abc/dependencies',
    });
    expect(bodyOf(captured[0])).toEqual({ dependsOnWorkItemId: 'def' });
  });

  test('deletes a dependency by both ids', async () => {
    useAdapter(204, undefined);

    await removeWorkItemDependency('abc', 'def');

    expect(captured[0]).toMatchObject({
      method: 'delete',
      url: '/work-items/abc/dependencies/def',
    });
  });

  test('changes status with PATCH', async () => {
    useAdapter(200, { id: 'abc', status: 'Done' });

    await changeWorkItemStatus('abc', 'Done');

    expect(captured[0]).toMatchObject({ method: 'patch', url: '/work-items/abc/status' });
    expect(bodyOf(captured[0])).toEqual({ status: 'Done' });
  });

  test('deletes a work item', async () => {
    useAdapter(204, undefined);

    await deleteWorkItem('abc');

    expect(captured[0]).toMatchObject({ method: 'delete', url: '/work-items/abc' });
  });
});
