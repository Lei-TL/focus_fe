import { Pressable, StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/layout/Screen';
import { useAuth } from '@/context/auth-context';
import { colors, radius, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const { profile, logout } = useAuth();

  return (
    <Screen eyebrow="Tài khoản" title="Hồ sơ">
      <Card>
        <Text style={styles.name}>{profile?.displayName ?? 'Người dùng Focus'}</Text>
        {profile?.email ? <Text style={styles.meta}>{profile.email}</Text> : null}
        {profile?.role ? <Text style={styles.meta}>Vai trò: {profile.role}</Text> : null}
        {profile ? <Text style={styles.meta}>Múi giờ: {profile.timeZoneId}</Text> : null}
        {profile ? (
          <Text style={styles.meta}>Phiên mặc định: {profile.defaultSessionMinutes} phút</Text>
        ) : null}
      </Card>
      <Card>
        <Pressable style={styles.button} onPress={() => void logout()} testID="profile-logout">
          <Text style={styles.buttonText}>Đăng xuất</Text>
        </Pressable>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  meta: { color: colors.muted, lineHeight: 21 },
  button: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 },
});
