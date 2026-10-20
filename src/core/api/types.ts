import type { components } from '@/core/api/generated/schema';

export type TokenPair = components['schemas']['TokenPair'];
export type UserProfile = components['schemas']['UserProfile'];
export type LoginRequest = components['schemas']['LoginRequest'];
export type RegisterRequest = components['schemas']['RegisterRequest'];
export type RefreshRequest = components['schemas']['RefreshRequest'];

export type WorkItem = components['schemas']['WorkItemDetail'];
export type WorkItemDetail = components['schemas']['WorkItemDetail'];
export type WorkItemDetailWithLinks = components['schemas']['WorkItemDetailWithLinks'];
export type WorkItemsPage = components['schemas']['PagedResultOfWorkItemDetail'];
export type CreateWorkItemRequest = components['schemas']['CreateWorkItemRequest'];
export type UpdateWorkItemRequest = components['schemas']['UpdateWorkItemRequest'];
export type ChangeStatusRequest = components['schemas']['ChangeStatusRequest'];
export type AddDependencyRequest = components['schemas']['AddDependencyRequest'];
export type DependencyDetail = components['schemas']['DependencyDetail'];

export type WorkItemStatus = WorkItemDetail['status'];
export type WorkItemType = WorkItemDetail['type'];
export type WorkItemComplexity = WorkItemDetail['complexity'];

export type SessionDetail = components['schemas']['SessionDetail'];
export type StartSessionRequest = components['schemas']['StartSessionRequest'];
export type EndSessionRequest = components['schemas']['EndSessionRequest'];
export type SessionEventInput = components['schemas']['SessionEventInput'];
export type RecordSessionEventsRequest = components['schemas']['RecordSessionEventsRequest'];
export type RecordedEvents = components['schemas']['RecordedEvents'];
