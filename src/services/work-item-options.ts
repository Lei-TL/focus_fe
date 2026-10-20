import type { WorkItemComplexity, WorkItemStatus, WorkItemType } from '@/core/api/types';

export const WORK_ITEM_TYPE_LABELS: Record<WorkItemType, string> = {
  Analysis: 'Phân tích',
  Design: 'Thiết kế',
  Coding: 'Lập trình',
  Testing: 'Kiểm thử',
  Debugging: 'Gỡ lỗi',
  CodeReview: 'Review mã',
  Refactor: 'Tái cấu trúc',
  Documentation: 'Tài liệu',
  Learning: 'Học tập',
};

export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  Open: 'Đang mở',
  Done: 'Đã xong',
  Archived: 'Đã lưu trữ',
};

export const WORK_ITEM_COMPLEXITY_LABELS: Record<WorkItemComplexity, string> = {
  S: 'S',
  M: 'M',
  L: 'L',
  XL: 'XL',
};

function toOptions<T extends string>(labels: Record<T, string>): { value: T; label: string }[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const workItemTypeOptions = toOptions(WORK_ITEM_TYPE_LABELS);
export const workItemStatusOptions = toOptions(WORK_ITEM_STATUS_LABELS);
export const workItemComplexityOptions = toOptions(WORK_ITEM_COMPLEXITY_LABELS);

export function workItemTypeLabel(value: WorkItemType): string {
  return WORK_ITEM_TYPE_LABELS[value] ?? value;
}

export function workItemStatusLabel(value: WorkItemStatus): string {
  return WORK_ITEM_STATUS_LABELS[value] ?? value;
}

export function isWorkItemType(value: string): value is WorkItemType {
  return Object.prototype.hasOwnProperty.call(WORK_ITEM_TYPE_LABELS, value);
}

export function isWorkItemComplexity(value: string): value is WorkItemComplexity {
  return Object.prototype.hasOwnProperty.call(WORK_ITEM_COMPLEXITY_LABELS, value);
}
