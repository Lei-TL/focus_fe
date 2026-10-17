import { useEffect, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/layout/Screen';
import { colors, spacing } from '@/theme/tokens';

export default function FocusScreen() {
  const [appState, setAppState] = useState(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  return (
    <Screen eyebrow="MVP · bước 4–6" title="Phiên tập trung">
      <Card>
        <Text style={styles.label}>Tác vụ hiện tại</Text>
        <Text style={styles.task}>Tích hợp heartbeat cho phiên</Text>
        <Text style={styles.timer}>24:38</Text>
        <Text style={styles.meta}>Mốc thời gian do server quyết định · heartbeat định kỳ</Text>
      </Card>
      <View style={styles.evidence}>
        <Text style={styles.evidenceTitle}>Bằng chứng phiên</Text>
        <Text style={styles.evidenceText}>AppState hiện tại: {appState}</Text>
        <Text style={styles.evidenceText}>FE ghi nhận chuyển nền; BE tính thời gian hiệu dụng và điểm chất lượng.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.primary, fontWeight: '800' },
  task: { color: colors.text, fontSize: 19, fontWeight: '800' },
  timer: { color: colors.primary, fontSize: 58, fontWeight: '900', textAlign: 'center', marginVertical: spacing.lg },
  meta: { color: colors.muted, textAlign: 'center' },
  evidence: { gap: spacing.sm, padding: spacing.md },
  evidenceTitle: { color: colors.text, fontSize: 18, fontWeight: '800' },
  evidenceText: { color: colors.muted, lineHeight: 20 },
});
