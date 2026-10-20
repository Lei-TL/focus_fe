import { Stack } from 'expo-router';

import { colors } from '@/theme/tokens';

export const unstable_settings = {
  anchor: 'index',
};

export default function TasksLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
