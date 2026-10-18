import { useEffect } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/context/auth-context';
import { colors, radius, spacing } from '@/theme/tokens';

export default function BootstrapScreen() {
  const { status, retryLogout } = useAuth();

  useEffect(() => {
    if (status === 'signedIn') {
      router.replace('/(tabs)/tasks');
    } else if (status === 'signedOut' || status === 'retryableError') {
      router.replace('/(auth)/login');
    }
  }, [status]);

  if (status === 'logoutError') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Đăng xuất chưa hoàn tất</Text>
        <Text style={styles.body}>
          Không xóa được phiên đăng nhập trên thiết bị. Vui lòng thử lại.
        </Text>
        <Pressable style={styles.button} onPress={() => void retryLogout()} testID="index-retry-logout">
          <Text style={styles.buttonText}>Thử lại</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.body}>Đang tải phiên đăng nhập…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.muted, textAlign: 'center' },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 },
});
