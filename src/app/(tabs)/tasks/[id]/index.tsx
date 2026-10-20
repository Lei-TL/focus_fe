import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/work-items/Chip';
import type { WorkItemDetail, WorkItemStatus } from '@/core/api/types';
import { useDependencyItems } from '@/hooks/use-dependency-items';
import { useWorkItemDetail } from '@/hooks/use-work-item-detail';
import { formatDeadline, formatEstimate } from '@/services/work-item-format';
import {
  workItemStatusLabel,
  workItemStatusOptions,
  workItemTypeLabel,
} from '@/services/work-item-options';
import { isAbortedRequest, toWorkItemError } from '@/services/work-item-error';
import {
  addWorkItemDependency,
  changeWorkItemStatus,
  deleteWorkItem,
  loadAllWorkItems,
  removeWorkItemDependency,
} from '@/services/work-items-service';
import { colors, radius, spacing } from '@/theme/tokens';

export default function WorkItemDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { detail, loading, error, refresh, applyWorkItem } = useWorkItemDetail(id);
  const dependencyItems = useDependencyItems(detail?.dependsOnWorkItemIds ?? []);

  const [actionError, setActionError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState<WorkItemStatus | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [candidates, setCandidates] = useState<WorkItemDetail[] | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [candidatesError, setCandidatesError] = useState<string | null>(null);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [dependencySaving, setDependencySaving] = useState<string | null>(null);
  const candidatesControllerRef = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      candidatesControllerRef.current?.abort();
    },
    []
  );

  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      refresh();
    }, [refresh])
  );

  const loadCandidates = useCallback(async () => {
    candidatesControllerRef.current?.abort();
    const controller = new AbortController();
    candidatesControllerRef.current = controller;
    setCandidatesLoading(true);
    setCandidatesError(null);
    try {
      const all = await loadAllWorkItems(controller.signal);
      if (!controller.signal.aborted) {
        setCandidates(all);
      }
    } catch (loadError) {
      if (!controller.signal.aborted && !isAbortedRequest(loadError)) {
        setCandidatesError(toWorkItemError(loadError, 'list').message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setCandidatesLoading(false);
      }
    }
  }, []);

  function openPicker() {
    setPickerOpen(true);
    setPickerError(null);
    if (!candidates) {
      void loadCandidates();
    }
  }

  async function changeStatus(status: WorkItemStatus) {
    if (!detail || statusSaving) {
      return;
    }
    setStatusSaving(status);
    setActionError(null);
    try {
      const updated = await changeWorkItemStatus(detail.id, status);
      applyWorkItem(updated);
    } catch (statusError) {
      setActionError(toWorkItemError(statusError, 'status').message);
    } finally {
      setStatusSaving(null);
    }
  }

  async function removeDependency(dependsOnWorkItemId: string) {
    if (!detail || removingId) {
      return;
    }
    setRemovingId(dependsOnWorkItemId);
    setActionError(null);
    try {
      await removeWorkItemDependency(detail.id, dependsOnWorkItemId);
      await refresh();
    } catch (removeError) {
      setActionError(toWorkItemError(removeError, 'removeDependency').message);
    } finally {
      setRemovingId(null);
    }
  }

  async function addDependency(dependsOnWorkItemId: string) {
    if (!detail || dependencySaving) {
      return;
    }
    setDependencySaving(dependsOnWorkItemId);
    setPickerError(null);
    try {
      await addWorkItemDependency(detail.id, dependsOnWorkItemId);
      setPickerOpen(false);
      await refresh();
    } catch (addError) {
      setPickerError(toWorkItemError(addError, 'addDependency').message);
    } finally {
      setDependencySaving(null);
    }
  }

  async function performDelete() {
    if (!detail || deleting) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await deleteWorkItem(detail.id);
      setDeleting(false);
      router.back();
    } catch (deleteError) {
      setActionError(toWorkItemError(deleteError, 'delete').message);
      setDeleting(false);
    }
  }

  function confirmDelete() {
    if (!detail) {
      return;
    }
    Alert.alert(
      'Xóa công việc',
      `Xóa "${detail.title}"? Hành động này không hoàn tác được.`,
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Xóa', style: 'destructive', onPress: () => void performDelete() },
      ]
    );
  }

  if (loading && !detail) {
    return (
      <SafeAreaView style={styles.state}>
        <ActivityIndicator color={colors.primary} testID="work-item-detail-loading" />
        <Text style={styles.stateText}>Đang tải công việc…</Text>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.state}>
        <Text style={styles.error} testID="work-item-detail-error">
          {error?.message ?? 'Không tìm thấy công việc.'}
        </Text>
        <Pressable onPress={refresh} style={styles.primaryButton} testID="work-item-detail-retry">
          <Text style={styles.primaryButtonText}>Thử lại</Text>
        </Pressable>
        <Pressable onPress={() => router.back()} testID="work-item-detail-back">
          <Text style={styles.linkText}>Quay lại</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const dependencyIds = detail.dependsOnWorkItemIds;
  const availableCandidates = (candidates ?? []).filter(
    (item) => item.id !== detail.id && !dependencyIds.includes(item.id)
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.back()} testID="work-item-detail-back">
            <Text style={styles.linkText}>‹ Quay lại</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push({ pathname: '/tasks/[id]/edit', params: { id: detail.id } })}
            testID="work-item-detail-edit"
          >
            <Text style={styles.linkText}>Sửa</Text>
          </Pressable>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{detail.title}</Text>
          <Text style={styles.meta}>
            {workItemTypeLabel(detail.type)} · {detail.complexity} ·{' '}
            {workItemStatusLabel(detail.status)}
          </Text>
        </View>

        <Card>
          <Text style={styles.fieldLabel}>Hạn chót</Text>
          <Text style={styles.fieldValue}>
            {detail.deadline ? formatDeadline(detail.deadline) : 'Chưa đặt'}
          </Text>
          <Text style={styles.fieldLabel}>Ước lượng</Text>
          <Text style={styles.fieldValue}>{formatEstimate(detail.userEstimateMinutes)}</Text>
          <Text style={styles.fieldLabel}>Tạo lúc</Text>
          <Text style={styles.fieldValue}>{formatDeadline(detail.createdAt)}</Text>
          {detail.closedAt ? (
            <>
              <Text style={styles.fieldLabel}>Đóng lúc</Text>
              <Text style={styles.fieldValue}>{formatDeadline(detail.closedAt)}</Text>
            </>
          ) : null}
        </Card>

        {detail.description ? (
          <Card>
            <Text style={styles.sectionTitle}>Mô tả</Text>
            <Text style={styles.body}>{detail.description}</Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Trạng thái</Text>
          <View style={styles.chipRow}>
            {workItemStatusOptions.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={detail.status === option.value}
                disabled={statusSaving !== null || detail.status === option.value}
                onPress={() => void changeStatus(option.value)}
                testID={`work-item-status-${option.value}`}
              />
            ))}
          </View>
          {statusSaving ? (
            <ActivityIndicator color={colors.primary} testID="work-item-status-saving" />
          ) : null}
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Phụ thuộc</Text>
            <Pressable onPress={openPicker} testID="work-item-add-dependency">
              <Text style={styles.linkText}>+ Thêm</Text>
            </Pressable>
          </View>
          {dependencyIds.length === 0 ? (
            <Text style={styles.mutedText}>Chưa có phụ thuộc.</Text>
          ) : dependencyItems.loading ? (
            <ActivityIndicator color={colors.primary} testID="work-item-dependencies-loading" />
          ) : (
            dependencyIds.map((dependencyId) => {
              const item = dependencyItems.items[dependencyId];
              return (
                <View key={dependencyId} style={styles.dependencyRow}>
                  <View style={styles.dependencyCopy}>
                    <Text style={styles.dependencyTitle}>
                      {item ? item.title : 'Không tải được công việc này.'}
                    </Text>
                    {item ? (
                      <Text style={styles.meta}>
                        {workItemTypeLabel(item.type)} · {workItemStatusLabel(item.status)}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => void removeDependency(dependencyId)}
                    disabled={removingId !== null}
                    testID={`work-item-remove-dependency-${dependencyId}`}
                  >
                    <Text style={styles.dangerLink}>
                      {removingId === dependencyId ? 'Đang xóa…' : 'Xóa'}
                    </Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </Card>

        {actionError ? (
          <Text style={styles.error} testID="work-item-action-error">
            {actionError}
          </Text>
        ) : null}

        <Card>
          <Text style={styles.sectionTitle}>Xóa công việc</Text>
          <Text style={styles.mutedText}>
            Công việc đã có phiên làm việc sẽ không thể xóa.
          </Text>
          <Pressable
            onPress={confirmDelete}
            disabled={deleting}
            style={[styles.dangerButton, deleting && styles.disabled]}
            testID="work-item-delete"
          >
            {deleting ? (
              <ActivityIndicator color="#FFFFFF" testID="work-item-deleting" />
            ) : (
              <Text style={styles.dangerButtonText}>Xóa công việc</Text>
            )}
          </Pressable>
        </Card>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setPickerOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Thêm phụ thuộc</Text>

            {candidatesLoading ? (
              <ActivityIndicator color={colors.primary} testID="dependency-candidates-loading" />
            ) : candidatesError ? (
              <View style={styles.modalState}>
                <Text style={styles.error}>{candidatesError}</Text>
                <Pressable onPress={() => void loadCandidates()} testID="dependency-candidates-retry">
                  <Text style={styles.linkText}>Thử lại</Text>
                </Pressable>
              </View>
            ) : availableCandidates.length === 0 ? (
              <Text style={styles.mutedText} testID="dependency-candidates-empty">
                Không còn công việc nào để thêm.
              </Text>
            ) : (
              <ScrollView style={styles.candidateList}>
                {availableCandidates.map((item) => (
                  <Pressable
                    key={item.id}
                    onPress={() => void addDependency(item.id)}
                    disabled={dependencySaving !== null}
                    style={styles.candidate}
                    testID={`dependency-candidate-${item.id}`}
                  >
                    <Text style={styles.candidateTitle}>{item.title}</Text>
                    <Text style={styles.meta}>
                      {workItemTypeLabel(item.type)} · {workItemStatusLabel(item.status)}
                    </Text>
                    {dependencySaving === item.id ? (
                      <ActivityIndicator color={colors.primary} />
                    ) : null}
                  </Pressable>
                ))}
              </ScrollView>
            )}

            {pickerError ? (
              <Text style={styles.error} testID="dependency-error">
                {pickerError}
              </Text>
            ) : null}

            <Pressable
              onPress={() => setPickerOpen(false)}
              style={styles.secondaryButton}
              testID="dependency-close"
            >
              <Text style={styles.secondaryButtonText}>Đóng</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  titleBlock: { gap: spacing.xs },
  title: { color: colors.text, fontSize: 28, fontWeight: '800' },
  meta: { color: colors.muted },
  fieldLabel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  fieldValue: { color: colors.text, fontWeight: '600' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  body: { color: colors.text, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  dependencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  dependencyCopy: { flex: 1, gap: 2 },
  dependencyTitle: { color: colors.text, fontWeight: '700' },
  dangerLink: { color: colors.danger, fontWeight: '700' },
  mutedText: { color: colors.muted },
  error: { color: colors.danger, fontWeight: '600' },
  linkText: { color: colors.primary, fontWeight: '800' },
  primaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800' },
  dangerButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.danger,
  },
  dangerButtonText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.6 },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  stateText: { color: colors.muted },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(25, 48, 35, 0.35)',
  },
  modalCard: {
    gap: spacing.md,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  modalState: { gap: spacing.xs },
  candidateList: { maxHeight: 360 },
  candidate: {
    gap: 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  candidateTitle: { color: colors.text, fontWeight: '700' },
  secondaryButton: { padding: spacing.sm },
  secondaryButtonText: { color: colors.primary, textAlign: 'center', fontWeight: '700' },
});
