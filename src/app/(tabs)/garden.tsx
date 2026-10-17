import { Canvas, Circle, Line, vec } from '@shopify/react-native-skia';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/layout/Screen';
import { colors, spacing } from '@/theme/tokens';

export default function GardenScreen() {
  return (
    <Screen eyebrow="MVP · bước 7–8" title="Thống kê & vườn cây">
      <Card>
        <View style={styles.stats}>
          <View><Text style={styles.value}>9</Text><Text style={styles.label}>phiên hợp lệ</Text></View>
          <View><Text style={styles.value}>82</Text><Text style={styles.label}>điểm TB</Text></View>
          <View><Text style={styles.value}>4</Text><Text style={styles.label}>ngày streak</Text></View>
        </View>
      </Card>
      <View style={styles.treeCard}>
        <Canvas style={styles.canvas}>
          <Line p1={vec(150, 230)} p2={vec(150, 95)} color="#6D4C2F" strokeWidth={18} strokeCap="round" />
          <Line p1={vec(150, 140)} p2={vec(85, 90)} color="#6D4C2F" strokeWidth={9} strokeCap="round" />
          <Line p1={vec(150, 125)} p2={vec(215, 70)} color="#6D4C2F" strokeWidth={9} strokeCap="round" />
          <Circle cx={80} cy={78} r={30} color="#7FAC4A" />
          <Circle cx={150} cy={72} r={38} color="#8EBB54" />
          <Circle cx={220} cy={58} r={28} color="#6D9C3F" />
        </Canvas>
        <Text style={styles.caption}>Cây tháng được tái tạo từ dữ liệu + seed; không lưu ảnh hay hình học.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', justifyContent: 'space-between' },
  value: { color: colors.primary, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  label: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  treeCard: { padding: spacing.md, borderRadius: 20, backgroundColor: colors.primarySoft },
  canvas: { height: 250 },
  caption: { color: colors.primary, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
});
