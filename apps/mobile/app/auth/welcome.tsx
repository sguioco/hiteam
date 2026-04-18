import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/ui/text';
import { Screen } from '../../components/ui/screen';
import { getDirectionalIconStyle, useI18n } from '../../lib/i18n';

export default function WelcomeScreen() {
  const router = useRouter();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);

  return (
    <Screen safeAreaClassName="bg-[#f4f5f9]" contentClassName="flex-grow px-6 pb-8 pt-4">
      <StatusBar style="dark" />

      <Pressable
        className="h-9 w-9 items-center justify-center"
        onPress={() => router.back()}
      >
        <Text className="text-[34px] leading-[34px] text-[#24314b]" style={directionalIconStyle}>‹</Text>
      </Pressable>

      <View className="mt-10">
        <Text className="mb-5 text-[48px]">👋</Text>
        <Text className="text-[40px] font-extrabold leading-[42px] text-[#c6c8d8]">{t('welcome.titleLineOne')}</Text>
        <Text className="mb-3 text-[40px] font-extrabold leading-[42px] text-[#546cf2]">{t('welcome.titleLineTwo')}!</Text>
        <Text className="text-[18px] text-[#82889d]">{t('welcome.subtitle')}</Text>
      </View>

      <View className="mt-14 gap-4">
        <Pressable
          className="min-h-[108px] flex-row items-center justify-between rounded-[24px] border border-[#dfe3ee] bg-white px-5"
          onPress={() => router.push('/' as never)}
        >
          <View className="flex-1 pr-4">
            <Text className="text-[18px] font-bold text-[#25324c]">{t('welcome.invitationOnly')}</Text>
            <Text className="mt-1 text-[16px] leading-[22px] text-[#7f879d]">{t('welcome.invitationOnlyHint')}</Text>
          </View>
          <Text className="text-[28px] text-[#546cf2]" style={directionalIconStyle}>›</Text>
        </Pressable>
      </View>

      <View className="mt-auto flex-row items-center justify-center gap-2 pt-6">
        <Text className="text-[16px] text-[#9499ac]">{t('welcome.alreadyHaveAccount')}</Text>
        <Pressable onPress={() => router.replace('/')}>
          <Text className="text-[16px] font-bold text-[#546cf2]">{t('login.signIn')}</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

