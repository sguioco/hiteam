import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../../../components/ui/text';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Card } from '../../../components/ui/card';
import { PressableScale } from '../../../components/ui/pressable-scale';
import { hapticError, hapticSelection, hapticSuccess } from '../../../lib/haptics';
import { lookupCompanyByCode, submitCompanyJoinRequest } from '../../../lib/api';
import { getDirectionalIconStyle, getTextDirectionStyle, useI18n } from '../../../lib/i18n';

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
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const textDirectionStyle = getTextDirectionStyle(language);
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
    () => ({
      loading: t('joinProfile.loading'),
      unavailableTitle: t('joinProfile.unavailableTitle'),
      backHome: t('joinProfile.backHome'),
      title: t('joinProfile.title'),
      company: t('joinProfile.company'),
      firstName: t('joinProfile.firstName'),
      lastName: t('joinProfile.lastName'),
      email: t('joinProfile.email'),
      phone: t('joinProfile.phone'),
      birthDate: t('joinProfile.birthDate'),
      birthDateHint: t('joinProfile.birthDateHint'),
      photoTitle: t('joinProfile.photoTitle'),
      pickPhoto: t('joinProfile.pickPhoto'),
      takePhoto: t('joinProfile.takePhoto'),
      cancel: t('joinProfile.cancel'),
      photoRequired: t('joinProfile.photoRequired'),
      submit: t('joinProfile.submit'),
      submitting: t('joinProfile.submitting'),
      requiredFields: t('joinProfile.requiredFields'),
      invalidEmail: t('joinProfile.invalidEmail'),
      invalidBirthDate: t('joinProfile.invalidBirthDate'),
      successTitle: t('joinProfile.successTitle'),
      successBody: t('joinProfile.successBody'),
      successCompany: t('joinProfile.successCompany', {
        companyName: '{companyName}',
      }),
      successCode: t('joinProfile.successCode', {
        companyCode: '{companyCode}',
      }),
      done: t('joinProfile.done'),
      addPhotoHint: t('joinProfile.addPhotoHint'),
    }),
    [t],
  );

  const titleStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_700Bold',
    fontSize: 34,
    includeFontPadding: false,
    lineHeight: 38,
  } as const;

  const headingStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_700Bold',
    fontSize: 28,
    includeFontPadding: false,
    lineHeight: 32,
  } as const;

  const bodyStyle = {
    color: '#6f7892',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;

  const metaLabelStyle = {
    color: '#7a8094',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    includeFontPadding: false,
    letterSpacing: 1.2,
    lineHeight: 18,
    textTransform: 'uppercase',
  } as const;

  const fieldLabelStyle = {
    color: '#24314b',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 20,
  } as const;

  const inputStyle = {
    color: '#24314b',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    includeFontPadding: false,
  } as const;

  const actionLabelStyle = {
    color: '#f7f1e6',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;

  const errorStyle = {
    color: '#b93b4a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 22,
  } as const;

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

  function openPhotoChooser() {
    Alert.alert(copy.photoTitle, undefined, [
      {
        text: copy.pickPhoto,
        onPress: () => {
          void pickPhoto('library');
        },
      },
      {
        text: copy.takePhoto,
        onPress: () => {
          void pickPhoto('camera');
        },
      },
      {
        text: copy.cancel,
        style: 'cancel',
      },
    ]);
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
        <Text style={bodyStyle}>{copy.loading}</Text>
      </SafeAreaView>
    );
  }

  if (!company || error && !company) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text style={headingStyle}>{copy.unavailableTitle}</Text>
          {error ? <Text style={bodyStyle}>{error}</Text> : null}
          <PressableScale
            className="min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
            haptic="medium"
            onPress={() => router.replace('/' as never)}
          >
            <Text style={actionLabelStyle}>{copy.backHome}</Text>
          </PressableScale>
        </Card>
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView className="flex-1 bg-white px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text style={headingStyle}>{copy.successTitle}</Text>
          <Text style={bodyStyle}>{copy.successBody}</Text>
          <Text style={bodyStyle}>
            {copy.successCompany.replace('{companyName}', company.companyName)}
          </Text>
          <Text style={bodyStyle}>
            {copy.successCode.replace('{companyCode}', company.companyCode)}
          </Text>
          <PressableScale
            className="min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2]"
            haptic="medium"
            onPress={() => router.replace('/' as never)}
          >
            <Text style={actionLabelStyle}>{copy.done}</Text>
          </PressableScale>
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
          <Text className="text-[34px] leading-[34px] text-[#26334a]" style={directionalIconStyle}>‹</Text>
        </Pressable>

        <View className="gap-3">
          <Text style={titleStyle}>
            <Text style={{ fontFamily: 'Manrope_700Bold' }}>Join</Text>
            <Text style={{ fontFamily: 'Manrope_700Bold' }}> with code</Text>
          </Text>
        </View>

        <Card className="mt-6 gap-4 rounded-[30px] bg-white">
          <View className="gap-2">
            <Text style={metaLabelStyle}>{copy.company}</Text>
            <Text style={headingStyle}>{company.companyName}</Text>
          </View>

          <Text style={fieldLabelStyle}>{copy.firstName}*</Text>
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))}
            placeholder={`${copy.firstName}*`}
            placeholderTextColor="#8a92ab"
            style={[textDirectionStyle, inputStyle]}
            value={form.firstName}
          />
          <Text style={fieldLabelStyle}>{copy.lastName}*</Text>
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))}
            placeholder={`${copy.lastName}*`}
            placeholderTextColor="#8a92ab"
            style={[textDirectionStyle, inputStyle]}
            value={form.lastName}
          />
          <Text style={fieldLabelStyle}>{copy.email}*</Text>
          <TextInput
            autoCapitalize="none"
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            keyboardType="email-address"
            onChangeText={(value) => setForm((current) => ({ ...current, email: value }))}
            placeholder={`${copy.email}*`}
            placeholderTextColor="#8a92ab"
            style={[textDirectionStyle, inputStyle]}
            value={form.email}
          />
          <Text style={fieldLabelStyle}>{copy.phone}*</Text>
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            keyboardType="phone-pad"
            onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
            placeholder={`${copy.phone}*`}
            placeholderTextColor="#8a92ab"
            style={[textDirectionStyle, inputStyle]}
            value={form.phone}
          />
          <Text style={fieldLabelStyle}>{copy.birthDate}*</Text>
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, birthDate: value }))}
            placeholder={`${copy.birthDateHint}*`}
            placeholderTextColor="#8a92ab"
            style={[textDirectionStyle, inputStyle]}
            value={form.birthDate}
          />

          <View className="gap-3 rounded-[22px] border border-[#d6dceb] bg-[#f9fbff] p-4">
            <Text style={fieldLabelStyle}>{copy.photoTitle}</Text>
            <Pressable
              className={`items-center justify-center rounded-[26px] ${
                form.avatarPreviewUri
                  ? 'h-32 w-32 overflow-hidden'
                  : 'h-32 w-32 border border-dashed border-[#c6d1e4] bg-white'
              }`}
              onPress={openPhotoChooser}
            >
              {form.avatarPreviewUri ? (
                <Image
                  className="h-32 w-32 rounded-[26px]"
                  resizeMode="cover"
                  source={{ uri: form.avatarPreviewUri }}
                />
              ) : (
                <Ionicons color="#8a92ab" name="camera-outline" size={34} />
              )}
            </Pressable>
          </View>

          {error ? <Text style={errorStyle}>{error}</Text> : null}

          <PressableScale
            className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
              submitting ? 'opacity-70' : ''
            }`}
            disabled={submitting}
            haptic="medium"
            onPress={() => void handleSubmit()}
          >
            <Text style={actionLabelStyle}>{submitting ? copy.submitting : copy.submit}</Text>
          </PressableScale>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

