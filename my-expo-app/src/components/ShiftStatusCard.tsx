import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

const ShiftStatusCard = () => {
  const [checkedIn, setCheckedIn] = useState(false);

  return (
    <View className="relative overflow-hidden rounded-3xl">
      <View className="absolute inset-0 bg-[#f3c977]" />
      <View className="absolute -left-8 -top-6 h-44 w-44 rounded-full bg-[#ffcc4d]" />
      <View className="absolute left-16 top-10 h-56 w-56 rounded-full bg-[#ff4f8b]/70" />
      <View className="absolute -right-12 bottom-[-20] h-64 w-64 rounded-full bg-[#8e83ff]/70" />
      <View className="absolute inset-0 flex-row justify-around px-4">
        {Array.from({ length: 14 }).map((_, index) => (
          <View key={index} className="h-full w-[3px] rounded-full bg-white/20" />
        ))}
      </View>

      <View className="relative z-10 min-h-[220px] justify-between p-6">
        <View className="flex-row items-center gap-2 self-end rounded-full border border-white/25 bg-white/20 px-3 py-1.5">
          <Ionicons color="#10b981" name="location-outline" size={12} />
          <Ionicons color="#10b981" name="phone-portrait-outline" size={12} />
          <Ionicons color="#10b981" name="shield-checkmark-outline" size={12} />
        </View>

        <View className="mt-6">
          <Text className="font-body text-sm text-white/80">Today&apos;s Shift</Text>
          <Text className="mt-1 font-display text-3xl font-bold text-white">
            {checkedIn ? 'On Shift' : 'Ready'}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Ionicons color="rgba(255,255,255,0.75)" name="time-outline" size={16} />
            <Text className="font-body text-sm text-white/80">09:00 - 18:00</Text>
          </View>
        </View>

        <View className="mt-4">
          {!checkedIn ? (
            <Pressable
              className="w-full rounded-xl bg-success px-4 py-3.5 shadow-lg"
              onPress={() => setCheckedIn(true)}
            >
              <Text className="text-center font-display text-base font-semibold text-success-foreground">👋 Say Hi</Text>
            </Pressable>
          ) : (
            <Pressable
              className="w-full rounded-xl bg-warning px-4 py-3.5 shadow-lg"
              onPress={() => setCheckedIn(false)}
            >
              <Text className="text-center font-display text-base font-semibold text-warning-foreground">👋 Say Goodbye</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
};

export default ShiftStatusCard;
