import type { ComponentProps } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { WorkItemForm } from '@/components/work-items/WorkItemForm';
import { emptyWorkItemFormValues } from '@/services/work-item-form';

function renderForm(overrides: Partial<ComponentProps<typeof WorkItemForm>> = {}) {
  const props: ComponentProps<typeof WorkItemForm> = {
    initialValues: { ...emptyWorkItemFormValues(), title: 'Việc' },
    mode: 'create',
    submitLabel: 'Lưu',
    submitting: false,
    onSubmit: jest.fn(),
    onCancel: jest.fn(),
    testIDPrefix: 'form',
    ...overrides,
  };
  return { props, ...render(<WorkItemForm {...props} />) };
}

describe('WorkItemForm', () => {
  test('clears a server field error when the user edits that field', () => {
    renderForm({ serverFieldErrors: { title: 'Tiêu đề đã tồn tại.' } });

    expect(screen.getByText('Tiêu đề đã tồn tại.')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('form-title'), 'Tiêu đề khác');

    expect(screen.queryByText('Tiêu đề đã tồn tại.')).toBeNull();
  });

  test('keeps the deadline rule split between create and update', () => {
    const pastDeadline = '2020-01-01T10:00';

    const createProps = renderForm({
      initialValues: { ...emptyWorkItemFormValues(), title: 'Việc', deadline: pastDeadline },
      mode: 'create',
    }).props;
    fireEvent.press(screen.getByTestId('form-submit'));

    expect(createProps.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText(/sau thời điểm hiện tại/)).toBeTruthy();

    screen.unmount();

    const updateProps = renderForm({
      initialValues: { ...emptyWorkItemFormValues(), title: 'Việc', deadline: pastDeadline },
      mode: 'update',
    }).props;
    fireEvent.press(screen.getByTestId('form-submit'));

    expect(updateProps.onSubmit).toHaveBeenCalledTimes(1);
  });
});
