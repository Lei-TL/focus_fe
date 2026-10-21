import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Chip } from '@/components/work-items/Chip';
import { useAuth } from '@/context/auth-context';
import { useSession } from '@/context/session-context';
import { isSessionError, type SessionError } from '@/services/session-error';
import {
  clampSessionMinutes,
  minutesToPlannedSeconds,
  sessionDurationOptions,
} from '@/services/session-time';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  workItemId: string;
  workItemTitle: string;
  onStarted?: () => void;
};

export function StartSessionPanel({ workItemId, workItemTitle, onStarted }: Props) {
  const { profile } = useAuth();
  const { start, resume, isStarting } = useSession();
  const defaultMinutes = clampSessionMinutes(profile?.defaultSessionMinutes);
  const options = useMemo(
    () => sessionDurationOptions(profile?.defaultSessionMinutes),
    [profile?.defaultSessionMinutes]
  );
  // Follow the profile default until the user picks a duration. Deriving it
  // also covers a profile that arrives after mount: `defaultMinutes` is then
  // already clamped to 15–90, so the matching chip is highlighted and that
  // value is sent instead of the pre-profile guess.
  const [pickedMinutes, setPickedMinutes] = useState<number | null>(null);
  const minutes = pickedMinutes ?? defaultMinutes;
  const [error, setError] = useState<SessionError | null>(null);
  const [resuming, setResuming] = useState(false);
  const submitRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const busy = isStarting || resuming;

  async function submit() {
    if (submitRef.current || busy) {
      return;
    }
    submitRef.current = true;
    setError(null);
    try {
      await start({
        workItemId,
        workItemTitle,
        plannedSeconds: minutesToPlannedSeconds(minutes),
      });
      if (mountedRef.current) {
        onStarted?.();
      }
    } catch (startError) {
      if (mountedRef.current) {
        setError(
          isSessionError(startError)
            ? startError
            : { code: 'unknown', message: 'Đã có lỗi xảy ra. Vui lòng thử lại.' }
        );
      }
    } finally {
      submitRef.current = false;
    }
  }

  async function openActiveSession() {
    if (!error?.sessionId || submitRef.current) {
      return;
    }
    submitRef.current = true;
    setResuming(true);
    try {
      // Do not reuse this panel's title: the active session may belong to a
      // different work item. The provider resolves the title from the server.
      await resume(error.sessionId);
      if (mountedRef.current) {
        setError(null);
        onStarted?.();
      }
    } catch (resumeError) {
      if (mountedRef.current) {
        setError(
          isSessionError(resumeError)
            ? resumeError
            : { code: 'unknown', message: 'Không mở được phiên đang chạy. Vui lòng thử lại.' }
        );
      }
    } finally {
      if (mountedRef.current) {
        setResuming(false);
      }
      submitRef.current = false;
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Thời lượng</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.chipRow}>
          {options.map((option) => (
            <Chip
              key={option}
              label={`${option} phút`}
              selected={minutes === option}
              disabled={busy}
              onPress={() => setPickedMinutes(option)}
              testID={`session-duration-${option}`}
            />
          ))}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        disabled={busy}
        onPress={() => void submit()}
        style={[styles.startButton, busy && styles.disabled]}
        testID="session-start"
      >
        {busy ? (
          <ActivityIndicator color="#FFFFFF" testID="session-starting" />
        ) : (
          <Text style={styles.startButtonText}>Bắt đầu</Text>
        )}
      </Pressable>

      {error ? (
        <View style={styles.errorBlock}>
          <Text style={styles.error} testID="session-start-error">
            {error.message}
          </Text>
          {error.code === 'activeSessionExists' && error.sessionId ? (
            <Pressable
              onPress={() => void openActiveSession()}
              disabled={busy}
              testID="session-open-active"
            >
              <Text style={styles.linkText}>Mở phiên đang chạy</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { color: colors.text, fontWeight: '700' },
  chipRow: { flexDirection: 'row', gap: spacing.xs, paddingRight: spacing.sm },
  startButton: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  startButtonText: { color: '#FFFFFF', fontWeight: '800', textAlign: 'center' },
  disabled: { opacity: 0.6 },
  errorBlock: { gap: spacing.xs },
  error: { color: colors.danger, fontWeight: '600' },
  linkText: { color: colors.primary, fontWeight: '800' },
});
