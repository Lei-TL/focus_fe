import type { WorkItemDetail } from '@/core/api/types';
import {
  deadlineInputFromIso,
  emptyWorkItemFormValues,
  normalizeDeadline,
  validateWorkItemForm,
  workItemFormValuesFromDetail,
} from '@/services/work-item-form';
import {
  WORK_ITEM_COMPLEXITY_LABELS,
  WORK_ITEM_STATUS_LABELS,
  WORK_ITEM_TYPE_LABELS,
  workItemComplexityOptions,
  workItemStatusLabel,
  workItemStatusOptions,
  workItemTypeLabel,
  workItemTypeOptions,
} from '@/services/work-item-options';

function detail(overrides: Partial<WorkItemDetail> = {}): WorkItemDetail {
  return {
    id: 'w1',
    title: 'Việc A',
    description: 'Mô tả',
    type: 'Coding',
    complexity: 'M',
    deadline: null,
    status: 'Open',
    userEstimateMinutes: 30,
    closedAt: null,
    createdAt: '2026-10-19T03:00:00.000Z',
    updatedAt: '2026-10-19T03:00:00.000Z',
    ...overrides,
  };
}

describe('work item enums', () => {
  test('options match the generated API enum values', () => {
    expect(workItemTypeOptions.map((option) => option.value)).toEqual([
      'Analysis',
      'Design',
      'Coding',
      'Testing',
      'Debugging',
      'CodeReview',
      'Refactor',
      'Documentation',
      'Learning',
    ]);
    expect(workItemStatusOptions.map((option) => option.value)).toEqual([
      'Open',
      'Done',
      'Archived',
    ]);
    expect(workItemComplexityOptions.map((option) => option.value)).toEqual(['S', 'M', 'L', 'XL']);
  });

  test('maps enum values to Vietnamese labels', () => {
    expect(workItemTypeLabel('CodeReview')).toBe('Review mã');
    expect(workItemStatusLabel('Done')).toBe('Đã xong');
  });

  test('label records cover every generated enum value', () => {
    expect(Object.keys(WORK_ITEM_TYPE_LABELS).sort()).toEqual(
      workItemTypeOptions.map((option) => option.value).sort()
    );
    expect(Object.keys(WORK_ITEM_STATUS_LABELS).sort()).toEqual(
      workItemStatusOptions.map((option) => option.value).sort()
    );
    expect(Object.keys(WORK_ITEM_COMPLEXITY_LABELS).sort()).toEqual(
      workItemComplexityOptions.map((option) => option.value).sort()
    );
  });
});

describe('validateWorkItemForm', () => {
  test('rejects an empty title and does not build a request', () => {
    const result = validateWorkItemForm({ ...emptyWorkItemFormValues(), title: '   ' });

    expect(result.request).toBeNull();
    expect(result.errors.title).toBe('Vui lòng nhập tiêu đề.');
  });

  test('enforces the OpenAPI length limits', () => {
    const longTitle = validateWorkItemForm({
      ...emptyWorkItemFormValues(),
      title: 'a'.repeat(201),
    });
    const longDescription = validateWorkItemForm({
      ...emptyWorkItemFormValues(),
      title: 'Việc',
      description: 'a'.repeat(5001),
    });

    expect(longTitle.errors.title).toMatch(/200/);
    expect(longDescription.errors.description).toMatch(/5000/);
  });

  test('requires a positive integer estimate', () => {
    for (const estimate of ['0', '-3', '1.5', 'abc']) {
      const result = validateWorkItemForm({
        ...emptyWorkItemFormValues(),
        title: 'Việc',
        userEstimateMinutes: estimate,
      });
      expect(result.errors.userEstimateMinutes).toMatch(/số phút nguyên dương/);
      expect(result.request).toBeNull();
    }
  });

  test('rejects a deadline that is not ISO 8601', () => {
    const result = validateWorkItemForm({
      ...emptyWorkItemFormValues(),
      title: 'Việc',
      deadline: '31/10/2026',
    });

    expect(result.errors.deadline).toMatch(/ISO 8601/);
    expect(result.request).toBeNull();
  });

  test('rejects a past deadline when creating', () => {
    const result = validateWorkItemForm(
      { ...emptyWorkItemFormValues(), title: 'Việc', deadline: '2020-01-01T10:00' },
      'create'
    );

    expect(result.errors.deadline).toMatch(/sau thời điểm hiện tại/);
    expect(result.request).toBeNull();
  });

  test('allows a past deadline when updating', () => {
    const result = validateWorkItemForm(
      { ...emptyWorkItemFormValues(), title: 'Việc', deadline: '2020-01-01T10:00' },
      'update'
    );

    expect(result.errors.deadline).toBeUndefined();
    expect(result.request?.deadline).toBe(new Date(2020, 0, 1, 10, 0, 0, 0).toISOString());
  });

  test('builds a full write request with trimmed values and null optional fields', () => {
    const result = validateWorkItemForm({
      ...emptyWorkItemFormValues(),
      title: '  Việc mới  ',
      description: '  ',
      deadline: '2026-10-31T18:00',
      userEstimateMinutes: ' 90 ',
    });

    expect(result.errors).toEqual({});
    expect(result.request).toEqual({
      title: 'Việc mới',
      description: null,
      type: 'Coding',
      complexity: 'M',
      deadline: new Date(2026, 9, 31, 18, 0, 0, 0).toISOString(),
      userEstimateMinutes: 90,
    });
  });
});

describe('deadline conversion', () => {
  test('converts a local ISO value to an ISO string with offset designator', () => {
    const result = normalizeDeadline('2026-10-31T18:00');

    expect(result.value).toBe(new Date(2026, 9, 31, 18, 0, 0, 0).toISOString());
    expect(result.value?.endsWith('Z')).toBe(true);
  });

  test('converts an explicit offset to UTC', () => {
    expect(normalizeDeadline('2026-10-31T18:00:00+07:00').value).toBe(
      '2026-10-31T11:00:00.000Z'
    );
  });

  test('accepts a date-only value as local midnight', () => {
    expect(normalizeDeadline('2026-10-31').value).toBe(
      new Date(2026, 9, 31, 0, 0, 0, 0).toISOString()
    );
  });

  test('rejects an impossible calendar date', () => {
    expect(normalizeDeadline('2026-02-31T10:00').error).toMatch(/không hợp lệ/);
  });

  test('round-trips an ISO deadline into the local form input', () => {
    const iso = new Date(2026, 9, 31, 18, 30, 0, 0).toISOString();

    expect(deadlineInputFromIso(iso)).toBe('2026-10-31T18:30');
  });

  test('maps an existing item into an editable form without dropping fields', () => {
    const values = workItemFormValuesFromDetail(
      detail({
        deadline: new Date(2026, 11, 1, 9, 15, 0, 0).toISOString(),
        userEstimateMinutes: 45,
      })
    );

    expect(values).toEqual({
      title: 'Việc A',
      description: 'Mô tả',
      type: 'Coding',
      complexity: 'M',
      deadline: '2026-12-01T09:15',
      deadlineOriginal: new Date(2026, 11, 1, 9, 15, 0, 0).toISOString(),
      userEstimateMinutes: '45',
    });
  });

  test('keeps the original ISO deadline when the user does not edit it', () => {
    const original = '2026-12-01T02:15:45.1234567+00:00';
    const values = workItemFormValuesFromDetail(detail({ deadline: original }));

    const result = validateWorkItemForm(values, 'update');

    expect(result.errors.deadline).toBeUndefined();
    expect(result.request?.deadline).toBe(original);
  });
});
