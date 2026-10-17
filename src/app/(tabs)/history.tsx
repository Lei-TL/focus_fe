import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/layout/Screen';
import { sampleFocusSessions } from '@/data/sample-focus-sessions';
import { colors, spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  return (
    <Screen eyebrow="MVP · kiểm chứng" title="Lịch sử phiên">
      <Text style={styles.lead}>Đối chiếu thời lượng hiệu dụng, chất lượng và trạng thái hoàn thành/hủy.</Text>
      {sampleFocusSessions.map((session) => (
        <Card key={session.time}>
          <View style={styles.row}><Text style={styles.time}>{session.time}</Text><Text style={styles.score}>{session.score}</Text></View>
          <Text style={styles.status}>{session.status}</Text>
          <Text style={styles.duration}>{session.duration}</Text>
        </Card>
      ))}
      <Text style={styles.warning}>Đang chờ BE chốt API lấy phiên hiện tại, chi tiết và lịch sử phiên.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  time: { color: colors.muted },
  score: { color: colors.primary, fontSize: 24, fontWeight: '900' },
  status: { color: colors.text, fontSize: 18, fontWeight: '800' },
  duration: { color: colors.muted },
  warning: { padding: spacing.md, color: colors.danger, fontWeight: '700' },
});
