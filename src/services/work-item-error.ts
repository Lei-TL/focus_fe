import { isAxiosError } from 'axios';

import type { WorkItemFormErrors } from '@/services/work-item-form';

export type WorkItemAction =
  | 'list'
  | 'detail'
  | 'create'
  | 'update'
  | 'status'
  | 'delete'
  | 'addDependency'
  | 'removeDependency';

export type WorkItemErrorCode =
  | 'validation'
  | 'notFound'
  | 'hasSessions'
  | 'dependencySelfOrCycle'
  | 'dependencyDuplicate'
  | 'conflict'
  | 'unauthorized'
  | 'rateLimited'
  | 'network'
  | 'server'
  | 'unknown';

export type WorkItemError = {
  code: WorkItemErrorCode;
  message: string;
  status?: number;
  fieldErrors: WorkItemFormErrors;
};

const KNOWN_FIELDS: Record<string, keyof WorkItemFormErrors> = {
  title: 'title',
  description: 'description',
  type: 'type',
  complexity: 'complexity',
  deadline: 'deadline',
  userestimateminutes: 'userEstimateMinutes',
};

export class WorkItemClientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkItemClientError';
  }
}

function normalizeFieldKey(key: string): keyof WorkItemFormErrors | null {
  const segment = key.split('.').pop() ?? key;
  const withoutIndex = segment.replace(/\[\d+\]/g, '');
  const normalized = withoutIndex.toLowerCase();
  return KNOWN_FIELDS[normalized] ?? null;
}

function readValidationErrors(data: unknown): WorkItemFormErrors {
  const fieldErrors: WorkItemFormErrors = {};
  if (!data || typeof data !== 'object' || !('errors' in data)) {
    return fieldErrors;
  }

  const rawErrors = (data as { errors?: unknown }).errors;
  if (!rawErrors || typeof rawErrors !== 'object') {
    return fieldErrors;
  }

  for (const [key, value] of Object.entries(rawErrors)) {
    const field = normalizeFieldKey(key);
    if (!field) {
      continue;
    }
    const message = Array.isArray(value)
      ? value.find((entry): entry is string => typeof entry === 'string')
      : typeof value === 'string'
        ? value
        : null;
    if (message) {
      fieldErrors[field] = message;
    }
  }

  return fieldErrors;
}

export function isAbortedRequest(error: unknown): boolean {
  return (
    isAxiosError(error) &&
    (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')
  );
}

export function toWorkItemError(error: unknown, action: WorkItemAction): WorkItemError {
  if (error instanceof WorkItemClientError) {
    return {
      code: 'unknown',
      message: error.message,
      fieldErrors: {},
    };
  }

  if (!isAxiosError(error)) {
    return {
      code: 'unknown',
      message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
      fieldErrors: {},
    };
  }

  const status = error.response?.status;
  if (!error.response) {
    return {
      code: 'network',
      message: 'Không kết nối được máy chủ. Vui lòng thử lại.',
      fieldErrors: {},
    };
  }

  if (status === 400) {
    if (action === 'addDependency') {
      return {
        code: 'dependencySelfOrCycle',
        status,
        message: 'Không thể thêm phụ thuộc: công việc không được tự phụ thuộc hoặc tạo vòng lặp.',
        fieldErrors: {},
      };
    }
    const fieldErrors = readValidationErrors(error.response.data);
    return {
      code: 'validation',
      status,
      message:
        Object.keys(fieldErrors).length > 0
          ? 'Vui lòng kiểm tra lại các trường được đánh dấu.'
          : 'Thông tin công việc chưa hợp lệ. Vui lòng kiểm tra lại.',
      fieldErrors,
    };
  }

  if (status === 401) {
    return {
      code: 'unauthorized',
      status,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      fieldErrors: {},
    };
  }

  if (status === 404) {
    return {
      code: 'notFound',
      status,
      message: 'Không tìm thấy công việc hoặc công việc không thuộc tài khoản của bạn.',
      fieldErrors: {},
    };
  }

  if (status === 409) {
    if (action === 'delete') {
      return {
        code: 'hasSessions',
        status,
        message: 'Công việc đã có phiên làm việc nên không thể xóa.',
        fieldErrors: {},
      };
    }
    if (action === 'addDependency') {
      return {
        code: 'dependencyDuplicate',
        status,
        message: 'Phụ thuộc này đã tồn tại.',
        fieldErrors: {},
      };
    }
    return {
      code: 'conflict',
      status,
      message: 'Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại.',
      fieldErrors: {},
    };
  }

  if (status === 429) {
    return {
      code: 'rateLimited',
      status,
      message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
      fieldErrors: {},
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      code: 'server',
      status,
      message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
      fieldErrors: {},
    };
  }

  return {
    code: 'unknown',
    status,
    message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    fieldErrors: {},
  };
}
