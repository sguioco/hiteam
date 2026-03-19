import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useI18n } from '../../lib/i18n';
import { hapticSelection } from '../../lib/haptics';
import MeetingsList from '../components/MeetingsList';
import ShiftStatusCard from '../components/ShiftStatusCard';
import TaskList from '../components/TaskList';

type TodayScreenProps = {
  hasWarning: boolean;
  overdueCount: number;
  onOpenOverdue: () => void;
};

const TodayScreen = ({ hasWarning, onOpenOverdue, overdueCount }: TodayScreenProps) => {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <ScrollView
      className="flex-1 bg-transparent"
      contentContainerStyle={{ paddingBottom: 112, paddingTop: 0 }}
      showsVerticalScrollIndicator={false}
    >
      <View className="gap-5">
        <View style={{ marginHorizontal: -16 }}>
          <ShiftStatusCard greeting="Hi" name="Alex" topInset={insets.top} />
        </View>

        <View className="px-4">
          {hasWarning ? (
            <Animated.View
              entering={FadeInDown.duration(180).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 8 }],
              })}
            >
              <Pressable
                className="mb-4 flex-row items-center gap-3 rounded-2xl border border-warning/30 bg-white/70 px-4 py-3 shadow-sm shadow-[#1f2687]/10"
                onPress={() => {
                  hapticSelection();
                  onOpenOverdue();
                }}
              >
                <Ionicons color="#f59e0b" name="warning-outline" size={20} />
                <Text className="flex-1 font-body text-sm text-foreground">
                  {t('today.overdueBanner', { count: overdueCount })}
                </Text>
                <Ionicons color="#f59e0b" name="chevron-forward" size={16} />
              </Pressable>
            </Animated.View>
          ) : null}

          <TaskList />
          <MeetingsList />
        </View>
      </View>
    </ScrollView>
  );
};

export default TodayScreen;
