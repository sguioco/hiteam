import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../../components/ui/text';
import { PressableScale } from '../../../components/ui/pressable-scale';
import {
  bootstrapPushNotifications,
  loadPublicInvitation,
  registerFromInvitation,
  signInWithEmail,
} from '../../../lib/api';
import { signInLocally } from '../../../lib/auth-flow';
import { hapticError, hapticSelection, hapticSuccess } from '../../../lib/haptics';
import { getDirectionalIconStyle, getTextDirectionStyle, useI18n } from '../../../lib/i18n';
import { BrandWordmark } from '../../../src/components/brand-wordmark';

type InvitationPayload = Awaited<ReturnType<typeof loadPublicInvitation>>;

const initialForm = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  middleName: '',
  birthDate: '',
  gender: 'male' as 'male' | 'female',
  phone: '',
  avatarDataUrl: '',
  avatarPreviewUri: '',
};

function parseBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(1995, 0, 1);
  }

  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date(1995, 0, 1) : parsed;
}

function formatBirthDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export default function RegisterInvitationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    token?: string;
    biometricEnrollmentStatus?: string;
    biometricMessage?: string;
    biometricTick?: string;
  }>();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const textDirectionStyle = getTextDirectionStyle(language);
  const token = Array.isArray(params.token) ? params.token[0] : params.token ?? '';
  const [invitation, setInvitation] = useState<InvitationPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [step, setStep] = useState<'password' | 'profile'>('password');
  const [birthDatePickerVisible, setBirthDatePickerVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [form, setForm] = useState(initialForm);

  const copy = useMemo(
    () =>
      language === 'ru'
        ? {
            title: 'Присоединение к команде',
            passwordSubtitle: 'Проверьте email и придумайте пароль для входа.',
            profileSubtitle: 'Заполните личные данные для профиля сотрудника.',
            password: 'Пароль',
            next: 'Далее',
            createAccount: 'Создать аккаунт',
            creatingAccount: 'Создаём аккаунт...',
            alreadySubmittedTitle: 'Аккаунт уже создан',
            alreadySubmittedBody: 'Для {email} аккаунт уже настроен. Просто войдите в приложение.',
            profileRequired: 'Заполните имя, фамилию, дату рождения, телефон и добавьте фото.',
            emailRequired: 'Укажите email.',
            passwordShort: 'Пароль должен быть не короче 8 символов.',
            invalidDate: 'Дата рождения должна быть в формате ГГГГ-ММ-ДД.',
            processingBiometric: 'Завершаем настройку биометрии...',
            startBiometric: 'Открываем настройку биометрии...',
            email: 'Email',
            emailPlaceholder: t('invite.placeholder'),
            firstName: 'Имя',
            lastName: 'Фамилия',
            middleName: 'Отчество',
            phone: 'Телефон',
            birthDate: 'Дата рождения',
            birthDateHint: 'ГГГГ-ММ-ДД',
            photo: 'Фото',
            addPhoto: 'Добавить фото',
            changePhoto: 'Изменить фото',
            pickPhoto: 'Выбрать фото',
            takePhoto: 'Сделать фото',
            cancel: 'Отмена',
            male: 'Мужской',
            female: 'Женский',
            showPassword: 'Показать пароль',
            hidePassword: 'Скрыть пароль',
          }
        : {
            title: 'Join the team',
            passwordSubtitle: 'Confirm your email and create your sign-in password.',
            profileSubtitle: 'Complete your employee profile details.',
            password: 'Password',
            next: 'Continue',
            createAccount: 'Create account',
            creatingAccount: 'Creating account...',
            alreadySubmittedTitle: 'Account already created',
            alreadySubmittedBody: 'An account for {email} is already set up. Just sign in to the app.',
            profileRequired: 'Complete first name, last name, birth date, phone, and photo.',
            emailRequired: 'Enter your email.',
            passwordShort: 'Password must be at least 8 characters.',
            invalidDate: 'Birth date must use YYYY-MM-DD.',
            processingBiometric: 'Finishing biometric setup...',
            startBiometric: 'Opening biometric setup...',
            email: 'Email',
            emailPlaceholder: t('invite.placeholder'),
            firstName: 'First name',
            lastName: 'Last name',
            middleName: 'Middle name',
            phone: 'Phone',
            birthDate: 'Birth date',
            birthDateHint: 'YYYY-MM-DD',
            photo: 'Photo',
            addPhoto: 'Add photo',
            changePhoto: 'Change photo',
            pickPhoto: 'Choose photo',
            takePhoto: 'Take photo',
            cancel: 'Cancel',
            male: 'Male',
            female: 'Female',
            showPassword: 'Show password',
            hidePassword: 'Hide password',
          },
    [language, t],
  );

  useEffect(() => {
    if (params.biometricEnrollmentStatus === 'ENROLLED') {
      signInLocally({ workspaceSetupStep: 'location' });
      router.replace('/onboarding/workspace-ready' as never);
    }
  }, [params.biometricEnrollmentStatus, router]);

  useEffect(() => {
    let cancelled = false;

    async function loadInvitation() {
      if (!token) {
        setError(t('joinProfile.unavailableTitle'));
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await loadPublicInvitation(token);
        if (cancelled) {
          return;
        }

        setInvitation(payload);
        setForm((current) => ({
          ...current,
          email: payload.email ?? current.email,
          firstName: payload.firstName ?? current.firstName,
          lastName: payload.lastName ?? current.lastName,
          phone: payload.phone ?? current.phone,
        }));
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('joinProfile.unavailableTitle'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  const isAlreadyHandled = useMemo(() => Boolean(invitation?.registrationCompleted), [invitation]);
  const passwordToggleLabel = passwordVisible ? copy.hidePassword : copy.showPassword;

  function handleBack() {
    Keyboard.dismiss();
    setError(null);
    setMessage(null);

    if (step === 'profile') {
      hapticSelection();
      setStep('password');
      return;
    }

    router.back();
  }

  function handleContinue() {
    if (!form.email.trim()) {
      hapticError();
      setError(copy.emailRequired);
      return;
    }

    if (form.password.trim().length < 8) {
      hapticError();
      setError(copy.passwordShort);
      return;
    }

    hapticSuccess();
    setError(null);
    setMessage(null);
    setStep('profile');
  }

  function handleBirthDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS !== 'ios') {
      setBirthDatePickerVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setForm((current) => ({ ...current, birthDate: formatBirthDate(selectedDate) }));
    setError(null);
    setMessage(null);
  }

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        hapticError();
        setError(copy.addPhoto);
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              base64: true,
              quality: 0.72,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              base64: true,
              quality: 0.72,
              selectionLimit: 1,
            });

      if (result.canceled || !result.assets?.[0]?.uri || !result.assets[0].base64) {
        return;
      }

      const asset = result.assets[0];
      setForm((current) => ({
        ...current,
        avatarDataUrl: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`,
        avatarPreviewUri: asset.uri,
      }));
      setError(null);
      hapticSuccess();
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.addPhoto);
    }
  }

  function openPhotoChooser() {
    Keyboard.dismiss();
    Alert.alert(copy.photo, undefined, [
      { text: copy.pickPhoto, onPress: () => void pickPhoto('library') },
      { text: copy.takePhoto, onPress: () => void pickPhoto('camera') },
      { text: copy.cancel, style: 'cancel' },
    ]);
  }

  async function handleSubmit() {
    if (!invitation) {
      return;
    }

    const normalizedEmail = form.email.trim().toLowerCase();
    const trimmedBirthDate = form.birthDate.trim();

    if (!normalizedEmail) {
      hapticError();
      setError(copy.emailRequired);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedBirthDate)) {
      hapticError();
      setError(copy.invalidDate);
      return;
    }

    if (
      !form.firstName.trim() ||
      !form.lastName.trim() ||
      !form.phone.trim() ||
      !form.avatarDataUrl
    ) {
      hapticError();
      setError(copy.profileRequired);
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await registerFromInvitation(token, {
        email: normalizedEmail,
        password: form.password.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        birthDate: trimmedBirthDate,
        gender: form.gender,
        phone: form.phone.trim(),
        avatarDataUrl: form.avatarDataUrl,
      });

      await signInWithEmail(normalizedEmail, form.password.trim(), invitation.tenantSlug);
      void bootstrapPushNotifications().catch(() => undefined);
      signInLocally({ workspaceSetupStep: 'biometric' });
      setMessage(copy.startBiometric);
      hapticSuccess();
      router.push({
        pathname: '/biometric',
        params: {
          mode: 'enroll',
          returnTo: `/auth/register/${token}`,
        },
      });
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : t('invite.verificationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  function renderShell(children: ReactNode) {
    return (
      <SafeAreaView className="flex-1 bg-[#f3f5fb]" edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <LinearGradient
            colors={['#eef4ff', '#f7f0e7', '#f3f5fb']}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          {children}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  if (params.biometricEnrollmentStatus === 'ENROLLED') {
    return renderShell(
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color="#546cf2" />
        <Text className="mt-4 text-center text-[16px] font-semibold text-[#24314b]">
          {copy.processingBiometric}
        </Text>
      </View>,
    );
  }

  if (loading) {
    return renderShell(
      <View className="flex-1 items-center justify-center px-6">
        <ActivityIndicator color="#546cf2" />
        <Text className="mt-4 text-center text-[16px] font-semibold text-[#24314b]">
          {t('joinProfile.loading')}
        </Text>
      </View>,
    );
  }

  if (error && !invitation) {
    return renderShell(
      <View className="flex-1 justify-end px-6 pb-10">
        <View className="rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-sm">
          <Text className="text-[28px] font-bold leading-[34px] text-[#24314b]">
            {t('joinProfile.unavailableTitle')}
          </Text>
          <Text className="mt-3 text-[16px] leading-7 text-[#6f7892]">{error}</Text>
          <PressableScale
            className="mt-7 min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
            haptic="medium"
            onPress={() => router.replace('/' as never)}
          >
            <Text style={styles.actionLabel}>{t('common.backHome')}</Text>
          </PressableScale>
        </View>
      </View>,
    );
  }

  if (!invitation) {
    return null;
  }

  if (isAlreadyHandled) {
    const displayEmail = invitation.email ?? invitation.phone ?? '';
    return renderShell(
      <View className="flex-1 justify-end px-6 pb-10">
        <View className="rounded-[34px] border border-white/80 bg-white/90 p-6 shadow-sm">
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-[#edf4ff]">
            <Ionicons color="#546cf2" name="checkmark-circle" size={34} />
          </View>
          <Text className="mt-5 text-[28px] font-bold leading-[34px] text-[#24314b]">
            {copy.alreadySubmittedTitle}
          </Text>
          <Text className="mt-3 text-[16px] leading-7 text-[#6f7892]">
            {copy.alreadySubmittedBody.replace('{email}', displayEmail)}
          </Text>
          <PressableScale
            className="mt-7 min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
            haptic="medium"
            onPress={() => router.replace('/' as never)}
          >
            <Text style={styles.actionLabel}>{t('login.signIn')}</Text>
          </PressableScale>
        </View>
      </View>,
    );
  }

  return renderShell(
    <View className="flex-1">
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom + 126, 150),
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-6 pt-2">
          <View className="relative h-14 justify-center">
            <Pressable
              className="absolute left-0 top-1 z-10 h-11 w-11 items-center justify-center"
              onPress={handleBack}
            >
              <Text className="text-[36px] leading-[36px] text-[#24314b]" style={directionalIconStyle}>
                ‹
              </Text>
            </Pressable>

            <View className="absolute left-0 right-0 items-center" pointerEvents="none">
              <BrandWordmark className="text-[34px] leading-[42px] text-[#17233d]" />
            </View>
          </View>

          <View className="mt-6 flex-row gap-2">
            <View className={`h-2 flex-1 rounded-full ${step === 'password' ? 'bg-[#546cf2]' : 'bg-[#c8d3f6]'}`} />
            <View className={`h-2 flex-1 rounded-full ${step === 'profile' ? 'bg-[#546cf2]' : 'bg-white/90'}`} />
          </View>

          <View className="mb-7 mt-7">
            <Text className="text-[32px] font-bold leading-[37px] text-[#24314b]">
              {copy.title}
            </Text>
            <Text className="mt-3 text-[17px] leading-[26px] text-[#727b91]">
              {step === 'password' ? copy.passwordSubtitle : copy.profileSubtitle}
            </Text>
          </View>
        </View>

        <View className="px-6">
          {step === 'password' ? (
            <View className="gap-4">
              <View>
                <Text style={styles.fieldLabel}>{copy.email}*</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="mt-2 min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                  editable={!invitation.email}
                  keyboardType={Platform.OS === 'android' ? 'visible-password' : 'email-address'}
                  onChangeText={(value) => {
                    setForm((current) => ({ ...current, email: value }));
                    setError(null);
                  }}
                  placeholder={copy.emailPlaceholder}
                  placeholderTextColor="#7f8da1"
                  selectionColor="#26334a"
                  style={[textDirectionStyle, styles.inputText]}
                  textAlign="center"
                  value={form.email}
                />
              </View>

              <View>
                <Text style={styles.fieldLabel}>{copy.password}*</Text>
                <View className="mt-2 min-h-[58px] flex-row items-center rounded-[18px] border border-[#ddd5c7] bg-white px-4">
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    className="min-h-[58px] flex-1 px-3 text-center text-[17px] text-[#0f2530]"
                    onChangeText={(value) => {
                      setForm((current) => ({ ...current, password: value }));
                      setError(null);
                    }}
                    placeholder={copy.password}
                    placeholderTextColor="#7f8da1"
                    secureTextEntry={!passwordVisible}
                    selectionColor="#26334a"
                    style={[textDirectionStyle, styles.inputText]}
                    textAlign="center"
                    value={form.password}
                  />
                  <PressableScale
                    accessibilityLabel={passwordToggleLabel}
                    className="h-10 w-10 items-center justify-center rounded-full"
                    haptic="selection"
                    onPress={() => setPasswordVisible((current) => !current)}
                  >
                    <Ionicons
                      color="#7f8da1"
                      name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                      size={22}
                    />
                  </PressableScale>
                </View>
              </View>
            </View>
          ) : (
            <View className="gap-3">
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, firstName: value }));
                  setError(null);
                }}
                placeholder={`${copy.firstName}*`}
                placeholderTextColor="#7f8da1"
                selectionColor="#26334a"
                style={[textDirectionStyle, styles.inputText]}
                textAlign="center"
                value={form.firstName}
              />
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, lastName: value }));
                  setError(null);
                }}
                placeholder={`${copy.lastName}*`}
                placeholderTextColor="#7f8da1"
                selectionColor="#26334a"
                style={[textDirectionStyle, styles.inputText]}
                textAlign="center"
                value={form.lastName}
              />
              <TextInput
                autoCapitalize="words"
                autoCorrect={false}
                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, middleName: value }));
                  setError(null);
                }}
                placeholder={copy.middleName}
                placeholderTextColor="#7f8da1"
                selectionColor="#26334a"
                style={[textDirectionStyle, styles.inputText]}
                textAlign="center"
                value={form.middleName}
              />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                keyboardType="phone-pad"
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, phone: value.replace(/[^\d+\s()-]/g, '') }));
                  setError(null);
                }}
                placeholder={`${copy.phone}*`}
                placeholderTextColor="#7f8da1"
                selectionColor="#26334a"
                style={[textDirectionStyle, styles.inputText]}
                textAlign="center"
                value={form.phone}
              />

              <PressableScale
                className="min-h-[58px] flex-row items-center justify-between rounded-[18px] border border-[#ddd5c7] bg-white px-4"
                haptic="selection"
                onPress={() => {
                  Keyboard.dismiss();
                  setBirthDatePickerVisible(true);
                }}
              >
                <Text style={styles.inputText}>{copy.birthDate}*</Text>
                <Text style={[styles.inputText, form.birthDate ? null : styles.placeholderText]}>
                  {form.birthDate || copy.birthDateHint}
                </Text>
              </PressableScale>

              {birthDatePickerVisible ? (
                <View className="rounded-[22px] border border-[#e7dfd3] bg-[#fbfaf7] px-2 py-3">
                  <DateTimePicker
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    mode="date"
                    onChange={handleBirthDateChange}
                    style={Platform.OS === 'ios' ? styles.datePickerSpinner : undefined}
                    value={parseBirthDate(form.birthDate)}
                  />
                  {Platform.OS === 'ios' ? (
                    <PressableScale
                      className="mx-3 mt-2 min-h-[44px] items-center justify-center rounded-[16px] bg-white"
                      haptic="selection"
                      onPress={() => setBirthDatePickerVisible(false)}
                    >
                      <Text className="text-[16px] font-semibold text-[#546cf2]">{copy.next}</Text>
                    </PressableScale>
                  ) : null}
                </View>
              ) : null}

              <View className="mt-1 min-h-[58px] flex-row overflow-hidden rounded-[18px] border border-[#ddd5c7] bg-white">
                <Pressable
                  className={`min-h-[58px] items-center justify-center ${
                    form.gender === 'male' ? 'bg-[#eef2ff]' : 'bg-white'
                  }`}
                  onPress={() => {
                    hapticSelection();
                    setForm((current) => ({ ...current, gender: 'male' }));
                  }}
                  style={styles.genderOption}
                >
                  <Text
                    className={`text-center text-[15px] font-semibold ${
                      form.gender === 'male' ? 'text-[#546cf2]' : 'text-[#6f7892]'
                    }`}
                  >
                    {copy.male}
                  </Text>
                </Pressable>
                <View style={styles.genderDivider} />
                <Pressable
                  className={`min-h-[58px] items-center justify-center ${
                    form.gender === 'female' ? 'bg-[#eef2ff]' : 'bg-white'
                  }`}
                  onPress={() => {
                    hapticSelection();
                    setForm((current) => ({ ...current, gender: 'female' }));
                  }}
                  style={styles.genderOption}
                >
                  <Text
                    className={`text-center text-[15px] font-semibold ${
                      form.gender === 'female' ? 'text-[#546cf2]' : 'text-[#6f7892]'
                    }`}
                  >
                    {copy.female}
                  </Text>
                </Pressable>
              </View>

              <PressableScale
                className="mt-1 min-h-[112px] flex-row items-center rounded-[24px] border border-dashed border-[#c6d1e4] bg-white px-4"
                haptic="selection"
                onPress={openPhotoChooser}
              >
                {form.avatarPreviewUri ? (
                  <Image
                    className="h-20 w-20 rounded-[22px]"
                    resizeMode="cover"
                    source={{ uri: form.avatarPreviewUri }}
                  />
                ) : (
                  <View className="h-20 w-20 items-center justify-center rounded-[22px] bg-[#f3f5fb]">
                    <Ionicons color="#8a92ab" name="camera-outline" size={32} />
                  </View>
                )}
                <View className="ml-4 flex-1 justify-center">
                  <Text className="text-[16px] font-semibold text-[#24314b]">
                    {form.avatarPreviewUri ? copy.changePhoto : copy.addPhoto}
                  </Text>
                </View>
                <Ionicons color="#9ba5bb" name="chevron-forward" size={20} />
              </PressableScale>
            </View>
          )}
        </View>
      </ScrollView>

      <View
        className="absolute left-6 right-6"
        style={{ bottom: Math.max(28, insets.bottom - 4) }}
      >
        <View className="mb-3 min-h-[28px] items-center justify-center px-2">
          {error ? (
            <Text className="text-center text-[14px] leading-5 text-[#b93b4a]">{error}</Text>
          ) : message ? (
            <Text className="text-center text-[14px] leading-5 text-[#546cf2]">{message}</Text>
          ) : null}
        </View>
        <PressableScale
          className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
            submitting ? 'opacity-70' : ''
          }`}
          disabled={submitting}
          haptic="medium"
          onPress={() => void (step === 'password' ? handleContinue() : handleSubmit())}
        >
          <Text style={styles.actionLabel}>
            {step === 'password'
              ? copy.next
              : submitting
                ? copy.creatingAccount
                : copy.createAccount}
          </Text>
        </PressableScale>
      </View>
    </View>,
  );
}

const styles = StyleSheet.create({
  actionLabel: {
    color: '#f7f1e6',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 18,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 26,
  },
  datePickerSpinner: {
    alignSelf: 'center',
  },
  genderDivider: {
    alignSelf: 'stretch',
    backgroundColor: '#e7dfd3',
    width: StyleSheet.hairlineWidth,
  },
  genderOption: {
    flex: 1,
    minWidth: 0,
  },
  fieldLabel: {
    color: '#7a8094',
    fontFamily: 'Manrope_700Bold',
    fontSize: 12,
    includeFontPadding: false,
    letterSpacing: 1.6,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  inputText: {
    color: '#24314b',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 16,
    includeFontPadding: false,
  },
  placeholderText: {
    color: '#7f8da1',
    fontFamily: 'Manrope_500Medium',
  },
});
