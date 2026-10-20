import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Chip } from '@/components/work-items/Chip';
import { FormField } from '@/components/work-items/FormField';
import type { CreateWorkItemRequest } from '@/core/api/types';
import {
  validateWorkItemForm,
  type WorkItemFormErrors,
  type WorkItemFormValues,
} from '@/services/work-item-form';
import {
  workItemComplexityOptions,
  workItemTypeOptions,
} from '@/services/work-item-options';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  initialValues: WorkItemFormValues;
  submitLabel: string;
  submitting: boolean;
  serverError?: string | null;
  serverFieldErrors?: WorkItemFormErrors;
  onSubmit: (request: CreateWorkItemRequest) => void;
  onCancel: () => void;
  testIDPrefix: string;
};

export function WorkItemForm({
  initialValues,
  submitLabel,
  submitting,
  serverError,
  serverFieldErrors,
  onSubmit,
  onCancel,
  testIDPrefix,
}: Props) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<WorkItemFormErrors>({});

  function setField<K extends keyof WorkItemFormValues>(
    key: K,
    value: WorkItemFormValues[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function errorFor(key: keyof WorkItemFormValues): string | undefined {
    return errors[key] ?? serverFieldErrors?.[key];
  }

  function handleSubmit() {
    if (submitting) {
      return;
    }
    const result = validateWorkItemForm(values);
    setErrors(result.errors);
    if (result.request) {
      onSubmit(result.request);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <FormField label="Tiêu đề" error={errorFor('title')}>
            <TextInput
              style={styles.input}
              value={values.title}
              onChangeText={(text) => setField('title', text)}
              maxLength={200}
              placeholder="Việc cần làm"
              placeholderTextColor={colors.muted}
              editable={!submitting}
              testID={`${testIDPrefix}-title`}
            />
          </FormField>

          <FormField label="Mô tả" error={errorFor('description')}>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={values.description}
              onChangeText={(text) => setField('description', text)}
              maxLength={5000}
              placeholder="Mô tả thêm (không bắt buộc)"
              placeholderTextColor={colors.muted}
              multiline
              textAlignVertical="top"
              editable={!submitting}
              testID={`${testIDPrefix}-description`}
            />
          </FormField>

          <FormField label="Loại công việc" error={errorFor('type')}>
            <View style={styles.chipRow}>
              {workItemTypeOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={values.type === option.value}
                  disabled={submitting}
                  onPress={() => setField('type', option.value)}
                  testID={`${testIDPrefix}-type-${option.value}`}
                />
              ))}
            </View>
          </FormField>

          <FormField label="Độ phức tạp" error={errorFor('complexity')}>
            <View style={styles.chipRow}>
              {workItemComplexityOptions.map((option) => (
                <Chip
                  key={option.value}
                  label={option.label}
                  selected={values.complexity === option.value}
                  disabled={submitting}
                  onPress={() => setField('complexity', option.value)}
                  testID={`${testIDPrefix}-complexity-${option.value}`}
                />
              ))}
            </View>
          </FormField>

          <FormField label="Hạn chót" error={errorFor('deadline')}>
            <TextInput
              style={styles.input}
              value={values.deadline}
              onChangeText={(text) => setField('deadline', text)}
              placeholder="2026-10-31T18:00 (không bắt buộc)"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!submitting}
              testID={`${testIDPrefix}-deadline`}
            />
            <Text style={styles.hint}>
              ISO 8601 kèm múi giờ, hoặc giờ địa phương dạng 2026-10-31T18:00.
            </Text>
          </FormField>

          <FormField label="Ước lượng (phút)" error={errorFor('userEstimateMinutes')}>
            <TextInput
              style={styles.input}
              value={values.userEstimateMinutes}
              onChangeText={(text) => setField('userEstimateMinutes', text)}
              placeholder="Ví dụ 90 (không bắt buộc)"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              editable={!submitting}
              testID={`${testIDPrefix}-estimate`}
            />
          </FormField>

          {serverError ? (
            <Text style={styles.error} testID={`${testIDPrefix}-error`}>
              {serverError}
            </Text>
          ) : null}

          <Pressable
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            testID={`${testIDPrefix}-submit`}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" testID={`${testIDPrefix}-submitting`} />
            ) : (
              <Text style={styles.buttonText}>{submitLabel}</Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onCancel}
            disabled={submitting}
            testID={`${testIDPrefix}-cancel`}
          >
            <Text style={styles.secondaryButtonText}>Hủy</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  safeArea: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  input: {
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  multiline: { minHeight: 110 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.danger, fontWeight: '600' },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 },
  secondaryButton: { padding: spacing.sm },
  secondaryButtonText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },
});
