import { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import BottomNav from '@/components/BottomNav';
import CalendarScreen from '@/pages/CalendarScreen';
import ProfileScreen from '@/pages/ProfileScreen';
import TodayScreen from '@/pages/TodayScreen';

type Tab = 'calendar' | 'today' | 'profile';

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>('today');

  return (
    <SafeAreaView className="relative flex-1 bg-background">
      <View className="flex-1">
        {activeTab === 'today' ? <TodayScreen /> : null}
        {activeTab === 'calendar' ? <CalendarScreen /> : null}
        {activeTab === 'profile' ? <ProfileScreen /> : null}
        <BottomNav active={activeTab} hasBadge onNavigate={setActiveTab} />
      </View>
    </SafeAreaView>
  );
};

export default Index;
