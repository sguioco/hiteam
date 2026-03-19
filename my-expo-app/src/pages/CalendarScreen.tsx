import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const CalendarScreen = () => {
  const [currentDate] = useState(new Date());
  const today = currentDate.getDate();
  const month = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const year = currentDate.getFullYear();
  const m = currentDate.getMonth();
  const firstDay = (new Date(year, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  const shifts = [10, 11, 12, 13, 14, 17, 18, 19, 20, 21];

  return (
    <ScrollView contentContainerClassName="max-w-md mx-auto space-y-6 px-4 pt-12 pb-28">
      <Text className="font-display text-2xl font-bold text-foreground">Calendar</Text>

      <View className="rounded-2xl border border-white/50 bg-white/75 p-5">
        <View className="mb-5 flex-row items-center justify-between">
          <Pressable className="rounded-lg p-2">
            <Ionicons color="#27364b" name="chevron-back" size={20} />
          </Pressable>
          <Text className="font-display font-semibold text-foreground">{month}</Text>
          <Pressable className="rounded-lg p-2">
            <Ionicons color="#27364b" name="chevron-forward" size={20} />
          </Pressable>
        </View>

        <View className="mb-2 flex-row flex-wrap">
          {DAYS.map((day) => (
            <View key={day} className="w-[14.28%] items-center">
              <Text className="py-1 text-center font-body text-xs font-medium text-muted-foreground">{day}</Text>
            </View>
          ))}
        </View>

        <View className="flex-row flex-wrap">
          {cells.map((day, index) => (
            <View key={`${day}-${index}`} className="w-[14.28%] items-center justify-center py-1">
              {day !== null ? (
                <Pressable className={`h-10 w-10 items-center justify-center rounded-xl ${day === today ? 'bg-primary' : ''}`}>
                  <Text className={`text-sm font-medium ${day === today ? 'text-primary-foreground' : 'text-foreground'}`}>{day}</Text>
                  {shifts.includes(day) && day !== today ? <View className="mt-0.5 h-1 w-1 rounded-full bg-primary" /> : null}
                </Pressable>
              ) : (
                <View className="h-10 w-10" />
              )}
            </View>
          ))}
        </View>
      </View>

      <View className="space-y-3">
        <Text className="font-display text-lg font-semibold text-foreground">Upcoming Shifts</Text>
        {[
          { date: 'Tomorrow', time: '09:00 — 18:00' },
          { date: 'March 16', time: '10:00 — 19:00' },
        ].map((shift, index) => (
          <View key={`${shift.date}-${index}`} className="rounded-xl border border-white/50 bg-white/75 px-4 py-3.5">
            <View className="flex-row items-center justify-between">
              <Text className="font-body text-[15px] font-medium text-foreground">{shift.date}</Text>
              <Text className="font-body text-sm text-muted-foreground">{shift.time}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default CalendarScreen;
