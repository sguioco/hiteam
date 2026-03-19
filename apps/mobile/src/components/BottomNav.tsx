import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';

interface BottomNavProps {
  active: 'calendar' | 'today' | 'manage' | 'profile';
  onNavigate: (tab: 'calendar' | 'today' | 'manage' | 'profile') => void;
  hasBadge?: boolean;
  showManage?: boolean;
}

const BottomNav = ({ active, onNavigate, hasBadge = false, showManage = false }: BottomNavProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  function NavItem({
    tab,
    icon,
    label,
  }: {
    tab: 'calendar' | 'manage' | 'profile';
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
  }) {
    const isActive = active === tab;
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <Pressable
        className="flex flex-col items-center gap-0.5"
        onPress={() => {
          hapticSelection();
          onNavigate(tab);
        }}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 22, stiffness: 360 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 22, stiffness: 320 });
        }}
      >
        <Animated.View className="items-center gap-0.5" style={animatedStyle}>
          <Ionicons color={isActive ? '#6d73ff' : '#6b7a90'} name={icon} size={22} />
          <Text className={`text-[11px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>{label}</Text>
        </Animated.View>
      </Pressable>
    );
  }

  const centerScale = useSharedValue(active === 'today' ? 1.03 : 1);
  const centerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: centerScale.value }],
  }));

  function TodayButton({ floating = false }: { floating?: boolean }) {
    return (
      <Pressable
        className={floating ? 'absolute left-1 -top-6 items-center' : 'relative -mt-5 flex flex-col items-center'}
        onPress={() => {
          hapticSelection();
          onNavigate('today');
        }}
        onPressIn={() => {
          centerScale.value = withSpring(0.98, { damping: 22, stiffness: 360 });
        }}
        onPressOut={() => {
          centerScale.value = withSpring(active === 'today' ? 1.03 : 1, {
            damping: 22,
            stiffness: 320,
          });
        }}
      >
        <Animated.View style={centerAnimatedStyle}>
          <View
            className={`h-16 w-16 items-center justify-center rounded-full shadow-lg shadow-[#6d73ff]/25 ${
              active === 'today' ? 'bg-primary' : 'bg-primary/90'
            }`}
          >
            <Ionicons color="#ffffff" name="list-outline" size={28} />
            {hasBadge ? (
              <View className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-card bg-warning" />
            ) : null}
          </View>
        </Animated.View>
        <Text className={`mt-1 text-[11px] font-medium ${active === 'today' ? 'text-primary' : 'text-muted-foreground'}`}>
          {t('nav.today')}
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50">
      <View
        className="overflow-visible border-t border-white/90 shadow-lg shadow-[#1f2687]/12"
        style={{ paddingBottom: Math.max(insets.bottom, 8) }}
      >
        <BlurView className="absolute inset-0" intensity={24} tint="light" />
        <View className="absolute inset-0 bg-[#f7faff]" />
        <View className="px-6 pb-0.5 pt-4">
          <View className={`flex-row items-end ${showManage ? 'justify-between pl-32' : 'justify-around'}`}>
            {showManage ? <NavItem icon="eye-outline" label={t('nav.manage')} tab="manage" /> : null}
            <NavItem icon="calendar-outline" label={t('nav.calendar')} tab="calendar" />
            {showManage ? <NavItem icon="person-outline" label={t('nav.profile')} tab="profile" /> : <TodayButton />}
            {showManage ? <TodayButton floating /> : <NavItem icon="person-outline" label={t('nav.profile')} tab="profile" />}
          </View>
        </View>
      </View>
    </View>
  );
};

export default BottomNav;
