import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { StartSessionPanel } from '@/components/sessions/StartSessionPanel';
import { Card } from '@/components/ui/Card';
import {
  useSession,
  type ActiveFocusSession,
  type SessionContextValue,
  type SessionRecovery,
} from '@/context/session-context';
import { useWorkItems } from '@/hooks/use-work-items';
import { isSessionError } from '@/services/session-error';
import type { WorkItemFilters } from '@/services/work-items-service';
import { workItemStatusLabel, workItemTypeLabel } from '@/services/work-item-options';
import {
  computeSessionTiming,
  formatDuration,
  formatSessionStatus,
  formatSessionTimer,
} from '@/services/session-time';
import { colors, radius, spacing } from '@/theme/tokens';

// The focus tab only starts sessions on items that are still Open.
const FOCUS_FILTERS: WorkItemFilters = { status: 'Open', type: null };

export default function FocusScreen() {
  const { state, isEnding, end, dismissResult, events, recovery, checkCurrent } = useSession();
  const router = useRouter();
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
    refreshing,
    loadingMore,
    error: listError,
    hasMore,
    reload,
    refresh,
    loadMore,
  } = useWorkItems({
    // The list is hidden while a session is running or its result is shown, so
    // there is nothing to fetch in those states.
    enabled: state.kind === 'idle',
    initialFilters: FOCUS_FILTERS,
  });

  useEffect(() => {
    if (filters.status !== 'Open' || filters.type !== null) {
      setFilters({ status: 'Open', type: null });
    }
  }, [filters.status, filters.type, setFilters]);

  // Work items created or closed on other screens must show up here when the
  // user comes back to this tab; the tab stays mounted between visits. The
  // current session is re-checked on every focus, but the provider coalesces
  // checks that happen within a few seconds of each other.
  const firstFocusRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      void checkCurrent();
      if (firstFocusRef.current) {
        firstFocusRef.current = false;
        return;
      }
      if (state.kind !== 'idle') {
        return;
      }
      void refresh();
    }, [checkCurrent, refresh, state.kind])
  );

  const performEnd = useCallback(
    async (reason: 'Completed' | 'Cancelled') => {
      if (mountedRef.current) {
        setEndError(null);
      }
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
          <SessionClock key={events.appState} session={state.session} />
          <Text style={styles.meta}>
            Đồng hồ bám mốc giờ máy chủ, tự tính lại khi quay lại ứng dụng.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({
                pathname: '/session/[id]',
                params: { id: state.session.sessionId },
              })
            }
            testID="session-active-detail"
          >
            <Text style={styles.linkText}>Xem chi tiết phiên</Text>
          </Pressable>
        </Card>

        <RecoveryNotice
          recovery={recovery}
          onRetry={() => void checkCurrent({ force: true })}
        />

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

        <AppStateEvidence events={events} />
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
          <Pressable
            accessibilityRole="link"
            onPress={() =>
              router.push({
                pathname: '/session/[id]',
                params: { id: state.result.sessionId },
              })
            }
            testID="session-result-detail"
          >
            <Text style={styles.linkText}>Xem chi tiết phiên</Text>
          </Pressable>
        </Card>
        <RecoveryNotice
          recovery={recovery}
          onRetry={() => void checkCurrent({ force: true })}
        />
        <Pressable onPress={restart} style={styles.primaryButton} testID="session-new">
          <Text style={styles.primaryButtonText}>Bắt đầu phiên mới</Text>
        </Pressable>
        <AppStateEvidence events={events} />
      </Screen>
    );
  }

  if (state.kind === 'missing') {
    return (
      <Screen eyebrow="Phiên tập trung" title="Không tìm thấy phiên">
        <Card>
          <Text style={styles.label}>Công việc</Text>
          <Text style={styles.task}>{state.workItemTitle}</Text>
          <Text style={styles.meta} testID="session-missing-message">
            {state.message}
          </Text>
        </Card>
        <Pressable onPress={restart} style={styles.primaryButton} testID="session-missing-dismiss">
          <Text style={styles.primaryButtonText}>Chọn công việc khác</Text>
        </Pressable>
        <AppStateEvidence events={events} />
      </Screen>
    );
  }

  const selectedItem = items.find((item) => item.id === selectedId) ?? null;

  return (
    <Screen eyebrow="Phiên tập trung" title="Chọn công việc">
      <RecoveryNotice
        recovery={recovery}
        onRetry={() => void checkCurrent({ force: true })}
      />
      <Card>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Công việc đang mở</Text>
          <Pressable
            accessibilityRole="button"
            disabled={loading || refreshing}
            onPress={() => void refresh()}
            testID="focus-items-refresh"
          >
            <Text style={[styles.linkText, (loading || refreshing) && styles.disabled]}>
              {refreshing ? 'Đang làm mới…' : 'Làm mới'}
            </Text>
          </Pressable>
        </View>
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
            key={selectedItem.id}
            workItemId={selectedItem.id}
            workItemTitle={selectedItem.title}
          />
        </Card>
      ) : (
        <Text style={styles.hint}>Chọn một công việc để đặt thời lượng và bắt đầu.</Text>
      )}

      <AppStateEvidence events={events} />
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
      {timing.isOvertime ? (
        <Text style={styles.overtime} testID="session-overtime">
          Đã quá thời gian dự kiến {formatDuration(timing.overtimeSeconds)}. Phiên không tự kết
          thúc, bạn vẫn có thể kết thúc khi sẵn sàng.
        </Text>
      ) : null}
    </>
  );
}

