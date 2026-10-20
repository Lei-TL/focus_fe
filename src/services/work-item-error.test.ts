import type { InternalAxiosRequestConfig } from 'axios';
import { AxiosError } from 'axios';

import { toWorkItemError } from '@/services/work-item-error';

function httpError(status: number, data?: unknown): AxiosError {
  const config = { headers: {} } as InternalAxiosRequestConfig;
  return new AxiosError('Request failed', String(status), config, undefined, {
    status,
    statusText: String(status),
    headers: {},
    config,
    data,
  });
}

describe('toWorkItemError', () => {
  test('maps 400 validation errors by C# property name, case-insensitively', () => {
    const error = toWorkItemError(
      httpError(400, {
        title: 'One or more validation errors occurred.',
        errors: {
          Title: ['Tiêu đề là bắt buộc.'],
          UserEstimateMinutes: ['Ước lượng phải lớn hơn 0.'],
          UnknownField: ['ignored'],
        },
      }),
      'create'
    );

    expect(error.code).toBe('validation');
    expect(error.status).toBe(400);
    expect(error.fieldErrors).toEqual({
      title: 'Tiêu đề là bắt buộc.',
      userEstimateMinutes: 'Ước lượng phải lớn hơn 0.',
    });
    expect(error.message).toMatch(/đánh dấu/);
  });

  test('maps uppercase field keys case-insensitively', () => {
    const error = toWorkItemError(
      httpError(400, {
        errors: {
          TITLE: ['Tiêu đề là bắt buộc.'],
          USERESTIMATEMINUTES: ['Ước lượng phải lớn hơn 0.'],
        },
      }),
      'update'
    );

    expect(error.fieldErrors).toEqual({
      title: 'Tiêu đề là bắt buộc.',
      userEstimateMinutes: 'Ước lượng phải lớn hơn 0.',
    });
  });

  test('maps 400 without field errors to a generic validation message', () => {
    const error = toWorkItemError(httpError(400, { error: 'bad request' }), 'update');

    expect(error.code).toBe('validation');
    expect(error.fieldErrors).toEqual({});
    expect(error.message).toMatch(/chưa hợp lệ/);
  });

  test('maps 400 when adding a dependency to self/cycle', () => {
    const error = toWorkItemError(httpError(400), 'addDependency');

    expect(error.code).toBe('dependencySelfOrCycle');
    expect(error.message).toMatch(/vòng lặp/);
  });

  test('maps 404 to not found', () => {
    const error = toWorkItemError(httpError(404), 'detail');

    expect(error.code).toBe('notFound');
    expect(error.message).toMatch(/Không tìm thấy/);
  });

  test('maps 409 when deleting a work item with sessions', () => {
    const error = toWorkItemError(httpError(409), 'delete');

    expect(error.code).toBe('hasSessions');
    expect(error.message).toMatch(/đã có phiên làm việc/);
  });

  test('maps 409 when adding a duplicate dependency', () => {
    const error = toWorkItemError(httpError(409), 'addDependency');

    expect(error.code).toBe('dependencyDuplicate');
    expect(error.message).toMatch(/đã tồn tại/);
  });

  test('maps 429 to a retry-later message', () => {
    const error = toWorkItemError(httpError(429), 'list');

    expect(error.code).toBe('rateLimited');
    expect(error.message).toMatch(/thử lại sau/);
  });

  test('maps a network failure without a response', () => {
    const error = toWorkItemError(new AxiosError('Network Error'), 'list');

    expect(error.code).toBe('network');
    expect(error.message).toMatch(/Không kết nối/);
  });
});
