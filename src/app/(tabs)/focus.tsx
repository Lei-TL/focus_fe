import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { StartSessionPanel } from '@/components/sessions/StartSessionPanel';
import { Card } from '@/components/ui/Card';
import { useSession, type ActiveFocusSession } from '@/context/session-context';
import { useWorkItems } from '@/hooks/use-work-items';
import { isSessionError } from '@/services/session-error';
import { workItemStatusLabel, workItemTypeLabel } from '@/services/work-item-options';
import {
  computeSessionTiming,
  formatDuration,
  formatSessionStatus,
  formatSessionTimer,
} from '@/services/session-time';
import { colors, radius, spacing } from '@/theme/tokens';

export default function FocusScreen() {
  const { state, isEnding, end, dismissResult } = useSession();
  const [appState, setAppState] = useState(AppState.currentState);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [endError, setEndError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const {
    items,
    filters,
    setFilters,
    loading,
    loadingMore,
    error: listError,
    hasMore,
    reload,
    loadMore,
  } = useWorkItems();

  // The focus tab only starts sessions on items that are still Open.
  useEffect(() => {
    if (filters.status !== 'Open' || filters.type !== null) {
      setFilters({ status: 'Open', type: null });
    }
  }, [filters.status, filters.type, setFilters]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppState(next);
    });
    return () => subscription.remove();
  }, []);

  const performEnd = useCallback(
    async (reason: 'Completed' | 'Cancelled') => {
      setEndError(null);
      try {
        await end(reason);
      } catch (endFailure) {
        if (mountedRef.current) {
          setEndError(
            isSessionError(endFailure)
              ? endFailure.message
              : 'Không kết thúc được phiên. Phiên vẫn đang chạy, vui lòng thử lại.'
          );
        }
      }
    },
    [end]
  );

  const confirmEnd = useCallback(
    (reason: 'Completed' | 'Cancelled') => {
      const completed = reason === 'Completed';
      Alert.alert(
        completed ? 'Hoàn thành phiên' : 'Hủy phiên',
        completed
          ? 'Kết thúc phiên và lưu thời gian đã tập trung?'
          : 'Hủy phiên này? Thời gian vẫn được lưu ở trạng thái đã hủy.',
        [
          { text: 'Không', style: 'cancel' },
          {
            text: completed ? 'Hoàn thành' : 'Hủy phiên',
            style: completed ? 'default' : 'destructive',
            onPress: () => void performEnd(reason),
          },
        ]
      );
    },
    [performEnd]
  );

  function restart() {
    dismissResult();
    setSelectedId(null);
    setEndError(null);
  }

  if (state.kind === 'active') {
    return (
      <Screen eyebrow="Phiên tập trung" title="Đang tập trung">
        <Card>
          <Text style={styles.label}>Công việc</Text>
          <Text style={styles.task} testID="session-active-title">
            {state.session.workItemTitle}
          </Text>
          <SessionClock key={appState} session={state.session} />
          <Text style={styles.meta}>
            Đồng hồ bám mốc giờ máy chủ, tự tính lại khi quay lại ứng dụng.
          </Text>
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Kết thúc phiên</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isEnding}
            onPress={() => confirmEnd('Completed')}
            style={[styles.primaryButton, isEnding && styles.disabled]}
            testID="session-complete"
          >
            {isEnding ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>Hoàn thành</Text>
            )}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isEnding}
            onPress={() => confirmEnd('Cancelled')}
            style={[styles.dangerButton, isEnding && styles.disabled]}
            testID="session-cancel"
          >
            <Text style={styles.dangerButtonText}>Hủy phiên</Text>
          </Pressable>
          {endError ? (
            <Text style={styles.error} testID="session-end-error">
              {endError}
            </Text>
          ) : null}
        </Card>

        <AppStateEvidence appState={appState} />
      </Screen>
    );
  }

  if (state.kind === 'result') {
    return (
      <Screen eyebrow="Phiên tập trung" title="Kết quả phiên">
        <Card>
          <Text style={styles.label}>Công việc</Text>
          <Text style={styles.task}>{state.result.workItemTitle}</Text>
          <Text style={styles.resultStatus} testID="session-result-status">
            {formatSessionStatus(state.result.status)}
          </Text>
          <Text style={styles.resultTime} testID="session-result-gross">
            {formatDuration(state.result.grossSeconds)}
          </Text>
          <Text style={styles.meta}>
            Đây là thời gian thô (grossSeconds) do máy chủ ghi nhận, chưa phải điểm chất lượng.
          </Text>
        </Card>
        <Pressable onPress={restart} style={styles.primaryButton} testID="session-new">
          <Text style={styles.primaryButtonText}>Bắt đầu phiên mới</Text>
        </Pressable>
        <AppStateEvidence appState={appState} />
      </Screen>
    );
  }

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return (
    <Screen eyebrow="Phiên tập trung" title="Chọn công việc">
      <Card>
        <Text style={styles.sectionTitle}>Công việc đang mở</Text>
        {loading ? (
          <ActivityIndicator color={colors.primary} testID="focus-items-loading" />
        ) : listError ? (
          <View style={styles.errorBlock}>
            <Text style={styles.error} testID="focus-items-error">
              {listError}
            </Text>
            <Pressable onPress={reload} testID="focus-items-retry">
              <Text style={styles.linkText}>Thử lại</Text>
            </Pressable>
          </View>
        ) : items.length === 0 ? (
          <Text style={styles.meta} testID="focus-items-empty">
            Không có công việc nào đang mở. Tạo hoặc mở lại một công việc trước.
          </Text>
        ) : (
          <ScrollView style={styles.itemList}>
            {items.map((item) => {
              const selected = item.id === selectedId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setSelectedId(item.id)}
                  style={[styles.itemRow, selected && styles.itemRowSelected]}
                  testID={`focus-item-${item.id}`}
                >
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.meta}>
                    {workItemTypeLabel(item.type)} · {workItemStatusLabel(item.status)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
        {hasMore && !loading ? (
          <Pressable onPress={loadMore} disabled={loadingMore} testID="focus-load-more">
            {loadingMore ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <Text style={styles.linkText}>Tải thêm</Text>
            )}
          </Pressable>
        ) : null}
      </Card>

      {selectedItem ? (
        <Card>
          <Text style={styles.sectionTitle}>{selectedItem.title}</Text>
          <StartSessionPanel
            workItemId={selectedItem.id}
            workItemTitle={selectedItem.title}
          />
        </Card>
      ) : (
        <Text style={styles.hint}>Chọn một công việc để đặt thời lượng và bắt đầu.</Text>
      )}

      <AppStateEvidence appState={appState} />
    </Screen>
  );
}

function SessionClock({ session }: { session: ActiveFocusSession }) {
  const [nowMs, setNowMs] = useState(() => Date.now());

  // One timer for the screen. Every tick recomputes from the server anchor
  // instead of decrementing a counter, so background time cannot drift it.
  useEffect(() => {
    const interval = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timing = computeSessionTiming(session, nowMs);

  return (
    <>
      <Text style={styles.timer} testID="session-timer">
        {formatSessionTimer(timing)}
      </Text>
      <Text style={styles.meta} testID="session-elapsed">
        Đã trôi {formatDuration(timing.elapsedSeconds)} · Dự kiến{' '}
        {formatDuration(timing.totalSeconds)}
      </Text>
    </>
  );
}

function AppStateEvidence({ appState }: { appState: string }) {
  return (
    <View style={styles.evidence}>
      <Text style={styles.evidenceTitle}>Bằng chứng phiên</Text>
      <Text style={styles.evidenceText} testID="focus-app-state">
        AppState hiện tại: {appState}
      </Text>
      <Text style={styles.evidenceText}>
        FE ghi nhận chuyển nền; nhịp tim và sự kiện phiên sẽ được gửi ở bước tiếp theo.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.primary, fontWeight: '800' },
  task: { color: colors.text, fontSize: 19, fontWeight: '800' },
  timer: {
    color: colors.primary,
    fontSize: 58,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  meta: { color: colors.muted, textAlign: 'center' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  primaryButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  dangerButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  dangerButtonText: { color: colors.danger, fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.6 },
  error: { color: colors.danger, fontWeight: '600' },
  errorBlock: { gap: spacing.xs },
  linkText: { color: colors.primary, fontWeight: '800' },
  hint: { color: colors.muted, lineHeight: 20 },
  itemList: { maxHeight: 280 },
  itemRow: {
    gap: 2,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemRowSelected: { backgroundColor: colors.primarySoft, borderRadius: radius.sm },
  itemTitle: { color: colors.text, fontWeight: '700' },
  resultStatus: { color: colors.primary, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  resultTime: {
    color: colors.text,
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  evidence: { gap: spacing.sm, padding: spacing.md },
  evidenceTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  evidenceText: { color: colors.muted, lineHeight: 20 },
});
