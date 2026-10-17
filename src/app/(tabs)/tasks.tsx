import { StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components/layout/Screen';
import { Card } from '@/components/ui/Card';
import { sampleWorkItems } from '@/data/sample-work-items';
import { colors, radius, spacing } from '@/theme/tokens';

export default function TasksScreen() {
  return (
    <Screen eyebrow="MVP · bước 1–3" title="Danh sách công việc">
      <Text style={styles.lead}>Danh sách đã xếp hạng, luôn kèm lý do để người dùng hiểu vì sao nên làm trước.</Text>
      {sampleWorkItems.map((item) => (
        <Card key={item.id}>
          <View style={styles.row}>
            <Text style={styles.type}>{item.type} · {item.complexity}</Text>
            <Text style={styles.score}>{item.priorityScore}</Text>
          </View>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>{item.completedSessions}/{item.estimatedSessions} phiên · {item.priorityExplanation}</Text>
        </Card>
      ))}
      <View style={styles.filter}><Text style={styles.filterText}>Bộ lọc dự kiến: SDLC · độ phức tạp · trạng thái</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  lead: { color: colors.muted, lineHeight: 21 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { color: colors.primary, fontWeight: '800' },
  score: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted, lineHeight: 20 },
  filter: { padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.primarySoft },
  filterText: { color: colors.primary, fontWeight: '700' },
});
