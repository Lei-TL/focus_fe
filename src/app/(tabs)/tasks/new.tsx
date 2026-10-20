import { useState } from 'react';
import { useRouter } from 'expo-router';

import { WorkItemForm } from '@/components/work-items/WorkItemForm';
import type { CreateWorkItemRequest } from '@/core/api/types';
import {
  emptyWorkItemFormValues,
  type WorkItemFormErrors,
} from '@/services/work-item-form';
import { toWorkItemError } from '@/services/work-item-error';
import { createWorkItem } from '@/services/work-items-service';

export default function NewWorkItemScreen() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<WorkItemFormErrors>({});

  async function submit(request: CreateWorkItemRequest) {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createWorkItem(request);
      setSubmitting(false);
      router.replace({ pathname: '/tasks/[id]', params: { id: created.id } });
    } catch (submitError) {
      const mapped = toWorkItemError(submitError, 'create');
      setError(mapped.message);
      setFieldErrors(mapped.fieldErrors);
      setSubmitting(false);
    }
  }

  return (
    <WorkItemForm
      initialValues={emptyWorkItemFormValues()}
      submitLabel="Tạo công việc"
      submitting={submitting}
      serverError={error}
      serverFieldErrors={fieldErrors}
      onSubmit={(request) => void submit(request)}
      onCancel={() => router.back()}
      testIDPrefix="work-item-new"
    />
  );
}
