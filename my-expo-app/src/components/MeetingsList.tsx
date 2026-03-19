import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';

const meetings = [
  { id: '1', title: 'Standup', time: '10:00', duration: '15 min', isNow: true },
  { id: '2', title: 'Design Review', time: '14:00', duration: '30 min', isNow: false },
];

const MeetingsList = () => {
  return (
    <View className="gap-3">
      <Text className="font-display text-lg font-semibold text-foreground">Meetings</Text>
      <View className="gap-2">
        {meetings.map((meeting) => (
          <View
            key={meeting.id}
            className={`flex-row items-center gap-3 rounded-xl border bg-white/75 px-4 py-3.5 ${
              meeting.isNow ? 'border-primary/30' : 'border-white/50'
            }`}
          >
            <View className={`h-10 w-10 items-center justify-center rounded-lg ${meeting.isNow ? 'bg-primary/10' : 'bg-muted'}`}>
              <Ionicons color={meeting.isNow ? '#6d73ff' : '#6b7a90'} name="videocam-outline" size={20} />
            </View>
            <View className="flex-1">
              <Text className="font-body text-[15px] font-medium text-foreground">{meeting.title}</Text>
              <View className="mt-0.5 flex-row items-center gap-1.5">
                <Ionicons color="#6b7a90" name="time-outline" size={12} />
                <Text className="font-body text-xs text-muted-foreground">
                  {meeting.time} · {meeting.duration}
                </Text>
              </View>
            </View>
            {meeting.isNow ? (
              <View className="rounded-full bg-primary/10 px-2 py-1">
                <Text className="font-body text-xs font-medium text-primary">Now</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
};

export default MeetingsList;
