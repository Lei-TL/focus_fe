import type {
  CreateWorkItemRequest,
  WorkItemComplexity,
  WorkItemDetail,
  WorkItemType,
} from '@/core/api/types';
import { isWorkItemComplexity, isWorkItemType } from '@/services/work-item-options';

export const WORK_ITEM_TITLE_MAX_LENGTH = 200;
export const WORK_ITEM_DESCRIPTION_MAX_LENGTH = 5000;
const INT32_MAX = 2_147_483_647;

export type WorkItemFormMode = 'create' | 'update';

export type WorkItemFormValues = {
  title: string;
  description: string;
  type: WorkItemType;
  complexity: WorkItemComplexity;
  deadline: string;
  deadlineOriginal: string | null;
  userEstimateMinutes: string;
};

export type WorkItemFormField =
  | 'title'
  | 'description'
  | 'type'
  | 'complexity'
  | 'deadline'
  | 'userEstimateMinutes';

export type WorkItemFormErrors = Partial<Record<WorkItemFormField, string>>;

export type WorkItemFormValidation =
  | { request: CreateWorkItemRequest; errors: WorkItemFormErrors }
  | { request: null; errors: WorkItemFormErrors };

const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;
const OFFSET_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseLocalDate(
  year: string,
  month: string,
  day: string,
  hour = '0',
  minute = '0',
  second = '0'
): Date | null {
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    0
  );
  const valid =
    date.getFullYear() === Number(year) &&
    date.getMonth() === Number(month) - 1 &&
    date.getDate() === Number(day) &&
    date.getHours() === Number(hour) &&
    date.getMinutes() === Number(minute) &&
    date.getSeconds() === Number(second);
  return valid ? date : null;
}

export function normalizeDeadline(input: string): { value: string | null; error?: string } {
  const trimmed = input.trim();
  if (!trimmed) {
    return { value: null };
  }

  const dateOnly = DATE_ONLY_PATTERN.exec(trimmed);
  if (dateOnly) {
    const date = parseLocalDate(dateOnly[1], dateOnly[2], dateOnly[3]);
    return date
      ? { value: date.toISOString() }
      : { value: null, error: 'Hạn chót không hợp lệ.' };
  }

  const local = LOCAL_DATE_TIME_PATTERN.exec(trimmed);
  if (local) {
    const date = parseLocalDate(local[1], local[2], local[3], local[4], local[5], local[6]);
    return date
      ? { value: date.toISOString() }
      : { value: null, error: 'Hạn chót không hợp lệ.' };
  }

  if (!OFFSET_DATE_TIME_PATTERN.test(trimmed)) {
    return {
      value: null,
      error: 'Hạn chót phải theo ISO 8601, ví dụ 2026-10-31T18:00 hoặc 2026-10-31T18:00:00+07:00.',
    };
  }

  const date = new Date(trimmed);
  return Number.isNaN(date.getTime())
    ? { value: null, error: 'Hạn chót không hợp lệ.' }
    : { value: date.toISOString() };
}

export function emptyWorkItemFormValues(): WorkItemFormValues {
  return {
    title: '',
    description: '',
    type: 'Coding',
    complexity: 'M',
    deadline: '',
    deadlineOriginal: null,
    userEstimateMinutes: '',
  };
}

export function workItemFormValuesFromDetail(item: WorkItemDetail): WorkItemFormValues {
  return {
    title: item.title,
    description: item.description ?? '',
    type: item.type,
    complexity: item.complexity,
    deadline: deadlineInputFromIso(item.deadline),
    deadlineOriginal: item.deadline,
    userEstimateMinutes:
      item.userEstimateMinutes === null ? '' : String(item.userEstimateMinutes),
  };
}

export function deadlineInputFromIso(iso: string | null): string {
  if (!iso) {
    return '';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function validateWorkItemForm(
  values: WorkItemFormValues,
  mode: WorkItemFormMode = 'create'
): WorkItemFormValidation {
  const errors: WorkItemFormErrors = {};
  const title = values.title.trim();

  if (!title) {
    errors.title = 'Vui lòng nhập tiêu đề.';
  } else if (title.length > WORK_ITEM_TITLE_MAX_LENGTH) {
    errors.title = `Tiêu đề tối đa ${WORK_ITEM_TITLE_MAX_LENGTH} ký tự.`;
  }

  const description = values.description.trim();
  if (description.length > WORK_ITEM_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Mô tả tối đa ${WORK_ITEM_DESCRIPTION_MAX_LENGTH} ký tự.`;
  }

  if (!isWorkItemType(values.type)) {
    errors.type = 'Loại công việc không hợp lệ.';
  }

  if (!isWorkItemComplexity(values.complexity)) {
    errors.complexity = 'Độ phức tạp không hợp lệ.';
  }

  const deadline = normalizeDeadline(values.deadline);
  let deadlineValue = deadline.value;
  const deadlineUnchanged =
    values.deadlineOriginal !== null &&
    values.deadline.trim() === deadlineInputFromIso(values.deadlineOriginal);

  if (deadlineUnchanged) {
    deadlineValue = values.deadlineOriginal;
  } else if (deadline.error) {
    errors.deadline = deadline.error;
  } else if (
    mode === 'create' &&
    deadlineValue !== null &&
    Date.parse(deadlineValue) <= Date.now()
  ) {
    errors.deadline = 'Hạn chót phải sau thời điểm hiện tại.';
  }

  let userEstimateMinutes: number | null = null;
  const estimate = values.userEstimateMinutes.trim();
  if (estimate) {
    if (!/^\d+$/.test(estimate)) {
      errors.userEstimateMinutes = 'Ước lượng phải là số phút nguyên dương.';
    } else {
      const parsed = Number(estimate);
      if (parsed <= 0 || !Number.isSafeInteger(parsed) || parsed > INT32_MAX) {
        errors.userEstimateMinutes = 'Ước lượng phải là số phút nguyên dương.';
      } else {
        userEstimateMinutes = parsed;
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    return { request: null, errors };
  }

  return {
    request: {
      title,
      description: description || null,
      type: values.type,
      complexity: values.complexity,
      deadline: deadlineValue,
      userEstimateMinutes,
    },
    errors,
  };
}
