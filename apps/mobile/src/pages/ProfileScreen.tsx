import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  getLanguageLabel,
  useI18n,
} from '../../lib/i18n';
import { signOutLocally } from '../../lib/auth-flow';
import { hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../components/BottomSheetModal';

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, t } = useI18n();
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const profileItems = [
    { icon: 'mail-outline', label: 'Email', value: 'alex@company.com' },
    { icon: 'business-outline', label: 'Department', value: 'Engineering' },
    { icon: 'call-outline', label: 'Phone', value: '+1 234 567 890' },
  ] as const;

  function handleSignOut() {
    setSignOutConfirmOpen(true);
  }

  return (
    <>
      <View className="flex-1 bg-[#41e4f6]">
        <StatusBar backgroundColor="transparent" style="dark" translucent />
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{ paddingBottom: 112, paddingHorizontal: 16, paddingTop: insets.top + 20 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
          <Animated.View
            entering={FadeInDown.duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            className="items-center"
          >
            <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
              <Ionicons color="#6d73ff" name="person-outline" size={40} />
            </View>
            <Text className="font-display text-xl font-bold text-foreground">Alex Johnson</Text>
            <Text className="font-body text-sm text-muted-foreground">Frontend Developer</Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(30).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            className="overflow-hidden rounded-3xl border border-white/30 bg-white/70 shadow-sm shadow-[#1f2687]/10"
          >
            {profileItems.map((item, index) => (
              <View
                key={item.label}
                className={`flex-row items-center gap-3 px-4 py-4 ${index < profileItems.length - 1 ? 'border-b border-border' : ''}`}
              >
                <Ionicons color="#6b7a90" name={item.icon} size={20} />
                <View className="flex-1">
                  <Text className="font-body text-xs text-muted-foreground">{item.label}</Text>
                  <Text className="font-body text-[15px] text-foreground">{item.value}</Text>
                </View>
              </View>
            ))}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(45).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
          >
            <PressableScale
              className="flex-row items-center gap-3 rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
              haptic="selection"
              onPress={() => router.push('/auth/language')}
            >
              <Text className="text-lg">{language === 'ru' ? '🇷🇺' : '🇺🇸'}</Text>
              <View className="flex-1">
                <Text className="font-body text-xs text-muted-foreground">{t('profile.language')}</Text>
                <Text className="font-body text-[15px] text-foreground">{getLanguageLabel(language)}</Text>
              </View>
              <Ionicons color="#6b7a90" name="chevron-forward" size={18} />
            </PressableScale>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(75).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
          >
            <PressableScale
              className="flex-row items-center gap-3 rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
              haptic="selection"
              onPress={() => router.push('/notifications')}
            >
              <Ionicons color="#6b7a90" name="notifications-outline" size={20} />
              <Text className="flex-1 font-body text-[15px] text-foreground">{t('profile.notifications')}</Text>
              <Ionicons color="#6b7a90" name="chevron-forward" size={18} />
            </PressableScale>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(105).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
          >
            <PressableScale
              className="flex-row items-center gap-3 rounded-2xl border border-white/30 bg-white/70 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
              haptic="warning"
              onPress={handleSignOut}
            >
              <Ionicons color="#f25555" name="log-out-outline" size={20} />
              <Text className="font-body text-[15px] font-medium text-destructive">{t('profile.signOutButton')}</Text>
            </PressableScale>
          </Animated.View>
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        onClose={() => setSignOutConfirmOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={signOutConfirmOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">{t('profile.signOutTitle')}</Text>
            <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">{t('profile.signOutBody')}</Text>
          </View>
          <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-muted/80" haptic="selection" onPress={() => setSignOutConfirmOpen(false)}>
            <Ionicons color="#111827" name="close" size={18} />
          </PressableScale>
        </View>

        <View className="flex-row gap-3">
          <PressableScale className="flex-1 rounded-[24px] bg-[#eef5ff] px-4 py-4" containerClassName="flex-1" haptic="selection" onPress={() => setSignOutConfirmOpen(false)}>
            <Text className="text-center font-display text-[16px] font-bold text-[#234067]">{t('profile.cancel')}</Text>
          </PressableScale>
          <PressableScale
            className="flex-1 rounded-[24px] bg-[#f25555] px-4 py-4"
            containerClassName="flex-1"
            haptic="success"
            onPress={() => {
              hapticSuccess();
              setSignOutConfirmOpen(false);
              signOutLocally();
              router.replace('/');
            }}
          >
            <Text className="text-center font-display text-[16px] font-bold text-white">{t('profile.signOut')}</Text>
          </PressableScale>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default ProfileScreen;
