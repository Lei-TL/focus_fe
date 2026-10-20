import { request } from '@/core/api/request';
import type {
  AddDependencyRequest,
  ChangeStatusRequest,
  CreateWorkItemRequest,
  DependencyDetail,
  UpdateWorkItemRequest,
  WorkItemDetail,
  WorkItemDetailWithLinks,
  WorkItemStatus,
  WorkItemType,
  WorkItemsPage,
} from '@/core/api/types';

export type ListWorkItemsQuery = {
  status?: WorkItemStatus | null;
  type?: WorkItemType | null;
  page?: number;
  pageSize?: number;
};

export async function listWorkItems(
  query: ListWorkItemsQuery,
  signal?: AbortSignal
): Promise<WorkItemsPage> {
  return request('get', '/work-items', { query, signal });
}

export async function createWorkItem(
  body: CreateWorkItemRequest,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  return request('post', '/work-items', { body, signal });
}

export async function getWorkItem(
  id: string,
  signal?: AbortSignal
): Promise<WorkItemDetailWithLinks> {
  return request('get', '/work-items/{id}', { pathParams: { id }, signal });
}

export async function updateWorkItem(
  id: string,
  body: UpdateWorkItemRequest,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  return request('put', '/work-items/{id}', { pathParams: { id }, body, signal });
}

export async function changeWorkItemStatus(
  id: string,
  status: WorkItemStatus,
  signal?: AbortSignal
): Promise<WorkItemDetail> {
  const body: ChangeStatusRequest = { status };
  return request('patch', '/work-items/{id}/status', { pathParams: { id }, body, signal });
}

export async function deleteWorkItem(id: string, signal?: AbortSignal): Promise<void> {
  return request('delete', '/work-items/{id}', { pathParams: { id }, signal });
}

export async function addWorkItemDependency(
  id: string,
  dependsOnWorkItemId: string,
  signal?: AbortSignal
): Promise<DependencyDetail> {
  const body: AddDependencyRequest = { dependsOnWorkItemId };
  return request('post', '/work-items/{id}/dependencies', {
    pathParams: { id },
    body,
    signal,
  });
}

export async function removeWorkItemDependency(
  id: string,
  dependsOnWorkItemId: string,
  signal?: AbortSignal
): Promise<void> {
  return request('delete', '/work-items/{id}/dependencies/{dependsOnWorkItemId}', {
    pathParams: { id, dependsOnWorkItemId },
    signal,
  });
}
