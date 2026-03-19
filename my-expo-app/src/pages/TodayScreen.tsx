import { Ionicons } from '@expo/vector-icons';
import { ScrollView, Text, View } from 'react-native';
import MeetingsList from '@/components/MeetingsList';
import ShiftStatusCard from '@/components/ShiftStatusCard';
import TaskList from '@/components/TaskList';

const TodayScreen = () => {
  const hasWarning = true;

  return (
    <ScrollView contentContainerClassName="max-w-md mx-auto space-y-6 px-4 pt-12 pb-28">
      <View>
        <Text className="font-body text-sm text-muted-foreground">Good morning</Text>
        <Text className="font-display text-2xl font-bold text-foreground">Alex</Text>
      </View>

      {hasWarning ? (
        <View className="flex-row items-center gap-3 rounded-xl border border-warning/30 bg-white/75 px-4 py-3">
          <Ionicons color="#f59e0b" name="warning-outline" size={20} />
          <Text className="flex-1 font-body text-sm text-foreground">
            You have <Text className="font-semibold text-warning">1 overdue</Text> task from yesterday
          </Text>
        </View>
      ) : null}

      <ShiftStatusCard />
      <TaskList />
      <MeetingsList />
    </ScrollView>
  );
};

export default TodayScreen;
