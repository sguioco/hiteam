import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, Text, View } from 'react-native';
import { useI18n } from '../../lib/i18n';

function TabIcon({
  focused,
  iconName,
  label,
  raised = false,
}: {
  focused: boolean;
  iconName: keyof typeof Ionicons.glyphMap;
  label: string;
  raised?: boolean;
}) {
  return (
    <View className={`items-center justify-center ${raised ? '-mt-5' : ''}`}>
      <View
        className={`items-center justify-center rounded-full border border-white/80 shadow-panel ${
          raised ? 'h-16 w-16' : 'h-12 w-12'
        } ${focused ? 'bg-brand' : 'bg-surface'}`}
      >
        <Ionicons color={focused ? '#ffffff' : '#111827'} name={iconName} size={raised ? 28 : 22} />
      </View>
      <Text className={`mt-1 text-[11px] font-bold ${focused ? 'text-foreground' : 'text-muted'}`}>{label}</Text>
    </View>
  );
}

export default function EmployeeTabsLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#f6f8fc',
          borderTopColor: '#e5e7eb',
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 92 : 80,
          paddingBottom: Platform.OS === 'ios' ? 22 : 10,
          paddingTop: 10,
          elevation: 0,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="calendar"
        options={{
          title: t('nav.calendar'),
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="calendar-outline" label={t('nav.calendar')} />,
        }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: t('nav.today'),
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="checkmark-done-outline" label={t('nav.today')} raised />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('nav.profile'),
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} iconName="person-outline" label={t('nav.profile')} />,
        }}
      />
    </Tabs>
  );
}
