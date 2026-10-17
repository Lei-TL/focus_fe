import { StyleSheet, Text } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/layout/Screen';
import { colors } from '@/theme/tokens';

export default function ProfileScreen() {
  return (
    <Screen eyebrow="Tài khoản" title="Hồ sơ">
      <Card>
        <Text style={styles.name}>Người dùng Focus</Text>
        <Text style={styles.meta}>Hồ sơ cá nhân · phiên đăng nhập · đăng xuất</Text>
      </Card>
      <Card>
        <Text style={styles.heading}>Nguyên tắc MVP</Text>
        <Text style={styles.meta}>Server time là nguồn chuẩn. FE không tự chấm điểm chất lượng và không tự quyết định trạng thái phiên.</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  name: { color: colors.text, fontSize: 20, fontWeight: '800' },
  heading: { color: colors.primary, fontSize: 16, fontWeight: '800' },
  meta: { color: colors.muted, lineHeight: 21 },
});
