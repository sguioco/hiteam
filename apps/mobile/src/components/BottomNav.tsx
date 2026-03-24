import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
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
  const navShellOffset = 75;
  const navContentOffset = 0;

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
        className="flex min-w-[56px] flex-col items-center gap-1"
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
        <Animated.View className="items-center gap-1" style={animatedStyle}>
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
        className={floating ? 'absolute z-10 items-center' : 'relative -mt-4 flex flex-col items-center'}
        style={
          floating
            ? showManage
              ? { left: 28, top: -18 }
              : { left: '50%', top: -28, transform: [{ translateX: -31 }] }
            : undefined
        }
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
            className={`h-[62px] w-[62px] items-center justify-center rounded-full shadow-lg shadow-[#6d73ff]/25 ${
              active === 'today' ? 'bg-primary' : 'bg-primary/90'
            }`}
          >
            <Ionicons color="#ffffff" name="list-outline" size={27} />
            {hasBadge ? (
              <View className="absolute right-[1px] top-[1px] h-4 w-4 rounded-full border-2 border-card bg-warning" />
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
    <View className="absolute left-0 right-0 z-50" style={{ bottom: -navShellOffset }}>
      <View className="overflow-visible" style={{ paddingBottom: Math.max(insets.bottom - 28, 16) }}>
        <View
          className="overflow-hidden border-t border-[#edf1f7] bg-white shadow-lg shadow-[#1f2687]/10"
          style={{ minHeight: 106 + insets.bottom }}
        >
          <View className="px-8 pb-4 pt-3" style={{ transform: [{ translateY: navContentOffset }] }}>
            {showManage ? (
              <View className="flex-row items-end gap-10 pl-[50px]" style={{ marginLeft: 40 }}>
                <View className="w-[64px] items-center">
                  <NavItem icon="eye-outline" label={t('nav.manage')} tab="manage" />
                </View>
                <View className="w-[64px] items-center">
                  <NavItem icon="calendar-outline" label={t('nav.calendar')} tab="calendar" />
                </View>
                <View className="w-[64px] items-center">
                  <NavItem icon="person-outline" label={t('nav.profile')} tab="profile" />
                </View>
              </View>
            ) : (
              <View className="flex-row items-end justify-between px-3">
                <View className="items-center">
                  <NavItem icon="calendar-outline" label={t('nav.calendar')} tab="calendar" />
                </View>
                <View className="items-center">
                  <NavItem icon="person-outline" label={t('nav.profile')} tab="profile" />
                </View>
              </View>
            )}
          </View>
        </View>
        <TodayButton floating />
      </View>
    </View>
  );
};

export default BottomNav;
