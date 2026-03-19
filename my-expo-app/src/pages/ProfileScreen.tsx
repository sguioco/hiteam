import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, Text, View } from 'react-native';

const ProfileScreen = () => {
  return (
    <ScrollView contentContainerClassName="max-w-md mx-auto space-y-6 px-4 pt-12 pb-28">
      <View className="items-center">
        <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Ionicons color="#6d73ff" name="person-outline" size={40} />
        </View>
        <Text className="font-display text-xl font-bold text-foreground">Alex Johnson</Text>
        <Text className="font-body text-sm text-muted-foreground">Frontend Developer</Text>
      </View>

      <View className="overflow-hidden rounded-2xl border border-white/50 bg-white/75">
        {[
          { icon: 'mail-outline', label: 'Email', value: 'alex@company.com' },
          { icon: 'business-outline', label: 'Department', value: 'Engineering' },
          { icon: 'call-outline', label: 'Phone', value: '+1 234 567 890' },
        ].map(({ icon, label, value }, index, array) => (
          <View key={label} className={`flex-row items-center gap-3 px-4 py-3.5 ${index < array.length - 1 ? 'border-b border-border' : ''}`}>
            <Ionicons color="#6b7a90" name={icon as keyof typeof Ionicons.glyphMap} size={20} />
            <View className="flex-1">
              <Text className="font-body text-xs text-muted-foreground">{label}</Text>
              <Text className="font-body text-[15px] text-foreground">{value}</Text>
            </View>
          </View>
        ))}
      </View>

      <View className="space-y-3">
        <Text className="font-display text-lg font-semibold text-foreground">Security</Text>
        <View className="overflow-hidden rounded-2xl border border-white/50 bg-white/75">
          {[
            { icon: 'phone-portrait-outline', label: 'Primary Device', status: 'Linked', ok: true },
            { icon: 'shield-checkmark-outline', label: 'Face Verification', status: 'Enrolled', ok: true },
          ].map(({ icon, label, status, ok }, index, array) => (
            <View key={label} className={`flex-row items-center gap-3 px-4 py-3.5 ${index < array.length - 1 ? 'border-b border-border' : ''}`}>
              <Ionicons color="#6b7a90" name={icon as keyof typeof Ionicons.glyphMap} size={20} />
              <Text className="flex-1 font-body text-[15px] text-foreground">{label}</Text>
              <View className={`rounded-full px-2 py-1 ${ok ? 'bg-success/10' : 'bg-warning/10'}`}>
                <Text className={`text-xs font-medium ${ok ? 'text-success' : 'text-warning'}`}>{status}</Text>
              </View>
              <Ionicons color="#6b7a90" name="chevron-forward" size={16} />
            </View>
          ))}
        </View>
      </View>

      <Pressable className="flex-row items-center gap-3 rounded-xl border border-white/50 bg-white/75 px-4 py-3.5">
        <Ionicons color="#f25555" name="log-out-outline" size={20} />
        <Text className="font-body text-[15px] font-medium text-destructive">Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
};

export default ProfileScreen;
