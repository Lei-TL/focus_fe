import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
} from 'react-native';

import { WorkItemForm } from '@/components/work-items/WorkItemForm';
import type { CreateWorkItemRequest } from '@/core/api/types';
import { useWorkItemDetail } from '@/hooks/use-work-item-detail';
import {
  workItemFormValuesFromDetail,
  type WorkItemFormErrors,
} from '@/services/work-item-form';
import { toWorkItemError } from '@/services/work-item-error';
import { updateWorkItem } from '@/services/work-items-service';
import { colors, radius, spacing } from '@/theme/tokens';

export default function EditWorkItemScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { detail, loading, error, refresh } = useWorkItemDetail(id);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<WorkItemFormErrors>({});

  async function submit(request: CreateWorkItemRequest) {
    if (!id || submitting) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      await updateWorkItem(id, request);
      setSubmitting(false);
      router.back();
    } catch (updateError) {
      const mapped = toWorkItemError(updateError, 'update');
      setSubmitError(mapped.message);
      setFieldErrors(mapped.fieldErrors);
      setSubmitting(false);
    }
  }

  if (loading && !detail) {
    return (
      <SafeAreaView style={styles.state}>
        <ActivityIndicator color={colors.primary} testID="work-item-edit-loading" />
        <Text style={styles.stateText}>Đang tải công việc…</Text>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.state}>
        <Text style={styles.error} testID="work-item-edit-error">
          {error?.message ?? 'Không tìm thấy công việc.'}
        </Text>
        <Pressable onPress={refresh} style={styles.retry} testID="work-item-edit-retry">
          <Text style={styles.retryText}>Thử lại</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} testID="work-item-edit-back">
          <Text style={styles.backText}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <WorkItemForm
      key={detail.id}
      initialValues={workItemFormValuesFromDetail(detail)}
      mode="update"
      submitLabel="Lưu thay đổi"
      submitting={submitting}
      serverError={submitError}
      serverFieldErrors={fieldErrors}
      onSubmit={(request) => void submit(request)}
      onCancel={() => router.back()}
      testIDPrefix="work-item-edit"
    />
  );
}

const styles = StyleSheet.create({
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  stateText: { color: colors.muted },
  error: { color: colors.danger, fontWeight: '600', textAlign: 'center' },
  retry: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  retryText: { color: '#FFFFFF', fontWeight: '800' },
  backText: { color: colors.primary, fontWeight: '700' },
});