// A failed current-session check must never read as "no session": the user is
// told the check failed and can retry it explicitly.
function RecoveryNotice({
  recovery,
  onRetry,
}: {
  recovery: SessionRecovery;
  onRetry: () => void;
}) {
  if (recovery.status !== 'unavailable' && recovery.status !== 'conflict') {
    return null;
  }
  const failed = recovery.status === 'unavailable';
  return (
    <Card>
      <Text style={styles.recoveryTitle} testID="session-recovery-title">
        {failed ? 'Không kiểm tra được phiên' : 'Phiên chưa đồng bộ'}
      </Text>
      <Text style={styles.meta} testID="session-recovery-message">
        {recovery.message ??
          (failed
            ? 'Không kiểm tra được phiên đang chạy.'
            : 'Máy chủ và ứng dụng đang giữ phiên khác nhau.')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={onRetry}
        testID="session-recovery-retry"
      >
        <Text style={styles.linkText}>Thử lại</Text>
      </Pressable>
    </Card>
  );
}

const STOPPED_REASON_LABELS: Record<
  NonNullable<SessionContextValue['events']['stoppedReason']>,
  string
> = {
  closed: 'Máy chủ báo phiên đã kết thúc nên nhịp tim đã dừng.',
  missing: 'Máy chủ không còn phiên này nên nhịp tim đã dừng.',
  disposed: 'Phiên đã kết thúc nên nhịp tim đã dừng.',
};

function AppStateEvidence({ events }: { events: SessionContextValue['events'] }) {
  return (
    <View style={styles.evidence}>
      <Text style={styles.evidenceTitle}>Bằng chứng phiên</Text>
      <Text style={styles.evidenceText} testID="focus-app-state">
        AppState hiện tại: {events.appState}
      </Text>
      <Text style={styles.evidenceText} testID="session-event-stats">
        Event: đã gửi {events.sent} · đang chờ {events.pending} · lỗi {events.failed} · trùng{' '}
        {events.duplicate}
      </Text>
      {events.stoppedReason ? (
        <Text style={styles.evidenceText} testID="session-event-stopped">
          {STOPPED_REASON_LABELS[events.stoppedReason]}
        </Text>
      ) : null}
      {events.lastError ? (
        <Text style={[styles.evidenceText, styles.evidenceError]} testID="session-event-error">
          {events.lastError}
        </Text>
      ) : null}
      <Text style={styles.evidenceText}>
        Hàng đợi event chỉ nằm trong bộ nhớ: app bị kill có thể mất event chưa gửi.
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
  overtime: { color: colors.danger, fontWeight: '700', textAlign: 'center' },
  recoveryTitle: { color: colors.danger, fontSize: 16, fontWeight: '800' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
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
  evidenceError: { color: colors.danger },
});
