import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/ui/text';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';

interface BottomNavProps {
  active: 'calendar' | 'today' | 'manage' | 'news' | 'profile';
  onNavigate: (tab: 'calendar' | 'today' | 'manage' | 'news' | 'profile') => void;
  hasBadge?: boolean;
  showManage?: boolean;
}

const BottomNav = ({ active, onNavigate, hasBadge = false, showManage = false }: BottomNavProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const navShellOffset = 75;
  const navContentOffset = 0;
  const navLabelStyle = {
    textAlign: 'center' as const,
    includeFontPadding: false,
    width: '100%' as const,
  };

  function NavItem({
    tab,
    icon,
    label,
  }: {
    tab: 'calendar' | 'manage' | 'news' | 'profile';
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
        className="flex w-full flex-col items-center gap-1"
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
          <Text
            adjustsFontSizeToFit
            className={`w-full text-center text-[11px] font-medium ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
            minimumFontScale={0.72}
            numberOfLines={1}
            style={navLabelStyle}
          >
            {label}
          </Text>
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
            ? { left: 24, top: -18, width: 74, alignItems: 'center' }
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
            className="h-[62px] w-[62px] items-center justify-center rounded-full bg-primary shadow-lg shadow-[#6d73ff]/25"
          >
            <Ionicons color="#ffffff" name="list-outline" size={27} />
            {hasBadge ? (
              <View className="absolute right-[1px] top-[1px] h-4 w-4 rounded-full border-2 border-card bg-warning" />
            ) : null}
          </View>
        </Animated.View>
        <Text
          adjustsFontSizeToFit
          className={`mt-1 w-[72px] text-center text-[11px] font-medium ${active === 'today' ? 'text-primary' : 'text-muted-foreground'}`}
          minimumFontScale={0.72}
          numberOfLines={1}
          style={navLabelStyle}
        >
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
          <View className="px-10 pb-4 pt-3" style={{ transform: [{ translateY: navContentOffset }] }}>
            <View className="flex-row items-end justify-between" style={{ paddingLeft: 84 }}>
              <View className="w-[72px] items-center">
                <NavItem
                  icon={showManage ? 'eye-outline' : 'newspaper-outline'}
                  label={showManage ? t('nav.manage') : t('nav.news')}
                  tab={showManage ? 'manage' : 'news'}
                />
              </View>
              <View className="w-[72px] items-center">
                <NavItem icon="calendar-outline" label={t('nav.calendar')} tab="calendar" />
              </View>
              <View className="w-[72px] items-center">
                <NavItem icon="person-outline" label={t('nav.profile')} tab="profile" />
              </View>
            </View>
          </View>
        </View>
        <TodayButton floating />
      </View>
    </View>
  );
};

export default BottomNav;

