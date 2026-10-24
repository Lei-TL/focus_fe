import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme/tokens';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type TabBarIconProps = { focused: boolean; color: ColorValue; size: number };

function tabBarIcon(outline: IoniconName, filled: IoniconName) {
  return function TabBarIcon({ focused, color, size }: TabBarIconProps) {
    // Navigation types the tint as ColorValue; Ionicons expects a string tint.
    return <Ionicons name={focused ? filled : outline} size={size} color={color as string} />;
  };
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="tasks"
        options={{ title: 'Công việc', tabBarIcon: tabBarIcon('checkbox-outline', 'checkbox') }}
      />
      <Tabs.Screen
        name="focus"
        options={{ title: 'Tập trung', tabBarIcon: tabBarIcon('timer-outline', 'timer') }}
      />
      <Tabs.Screen
        name="history"
        options={{ title: 'Lịch sử', tabBarIcon: tabBarIcon('time-outline', 'time') }}
      />
      <Tabs.Screen
        name="garden"
        options={{ title: 'Vườn cây', tabBarIcon: tabBarIcon('leaf-outline', 'leaf') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Hồ sơ', tabBarIcon: tabBarIcon('person-outline', 'person') }}
      />
    </Tabs>
  );
}
