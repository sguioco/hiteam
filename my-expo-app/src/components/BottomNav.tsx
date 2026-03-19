import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomNavProps {
  active: 'calendar' | 'today' | 'profile';
  onNavigate: (tab: 'calendar' | 'today' | 'profile') => void;
  hasBadge?: boolean;
}

const BottomNav = ({ active, onNavigate, hasBadge = false }: BottomNavProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50" style={{ paddingBottom: Math.max(insets.bottom, 10) }}>
      <View className="rounded-t-3xl border border-white/70 bg-white/90">
        <View className="flex-row items-end justify-around px-6 pb-4 pt-3">
          <Pressable
            className="flex flex-col items-center gap-1"
            onPress={() => onNavigate('calendar')}
          >
            <Ionicons color={active === 'calendar' ? '#6d73ff' : '#6b7a90'} name="calendar-outline" size={24} />
            <Text className={`text-[11px] font-medium ${active === 'calendar' ? 'text-primary' : 'text-muted-foreground'}`}>Calendar</Text>
          </Pressable>

          <Pressable className="relative -mt-6 flex flex-col items-center" onPress={() => onNavigate('today')}>
            <View className={`h-16 w-16 items-center justify-center rounded-full shadow-lg ${active === 'today' ? 'scale-105 bg-primary' : 'bg-primary/90'}`}>
              <Text className="font-display text-lg font-bold text-primary-foreground">T</Text>
              {hasBadge ? <View className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-card bg-warning" /> : null}
            </View>
            <Text className={`mt-1 text-[11px] font-medium ${active === 'today' ? 'text-primary' : 'text-muted-foreground'}`}>Today</Text>
          </Pressable>

          <Pressable className="flex flex-col items-center gap-1" onPress={() => onNavigate('profile')}>
            <Ionicons color={active === 'profile' ? '#6d73ff' : '#6b7a90'} name="person-outline" size={24} />
            <Text className={`text-[11px] font-medium ${active === 'profile' ? 'text-primary' : 'text-muted-foreground'}`}>Profile</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default BottomNav;
