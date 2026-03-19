import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, Text, View } from 'react-native';
import { Screen } from '../../components/ui/screen';
import { languageOptions, useI18n } from '../../lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();

  function handleSelectLanguage(nextLanguage: 'ru' | 'en') {
    setLanguage(nextLanguage);
    router.back();
  }

  return (
    <Screen safeAreaClassName="bg-[#f4f5f9]" contentClassName="px-6 pb-8 pt-4" withGradient>
      <StatusBar backgroundColor="transparent" style="dark" translucent />

      <Pressable
        className="mb-5 h-9 w-9 items-center justify-center"
        onPress={() => router.back()}
      >
        <Text className="text-[34px] leading-[34px] text-[#24314b]">‹</Text>
      </Pressable>

      <Text className="mb-6 text-[24px] font-extrabold text-[#24314b]">{t('language.title')}</Text>

      <View className="gap-3">
        {languageOptions.map((option) => {
          const isActive = option.value === language;

          return (
            <Pressable
              key={option.value}
              className={`min-h-[88px] flex-row items-center justify-between rounded-[22px] border bg-white px-5 ${
                isActive ? 'border-[#546cf2]' : 'border-[#dfe3ee]'
              }`}
              onPress={() => handleSelectLanguage(option.value)}
            >
              <View className="flex-row items-center gap-4">
                <Text className="text-[24px]">{option.flag}</Text>
                <Text className="text-[18px] font-semibold text-[#24314b]">{option.label}</Text>
              </View>
              {isActive ? <Text className="text-[28px] font-extrabold text-[#546cf2]">✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}
