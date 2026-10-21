import { isAxiosError } from 'axios';

export type SessionAction = 'start' | 'end' | 'current' | 'detail' | 'events';

export type SessionErrorCode =
  | 'validation'
  | 'notFound'
  | 'workItemNotOpen'
  | 'activeSessionExists'
  | 'conflict'
  | 'unauthorized'
  | 'rateLimited'
  | 'network'
  | 'server'
  | 'unknown';

export type SessionError = {
  code: SessionErrorCode;
  message: string;
  status?: number;
  sessionId?: string;
};

export class SessionClientError extends Error implements SessionError {
  readonly code: SessionErrorCode;
  readonly status?: number;
  readonly sessionId?: string;

  constructor(error: SessionError) {
    super(error.message);
    this.name = 'SessionClientError';
    this.code = error.code;
    this.status = error.status;
    this.sessionId = error.sessionId;
  }
}

export function isSessionError(error: unknown): error is SessionError {
  return error instanceof SessionClientError;
}

// 409 /sessions/start has two shapes at the root of the body:
//   { error: "Work item is not open." }
//   { error: "An active session already exists.", sessionId: "<guid>" }
// The presence of `sessionId` (not the English message) distinguishes them.
export function readConflictSessionId(data: unknown): string | null {
  if (!data || typeof data !== 'object' || !('sessionId' in data)) {
    return null;
  }
  const sessionId = (data as { sessionId?: unknown }).sessionId;
  return typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : null;
}

export function toSessionError(error: unknown, action: SessionAction): SessionError {
  if (isSessionError(error)) {
    return error;
  }

  if (!isAxiosError(error)) {
    return {
      code: 'unknown',
      message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    };
  }

  const status = error.response?.status;
  if (!error.response) {
    return {
      code: 'network',
      message: 'Không kết nối được máy chủ. Vui lòng thử lại.',
    };
  }

  if (status === 400) {
    return {
      code: 'validation',
      status,
      message: 'Thông tin phiên chưa hợp lệ. Vui lòng kiểm tra lại thời lượng.',
    };
  }

  if (status === 401) {
    return {
      code: 'unauthorized',
      status,
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    };
  }

  if (status === 404) {
    return {
      code: 'notFound',
      status,
      message:
        action === 'start'
          ? 'Không tìm thấy công việc hoặc công việc không thuộc tài khoản của bạn.'
          : 'Không tìm thấy phiên làm việc hoặc phiên không thuộc tài khoản của bạn.',
    };
  }

  if (status === 409) {
    if (action === 'start') {
      const sessionId = readConflictSessionId(error.response.data);
      if (sessionId) {
        return {
          code: 'activeSessionExists',
          status,
          sessionId,
          message: 'Bạn đang có một phiên tập trung chưa kết thúc.',
        };
      }
      return {
        code: 'workItemNotOpen',
        status,
        message: 'Chỉ có thể bắt đầu phiên cho công việc đang mở.',
      };
    }
    if (action === 'events') {
      return {
        code: 'conflict',
        status,
        message: 'Phiên đã kết thúc nên sự kiện không được ghi.',
      };
    }
    return {
      code: 'conflict',
      status,
      message: 'Phiên làm việc đã thay đổi. Vui lòng tải lại và thử lại.',
    };
  }

  if (status === 429) {
    return {
      code: 'rateLimited',
      status,
      message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.',
    };
  }

  if (status !== undefined && status >= 500) {
    return {
      code: 'server',
      status,
      message: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
    };
  }

  return {
    code: 'unknown',
    status,
    message: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
  };
}

export function isAbortedSessionRequest(error: unknown): boolean {
  return (
    isAxiosError(error) && (error.code === 'ERR_CANCELED' || error.name === 'CanceledError')
  );
}
