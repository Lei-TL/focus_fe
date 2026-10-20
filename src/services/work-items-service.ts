import * as workItemsApi from '@/core/api/work-items';
import type {
  CreateWorkItemRequest,
  DependencyDetail,
  UpdateWorkItemRequest,
  WorkItemDetail,
  WorkItemDetailWithLinks,
  WorkItemStatus,
  WorkItemType,
  WorkItemsPage,
} from '@/core/api/types';
import { WorkItemClientError, isAbortedRequest } from '@/services/work-item-error';

export const WORK_ITEMS_PAGE_SIZE = 20;
export const DEPENDENCY_PICKER_PAGE_SIZE = 100;
export const DEPENDENCY_PICKER_MAX_PAGES = 50;
export const DEPENDENCY_DETAIL_BATCH_SIZE = 5;

export type WorkItemFilters = {
  status: WorkItemStatus | null;
  type: WorkItemType | null;
};

export function emptyWorkItemFilters(): WorkItemFilters {
  return { status: null, type: null };
}

export function mergeWorkItems(
  existing: WorkItemDetail[],
  incoming: WorkItemDetail[]
): WorkItemDetail[] {
  const seen = new Set(existing.map((item) => item.id));
  const merged = [...existing];
  for (const item of incoming) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged;
}

export async function fetchWorkItemsPage(
  page: number,
  filters: WorkItemFilters,
  signal?: AbortSignal
): Promise<WorkItemsPage> {
  return workItemsApi.listWorkItems(
    {
      page,
      pageSize: WORK_ITEMS_PAGE_SIZE,
      status: filters.status,
      type: filters.type,
    },
    signal
  );
}

export async function loadAllWorkItems(signal?: AbortSignal): Promise<WorkItemDetail[]> {
  let items: WorkItemDetail[] = [];
  let totalCount = 0;

  for (let page = 1; page <= DEPENDENCY_PICKER_MAX_PAGES; page += 1) {
    const result = await workItemsApi.listWorkItems(
      { page, pageSize: DEPENDENCY_PICKER_PAGE_SIZE },
      signal
    );
    items = mergeWorkItems(items, result.items);
    totalCount = result.totalCount;
    if (result.items.length === 0 || items.length >= totalCount) {
      return items;
    }
  }

  throw new WorkItemClientError(
    `Danh sách công việc vượt quá ${DEPENDENCY_PICKER_MAX_PAGES} trang nên chưa tải hết. Vui lòng thử lại sau.`
  );
}

export async function getWorkItemDetail(
  id: string,
  signal?: AbortSignal
): Promise<WorkItemDetailWithLinks> {
  return workItemsApi.getWorkItem(id, signal);
}

export async function getDependencyItems(
  ids: string[],
  signal?: AbortSignal
): Promise<Record<string, WorkItemDetail | null>> {
  const entries: (readonly [string, WorkItemDetail | null])[] = [];

  for (let start = 0; start < ids.length; start += DEPENDENCY_DETAIL_BATCH_SIZE) {
    const batch = ids.slice(start, start + DEPENDENCY_DETAIL_BATCH_SIZE);
    const batchEntries = await Promise.all(
      batch.map(async (id) => {
        try {
          const item = await workItemsApi.getWorkItem(id, signal);
          return [id, item] as const;
        } catch (error) {
          if (isAbortedRequest(error)) {
            throw error;
          }
          return [id, null] as const;
        }
      })
    );
    entries.push(...batchEntries);
  }

  return Object.fromEntries(entries);
}

export async function createWorkItem(
  request: CreateWorkItemRequest,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  return workItemsApi.createWorkItem(request, signal);
}

export async function updateWorkItem(
  id: string,
  request: UpdateWorkItemRequest,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  return workItemsApi.updateWorkItem(id, request, signal);
}

export async function changeWorkItemStatus(
  id: string,
  status: WorkItemStatus,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  return workItemsApi.changeWorkItemStatus(id, status, signal);
}

export async function deleteWorkItem(id: string, signal?: AbortSignal): Promise<void> {
  return workItemsApi.deleteWorkItem(id, signal);
}

export async function addWorkItemDependency(
  id: string,
  dependsOnWorkItemId: string,
  signal?: AbortSignal
): Promise<DependencyDetail> {
  return workItemsApi.addWorkItemDependency(id, dependsOnWorkItemId, signal);
}

export async function removeWorkItemDependency(
  id: string,
  dependsOnWorkItemId: string,
  signal?: AbortSignal
): Promise<void> {
  return workItemsApi.removeWorkItemDependency(id, dependsOnWorkItemId, signal);
}
