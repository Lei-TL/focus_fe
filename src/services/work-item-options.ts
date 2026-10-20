import type { WorkItemComplexity, WorkItemStatus, WorkItemType } from '@/core/api/types';

type Option<T extends string> = { value: T; label: string };

export const workItemTypeOptions = [
  { value: 'Analysis', label: 'Phân tích' },
  { value: 'Design', label: 'Thiết kế' },
  { value: 'Coding', label: 'Lập trình' },
  { value: 'Testing', label: 'Kiểm thử' },
  { value: 'Debugging', label: 'Gỡ lỗi' },
  { value: 'CodeReview', label: 'Review mã' },
  { value: 'Refactor', label: 'Tái cấu trúc' },
  { value: 'Documentation', label: 'Tài liệu' },
  { value: 'Learning', label: 'Học tập' },
] as const satisfies readonly Option<WorkItemType>[];

export const workItemStatusOptions = [
  { value: 'Open', label: 'Đang mở' },
  { value: 'Done', label: 'Đã xong' },
  { value: 'Archived', label: 'Đã lưu trữ' },
] as const satisfies readonly Option<WorkItemStatus>[];

export const workItemComplexityOptions = [
  { value: 'S', label: 'S' },
  { value: 'M', label: 'M' },
  { value: 'L', label: 'L' },
  { value: 'XL', label: 'XL' },
] as const satisfies readonly Option<WorkItemComplexity>[];

export function workItemTypeLabel(value: WorkItemType): string {
  return workItemTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function workItemStatusLabel(value: WorkItemStatus): string {
  return workItemStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function isWorkItemType(value: string): value is WorkItemType {
  return workItemTypeOptions.some((option) => option.value === value);
}

export function isWorkItemComplexity(value: string): value is WorkItemComplexity {
  return workItemComplexityOptions.some((option) => option.value === value);
}
