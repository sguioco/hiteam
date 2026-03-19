import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmail } from '../../lib/api';
import {
  getCountryByIsoCode,
  getCountryDisplayName,
  searchCountryOptions,
  signInLocally,
  updateAuthFlowState,
  useAuthFlowState,
} from '../../lib/auth-flow';
import { getLanguageLabel, useI18n } from '../../lib/i18n';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../components/BottomSheetModal';
import { BrandWordmark } from '../components/brand-wordmark';

const AuthScreen = () => {
  const router = useRouter();
  const { language, t } = useI18n();
  const { authMethod, countryIsoCode } = useAuthFlowState();
  const selectedCountry = getCountryByIsoCode(countryIsoCode);
  const version = Constants.expoConfig?.version ?? '0.1.0';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const countryOptions = useMemo(() => searchCountryOptions(countrySearch, language), [countrySearch, language]);

  async function handleSignIn() {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      hapticError();
      setMessage(t('login.signInErrorEmpty'));
      return;
    }

    if (authMethod === 'email' && !trimmedIdentifier.includes('@')) {
      hapticError();
      setMessage(t('login.signInErrorEmail'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (authMethod === 'email') {
        await signInWithEmail(trimmedIdentifier, trimmedPassword);
      }

      hapticSuccess();
      signInLocally();
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : t('login.signInErrorEmpty'));
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelectMethod(nextMethod: 'phone' | 'email') {
    hapticSelection();
    updateAuthFlowState({ authMethod: nextMethod });
    setMessage(null);
  }

  return (
    <SafeAreaView className="flex-1 bg-transparent">
      <StatusBar backgroundColor="transparent" style="dark" translucent />
      <BottomSheetModal
        backdropOpacity={0.25}
        onClose={() => setCountryPickerOpen(false)}
        sheetClassName="max-h-[82%] rounded-t-[28px] bg-[#f8f9fc] px-5 pb-7 pt-5"
        visible={countryPickerOpen}
      >
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-[22px] font-extrabold text-[#1f2740]">{t('login.countryPickerTitle')}</Text>
              <PressableScale
                className="h-8 w-8 items-center justify-center rounded-2xl bg-[#e7ebf5]"
                haptic="selection"
                onPress={() => setCountryPickerOpen(false)}
              >
                <Text className="text-[20px] text-[#55617d]">×</Text>
              </PressableScale>
            </View>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mb-4 min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-white px-4 text-[16px] text-[#1f2740]"
              onChangeText={setCountrySearch}
              placeholder={t('login.countryPickerSearchPlaceholder')}
              placeholderTextColor="#8a92ab"
              value={countrySearch}
            />

            <FlatList
              data={countryOptions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.isoCode}
              renderItem={({ item }) => {
                const isActive = item.isoCode === countryIsoCode;

                return (
                  <PressableScale
                    className={`mb-3 flex-row items-center justify-between rounded-[18px] border bg-white px-4 py-4 ${
                      isActive ? 'border-[#546cf2]' : 'border-[#e0e4ef]'
                    }`}
                    haptic="selection"
                    onPress={() => {
                      updateAuthFlowState({ countryIsoCode: item.isoCode });
                      setCountrySearch('');
                      setCountryPickerOpen(false);
                    }}
                  >
                    <View className="flex-row items-center gap-3">
                      <Text className="text-[22px]">{item.flag}</Text>
                      <View>
                        <Text className="text-[17px] font-semibold text-[#23304a]">
                          {getCountryDisplayName(item, language)}
                        </Text>
                        <Text className="mt-0.5 text-[14px] text-[#7c839a]">{item.dialCode}</Text>
                      </View>
                    </View>
                    {isActive ? <Text className="text-[24px] font-extrabold text-[#546cf2]">✓</Text> : null}
                  </PressableScale>
                );
              }}
            />
      </BottomSheetModal>

      <ScrollView contentContainerClassName="flex-grow px-7 pb-6 pt-8" keyboardShouldPersistTaps="handled">
        <View className="flex-1">
          <Animated.View
            entering={FadeInUp.duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            className="mt-7 flex-row items-center justify-center gap-3"
          >
            <View className="h-[52px] w-[52px] items-center justify-center rounded-full bg-[#546cf2]">
              <Text className="text-[18px] font-extrabold tracking-[0.3px] text-white">HT</Text>
            </View>
            <BrandWordmark className="text-[32px] text-[#1f2740]" />
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(30).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            className="mb-6 mt-10 flex-row gap-3"
          >
            <PressableScale
              className={`min-h-[52px] flex-1 items-center justify-center rounded-[18px] px-3 ${
                authMethod === 'phone' ? 'bg-[#546cf2]' : 'bg-[#e8ebf5]'
              }`}
              containerClassName="flex-1"
              haptic="selection"
              onPress={() => handleSelectMethod('phone')}
            >
              <Text className={`text-[16px] font-semibold ${authMethod === 'phone' ? 'text-white' : 'text-[#7a8094]'}`}>
                {t('login.phoneTab')}
              </Text>
            </PressableScale>

            <PressableScale
              className={`min-h-[52px] flex-1 items-center justify-center rounded-[18px] px-3 ${
                authMethod === 'email' ? 'bg-[#546cf2]' : 'bg-[#e8ebf5]'
              }`}
              containerClassName="flex-1"
              haptic="selection"
              onPress={() => handleSelectMethod('email')}
            >
              <Text className={`text-[16px] font-semibold ${authMethod === 'email' ? 'text-white' : 'text-[#7a8094]'}`}>
                {t('login.emailTab')}
              </Text>
            </PressableScale>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(60).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 8 }],
            })}
            className="gap-4"
          >
            {authMethod === 'phone' ? (
              <View className="min-h-[74px] flex-row items-center rounded-[20px] border border-[#cfd5e6] bg-white pl-2 pr-4">
                <PressableScale
                  className="mr-3 min-h-12 flex-row items-center gap-2 border-r border-[#e2e6f2] px-3"
                  haptic="selection"
                  onPress={() => setCountryPickerOpen(true)}
                >
                  <Text className="text-[20px]">{selectedCountry.flag}</Text>
                  <Text className="text-[16px] font-bold text-[#1f2740]">{selectedCountry.dialCode}</Text>
                  <Text className="text-[22px] text-[#7b84a0]">›</Text>
                </PressableScale>

                <TextInput
                  className="flex-1 text-[18px] text-[#1f2740]"
                  keyboardType="phone-pad"
                  onChangeText={setIdentifier}
                  placeholder={t('login.phonePlaceholder')}
                  placeholderTextColor="#8a92ab"
                  value={identifier}
                />
              </View>
            ) : (
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-[74px] rounded-[20px] border border-[#cfd5e6] bg-white px-5 text-[18px] text-[#1f2740]"
                keyboardType="email-address"
                onChangeText={setIdentifier}
                placeholder={t('login.emailPlaceholder')}
                placeholderTextColor="#8a92ab"
                value={identifier}
              />
            )}

            <View className="min-h-[74px] flex-row items-center rounded-[20px] border border-[#cfd5e6] bg-white pl-5 pr-3">
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-[18px] text-[#1f2740]"
                onChangeText={setPassword}
                placeholder={t('login.passwordPlaceholder')}
                placeholderTextColor="#8a92ab"
                secureTextEntry={!passwordVisible}
                value={password}
              />
              <PressableScale
                className="h-12 w-12 items-center justify-center"
                haptic="selection"
                onPress={() => setPasswordVisible((current) => !current)}
              >
                <Ionicons color="#7b84a0" name={passwordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} />
              </PressableScale>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(90).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 6 }],
            })}
          >
            <PressableScale className="mt-3 self-end px-1" haptic="selection">
            <Text className="text-[15px] font-semibold text-[#546cf2]">{t('login.forgotPassword')}</Text>
            </PressableScale>
          </Animated.View>

          {message ? <Text className="mt-4 text-[14px] leading-5 text-[#6b7390]">{message}</Text> : null}

          <Animated.View
            entering={FadeInDown.delay(120).duration(180).withInitialValues({
              opacity: 0,
              transform: [{ translateY: 10 }],
            })}
            className="mt-auto pt-20"
          >
            <PressableScale
              className={`min-h-[64px] items-center justify-center rounded-[22px] bg-[#546cf2] shadow-sm ${
                submitting ? 'opacity-70' : ''
              }`}
              disabled={submitting}
              haptic="medium"
              onPress={() => void handleSignIn()}
              style={{
                shadowColor: '#546cf2',
                shadowOffset: { width: 0, height: 12 },
                shadowOpacity: 0.2,
                shadowRadius: 24,
                elevation: 6,
              }}
            >
              <Text className="text-[20px] font-bold text-white">{submitting ? '...' : t('login.signIn')}</Text>
            </PressableScale>

            <View className="items-center gap-4 pb-2 pt-16">
              <View className="flex-row items-center gap-2">
                <Text className="text-[16px] text-[#9197aa]">{t('login.noAccount')}</Text>
                <PressableScale haptic="selection" onPress={() => router.push('/auth/welcome')}>
                  <Text className="text-[16px] font-bold text-[#546cf2]">{t('login.register')}</Text>
                </PressableScale>
              </View>

              <PressableScale className="flex-row items-center gap-2" haptic="selection" onPress={() => router.push('/auth/language')}>
                <Text className="text-[20px]">{language === 'ru' ? '🇷🇺' : '🇺🇸'}</Text>
                <Text className="text-[18px] font-medium text-[#545d78]">{getLanguageLabel(language)}</Text>
                <Text className="text-[22px] text-[#7b84a0]">›</Text>
              </PressableScale>

              <Text className="text-[14px] text-[#afb4c4]">v{version}</Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AuthScreen;
