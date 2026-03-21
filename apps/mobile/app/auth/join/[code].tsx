import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { hapticError, hapticSelection, hapticSuccess } from '../../../lib/haptics';
import { lookupCompanyByCode, submitCompanyJoinRequest } from '../../../lib/api';
import { useI18n } from '../../../lib/i18n';

type CompanyPayload = Awaited<ReturnType<typeof lookupCompanyByCode>>;

type JoinForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  avatarDataUrl: string;
  avatarPreviewUri: string;
};

export default function CompanyJoinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const { language } = useI18n();
  const code = Array.isArray(params.code) ? params.code[0] : params.code ?? '';
  const [company, setCompany] = useState<CompanyPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<JoinForm>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    birthDate: '',
    avatarDataUrl: '',
    avatarPreviewUri: '',
  });

  const copy = useMemo(
    () =>
      language === 'ru'
        ? {
            loading: 'Проверяем код компании...',
            unavailableTitle: 'Код компании недоступен',
            backHome: 'На главный экран',
            title: 'Join with code',
            subtitle: 'Заполните анкету сотрудника. После проверки менеджером мы отправим вам письмо для завершения доступа.',
            company: 'Компания',
            code: 'Код',
            firstName: 'Имя',
            lastName: 'Фамилия',
            email: 'Email',
            phone: 'Телефон',
            birthDate: 'Дата рождения',
            birthDateHint: 'ГГГГ-ММ-ДД',
            photoTitle: 'Фото',
            pickPhoto: 'Выбрать фото',
            takePhoto: 'Сделать фото',
            photoRequired: 'Добавьте фото сотрудника.',
            submit: 'Отправить анкету',
            submitting: 'Отправляем...',
            requiredFields: 'Заполните все поля.',
            invalidEmail: 'Укажите корректный email.',
            invalidBirthDate: 'Дата рождения должна быть в формате ГГГГ-ММ-ДД.',
            successTitle: 'Информация отправлена',
            successBody:
              'Заявка передана менеджеру. После подтверждения профиля мы отправим вам письмо с продолжением входа.',
            successCompany: 'Компания: {companyName}',
            successCode: 'Код: {companyCode}',
            done: 'Понятно',
            addPhotoHint: 'Фотография обязательна для подтверждения сотрудника.',
          }
        : {
            loading: 'Checking company code...',
            unavailableTitle: 'Company code unavailable',
            backHome: 'Back to start',
            title: 'Join with code',
            subtitle:
              'Fill in the employee profile. After manager approval we will send you an email to finish access setup.',
            company: 'Company',
            code: 'Code',
            firstName: 'First name',
            lastName: 'Last name',
            email: 'Email',
            phone: 'Phone',
            birthDate: 'Birth date',
            birthDateHint: 'YYYY-MM-DD',
            photoTitle: 'Photo',
            pickPhoto: 'Choose photo',
            takePhoto: 'Take photo',
            photoRequired: 'Add an employee photo.',
            submit: 'Submit profile',
            submitting: 'Submitting...',
            requiredFields: 'Complete all fields.',
            invalidEmail: 'Enter a valid email.',
            invalidBirthDate: 'Birth date must use YYYY-MM-DD.',
            successTitle: 'Information sent',
            successBody:
              'Your profile has been sent to the manager. After approval we will send you an email with the next sign-in step.',
            successCompany: 'Company: {companyName}',
            successCode: 'Code: {companyCode}',
            done: 'Done',
            addPhotoHint: 'A photo is required for employee approval.',
          },
    [language],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadCompany() {
      if (!code) {
        setError(copy.unavailableTitle);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const payload = await lookupCompanyByCode(code);
        if (!cancelled) {
          setCompany(payload);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : copy.unavailableTitle);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadCompany();

    return () => {
      cancelled = true;
    };
  }, [code, copy.unavailableTitle]);

  async function pickPhoto(source: 'camera' | 'library') {
    try {
      setError(null);

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        hapticError();
        setError(copy.photoRequired);
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
      const mimeType = asset.mimeType || 'image/jpeg';

      setForm((current) => ({
        ...current,
        avatarDataUrl: `data:${mimeType};base64,${asset.base64}`,
        avatarPreviewUri: asset.uri,
      }));
      hapticSuccess();
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.photoRequired);
    }
  }

  async function handleSubmit() {
    if (!company) {
      return;
    }

    const trimmedFirstName = form.firstName.trim();
    const trimmedLastName = form.lastName.trim();
    const trimmedEmail = form.email.trim().toLowerCase();
    const trimmedPhone = form.phone.trim();
    const trimmedBirthDate = form.birthDate.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedBirthDate ||
      !form.avatarDataUrl
    ) {
      hapticError();
      setError(copy.requiredFields);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      hapticError();
      setError(copy.invalidEmail);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedBirthDate)) {
      hapticError();
      setError(copy.invalidBirthDate);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await submitCompanyJoinRequest({
        code: company.companyCode,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: trimmedPhone,
        birthDate: trimmedBirthDate,
        avatarDataUrl: form.avatarDataUrl,
      });
      hapticSuccess();
      setSubmitted(true);
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.requiredFields);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-white px-6">
        <StatusBar style="dark" />
        <Text className="text-[16px] font-semibold text-[#26334a]">{copy.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!company || error && !company) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text className="text-[28px] font-extrabold text-[#26334a]">{copy.unavailableTitle}</Text>
          {error ? <Text className="text-[16px] leading-7 text-[#6f7892]">{error}</Text> : null}
          <Button fullWidth label={copy.backHome} onPress={() => router.replace('/' as never)} />
        </Card>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text className="text-[28px] font-extrabold text-[#26334a]">{copy.successTitle}</Text>
          <Text className="text-[16px] leading-7 text-[#6f7892]">{copy.successBody}</Text>
          <Text className="text-[14px] leading-6 text-[#6f7892]">
            {copy.successCompany.replace('{companyName}', company.companyName)}
          </Text>
          <Text className="text-[14px] leading-6 text-[#6f7892]">
            {copy.successCode.replace('{companyCode}', company.companyCode)}
          </Text>
          <Button fullWidth label={copy.done} onPress={() => router.replace('/' as never)} />
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Pressable
          className="mb-5 h-9 w-9 items-center justify-center"
          onPress={() => {
            hapticSelection();
            router.back();
          }}
        >
          <Text className="text-[34px] leading-[34px] text-[#26334a]">‹</Text>
        </Pressable>

        <View className="gap-3">
          <Text className="text-[32px] font-extrabold leading-[38px] text-[#26334a]">{copy.title}</Text>
          <Text className="text-[16px] leading-7 text-[#6f7892]">{copy.subtitle}</Text>
        </View>

        <Card className="mt-6 gap-4 rounded-[30px] bg-white">
          <View className="gap-2">
            <Text className="text-[13px] font-bold uppercase tracking-[1.8px] text-[#7a8094]">{copy.company}</Text>
            <Text className="text-[18px] font-semibold text-[#24314b]">{company.companyName}</Text>
            <Text className="text-[14px] text-[#7a8094]">
              {copy.code}: {company.companyCode}
            </Text>
          </View>

          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))}
            placeholder={copy.firstName}
            placeholderTextColor="#8a92ab"
            value={form.firstName}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))}
            placeholder={copy.lastName}
            placeholderTextColor="#8a92ab"
            value={form.lastName}
          />
          <TextInput
            autoCapitalize="none"
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            keyboardType="email-address"
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder={copy.email}
            placeholderTextColor="#8a92ab"
            value={form.email}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            keyboardType="phone-pad"
            onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
            placeholder={copy.phone}
            placeholderTextColor="#8a92ab"
            value={form.phone}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, birthDate: value }))}
            placeholder={copy.birthDateHint}
            placeholderTextColor="#8a92ab"
            value={form.birthDate}
          />

          <View className="gap-3 rounded-[22px] border border-[#d6dceb] bg-[#f9fbff] p-4">
            <Text className="text-[16px] font-semibold text-[#24314b]">{copy.photoTitle}</Text>
            <Text className="text-[14px] leading-6 text-[#7a8094]">{copy.addPhotoHint}</Text>
            <View className="items-center justify-center">
              {form.avatarPreviewUri ? (
                <Image
                  className="h-32 w-32 rounded-[26px]"
                  resizeMode="cover"
                  source={{ uri: form.avatarPreviewUri }}
                />
              ) : (
                <View className="h-32 w-32 items-center justify-center rounded-[26px] border border-dashed border-[#c6d1e4] bg-white">
                  <Text className="text-center text-[13px] leading-5 text-[#7a8094]">{copy.photoRequired}</Text>
                </View>
              )}
            </View>
            <View className="flex-row gap-3">
              <Button
                className="flex-1"
                fullWidth
                label={copy.pickPhoto}
                onPress={() => void pickPhoto('library')}
                variant="secondary"
              />
              <Button
                className="flex-1"
                fullWidth
                label={copy.takePhoto}
                onPress={() => void pickPhoto('camera')}
                variant="secondary"
              />
            </View>
          </View>

          {error ? <Text className="text-[14px] leading-6 text-[#b93b4a]">{error}</Text> : null}

          <Button
            fullWidth
            label={submitting ? copy.submitting : copy.submit}
            onPress={() => void handleSubmit()}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
