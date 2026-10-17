import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.brand}>FOCUS</Text>
      <Text style={styles.title}>Làm việc có chủ đích. Nhìn thấy tiến bộ.</Text>
      <Text style={styles.body}>Quản lý WorkItem, chạy phiên tập trung và nuôi cây tháng từ dữ liệu làm việc thật.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/(tabs)/tasks')}>
        <Text style={styles.buttonText}>Vào bản khung MVP</Text>
      </Pressable>
      <Text style={styles.note}>Màn đăng nhập/đăng ký sẽ nối với API Auth M1.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.background },
  brand: { color: colors.primary, fontSize: 14, fontWeight: '900', letterSpacing: 4 },
  title: { color: colors.text, fontSize: 38, lineHeight: 44, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 17, lineHeight: 25 },
  button: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primary },
  buttonText: { color: '#FFFFFF', textAlign: 'center', fontWeight: '800', fontSize: 16 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center' },
});
