import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import type { WorkItemDetail } from '@/core/api/types';
import { formatDeadline } from '@/services/work-item-format';
import { workItemStatusLabel, workItemTypeLabel } from '@/services/work-item-options';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  item: WorkItemDetail;
  onPress: () => void;
};

export function WorkItemCard({ item, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      testID={`work-item-${item.id}`}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      <Card>
        <View style={styles.row}>
          <Text style={styles.type}>
            {workItemTypeLabel(item.type)} · {item.complexity}
          </Text>
          <Text style={styles.status}>{workItemStatusLabel(item.status)}</Text>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        {item.deadline ? (
          <Text style={styles.meta}>Hạn chót: {formatDeadline(item.deadline)}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  type: { color: colors.primary, fontWeight: '800' },
  status: { color: colors.muted, fontWeight: '700' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  meta: { color: colors.muted },
});
