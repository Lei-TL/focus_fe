import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import type { SessionRead } from '@/core/api/types';
import { useAuth } from '@/context/auth-context';
import {
  formatSessionGrossSeconds,
  formatSessionMoment,
  isSessionId,
} from '@/services/session-format';
import {
  isAbortedSessionRequest,
  toSessionError,
} from '@/services/session-error';
import { getFocusSession } from '@/services/session-service';
import { formatDuration, formatSessionStatus } from '@/services/session-time';
import { colors, radius, spacing } from '@/theme/tokens';

export const INVALID_SESSION_ID_MESSAGE = 'Mã phiên không hợp lệ. Kiểm tra lại liên kết.';

// Detail route for one known session id. It is intentionally not a history
// list: the backend still has no GET /sessions, so the only ids the app can show
// are the ones it received from start/current/end/detail.
export default function SessionResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const validId = isSessionId(id);
  const { profile } = useAuth();

  const [detail, setDetail] = useState<SessionRead | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!validId || !id) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let active = true;

    getFocusSession(id, controller.signal)
      .then((next) => {
        if (!active) {
          return;
        }
        setDetail(next);
        setError(null);
        setLoading(false);
      })
      .catch((failure: unknown) => {
        if (!active || controller.signal.aborted || isAbortedSessionRequest(failure)) {
          return;
        }
        setDetail(null);
        setError(toSessionError(failure, 'detail').message);
        setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id, reloadKey, validId]);

  function retry() {
    setLoading(true);
    setReloadKey((current) => current + 1);
  }

  const back = (
    <Pressable onPress={() => router.back()} testID="session-detail-back">
      <Text style={styles.linkText}>‹ Quay lại</Text>
    </Pressable>
  );

  if (!validId) {
    return (
      <Screen eyebrow="Phiên làm việc" title="Kết quả phiên">
        {back}
        <Card>
          <Text style={styles.error} testID="session-detail-error">
            {INVALID_SESSION_ID_MESSAGE}
          </Text>
        </Card>
      </Screen>
    );
  }

  if (loading && !detail) {
    return (
      <Screen eyebrow="Phiên làm việc" title="Kết quả phiên">
        {back}
        <Card>
          <ActivityIndicator color={colors.primary} testID="session-detail-loading" />
          <Text style={styles.muted}>Đang tải phiên…</Text>
        </Card>
      </Screen>
    );
  }

  if (!detail) {
    return (
      <Screen eyebrow="Phiên làm việc" title="Kết quả phiên">
        {back}
        <Card>
          <Text style={styles.error} testID="session-detail-error">
            {error ?? 'Không tìm thấy phiên làm việc.'}
          </Text>
          <Pressable onPress={retry} style={styles.primaryButton} testID="session-detail-retry">
            <Text style={styles.primaryButtonText}>Thử lại</Text>
          </Pressable>
        </Card>
      </Screen>
    );
  }

  const isActive = detail.status === 'Active';
  const start = formatSessionMoment(detail.serverStartTime, profile?.timeZoneId);
  const end = formatSessionMoment(detail.serverEndTime, profile?.timeZoneId);
  const timeZoneId = start?.timeZoneId ?? end?.timeZoneId ?? 'local';
  const usedFallbackTimeZone =
    (start?.usedFallbackTimeZone ?? false) || (end?.usedFallbackTimeZone ?? false);

  return (
    <Screen eyebrow="Phiên làm việc" title="Kết quả phiên">
      {back}

      <Card>
        <Text style={styles.label}>Trạng thái</Text>
        <Text style={styles.status} testID="session-detail-status">
          {formatSessionStatus(detail.status)}
        </Text>
        <Text style={styles.muted} testID="session-detail-gross">
          Thời gian thô: {formatSessionGrossSeconds(detail.grossSeconds)}
        </Text>
        <Text style={styles.muted}>Dự kiến: {formatDuration(detail.plannedSeconds)}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionTitle}>Mốc thời gian</Text>
        <Row
          label="Bắt đầu"
          value={start?.text ?? 'Không đọc được giờ bắt đầu'}
          testID="session-detail-start"
        />
        <Row
          label="Kết thúc"
          value={isActive ? 'Chưa kết thúc' : (end?.text ?? 'Không đọc được giờ kết thúc')}
          testID="session-detail-end"
        />
        <Text style={styles.muted} testID="session-detail-timezone">
          Múi giờ hiển thị: {timeZoneId}
        </Text>
        {usedFallbackTimeZone ? (
          <Text style={styles.warning} testID="session-detail-timezone-fallback">
            Múi giờ trong hồ sơ không hợp lệ nên đang hiển thị giờ cục bộ của máy.
          </Text>
        ) : null}
        <Text style={styles.muted}>
          Đây là thời gian thô do máy chủ lưu, chưa phải điểm chất lượng.
        </Text>
      </Card>

      {isActive ? (
        <>
          <Text style={styles.muted} testID="session-detail-active-note">
            Phiên này vẫn đang chạy nên chưa có giờ kết thúc và thời gian thô.
          </Text>
          <Pressable
            onPress={() => router.push('/focus')}
            style={styles.primaryButton}
            testID="session-detail-open-focus"
          >
            <Text style={styles.primaryButtonText}>Mở tab Tập trung</Text>
          </Pressable>
        </>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value} testID={testID}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md },
  label: { color: colors.muted, fontWeight: '700' },
  value: { color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  sectionTitle: { color: colors.text, fontSize: 17, fontWeight: '800' },
  status: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  muted: { color: colors.muted, lineHeight: 20 },
  warning: { color: colors.danger, fontWeight: '600', lineHeight: 20 },
  error: { color: colors.danger, fontWeight: '600' },
  linkText: { color: colors.primary, fontWeight: '800' },
  primaryButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
});
