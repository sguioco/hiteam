import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Pressable, View } from 'react-native';
import { Text } from '../../components/ui/text';
import { Screen } from '../../components/ui/screen';
import {
  getDirectionalIconStyle,
  isRTLLanguage,
  languageOptions,
  type AppLanguage,
  useI18n,
} from '../../lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const { language, setLanguage, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);

  async function handleSelectLanguage(nextLanguage: AppLanguage) {
    const keepsDirection = isRTLLanguage(nextLanguage) === isRTLLanguage(language);
    await setLanguage(nextLanguage);

    if (keepsDirection) {
      router.back();
    }
  }

  return (
    <Screen safeAreaClassName="bg-[#f4f5f9]" contentClassName="px-6 pb-8 pt-4" withGradient>
      <StatusBar backgroundColor="transparent" style="dark" translucent />

      <View className="mb-7 flex-row items-center">
        <Pressable
          className="h-10 w-10 items-center justify-center"
          onPress={() => router.back()}
        >
          <Ionicons color="#24314b" name="chevron-back" size={20} style={directionalIconStyle} />
        </Pressable>

        <Text className="flex-1 pr-10 text-center text-[26px] font-extrabold tracking-[-0.5px] text-[#24314b]">
          {t('language.title')}
        </Text>
      </View>

      <View className="border-t border-[#d6ddeb]">
        {languageOptions.map((option, index) => {
          const isActive = option.value === language;
          const showSeparator = index < languageOptions.length - 1;

          return (
            <Pressable
              key={option.value}
              className={`min-h-[76px] flex-row items-center justify-between px-1 py-4 ${
                showSeparator ? 'border-b border-[#d6ddeb]' : ''
              }`}
              onPress={() => {
                void handleSelectLanguage(option.value);
              }}
            >
              <View className="flex-row items-center gap-4">
                <Text className="text-[24px]">{option.flag}</Text>
                <Text className={`text-[18px] font-semibold ${isActive ? 'text-[#24314b]' : 'text-[#4e5a71]'}`}>
                  {option.label}
                </Text>
              </View>
              {isActive ? (
                <Ionicons color="#3f5ae0" name="checkmark-sharp" size={20} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

