import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { Text } from '../../../components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../../components/ui/button';
import { Card } from '../../../components/ui/card';
import { loadPublicInvitation, registerFromInvitation, signInWithEmail } from '../../../lib/api';
import { signInLocally } from '../../../lib/auth-flow';
import { getDirectionalIconStyle, getTextDirectionStyle, useI18n } from '../../../lib/i18n';

type InvitationPayload = Awaited<ReturnType<typeof loadPublicInvitation>>;

export default function RegisterInvitationScreen() {
  const router = useRouter();
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
  const [form, setForm] = useState({
    password: '',
    firstName: '',
    lastName: '',
    middleName: '',
    birthDate: '',
    gender: 'male' as 'male' | 'female',
    phone: '',
  });

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
        setError(t('register.invitationUnavailable'));
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
          firstName: payload.firstName ?? current.firstName,
          lastName: payload.lastName ?? current.lastName,
          phone: payload.phone ?? current.phone,
        }));
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : t('register.invitationUnavailable'));
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

  const isAlreadyHandled = useMemo(() => {
    if (!invitation) {
      return false;
    }

    return invitation.status === 'PENDING_APPROVAL' || (invitation.status === 'APPROVED' && invitation.registrationCompleted);
  }, [invitation]);

  async function handleSubmit() {
    if (!invitation) {
      return;
    }

    if (form.password.trim().length < 8) {
      setError(t('register.passwordShort'));
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.birthDate.trim())) {
      setError(t('register.invalidDate'));
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      await registerFromInvitation(token, {
        password: form.password.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        middleName: form.middleName.trim() || undefined,
        birthDate: form.birthDate.trim(),
        gender: form.gender,
        phone: form.phone.trim(),
      });

      await signInWithEmail(invitation.email, form.password.trim(), invitation.tenantSlug);
      signInLocally({ workspaceSetupStep: 'biometric' });
      setMessage(t('register.startBiometric'));
      router.push({
        pathname: '/biometric',
        params: {
          mode: 'enroll',
          returnTo: `/auth/register/${token}`,
        },
      });
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('invite.verificationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  if (params.biometricEnrollmentStatus === 'ENROLLED') {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f4f5f9] px-6">
        <StatusBar style="dark" />
        <Text className="text-[16px] font-semibold text-[#24314b]">{t('register.processingBiometric')}</Text>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-[#f4f5f9] px-6">
        <StatusBar style="dark" />
        <Text className="text-[16px] font-semibold text-[#24314b]">{t('common.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error && !invitation) {
    return (
      <SafeAreaView className="flex-1 bg-[#f4f5f9] px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text className="text-[28px] font-extrabold text-[#24314b]">{t('register.invitationUnavailable')}</Text>
          <Text className="text-[16px] leading-7 text-[#6f7892]">{error}</Text>
          <Button fullWidth label={t('common.backHome')} onPress={() => router.replace('/' as never)} />
        </Card>
      </SafeAreaView>
    );
  }

  if (!invitation) {
    return null;
  }

  if (isAlreadyHandled) {
    return (
      <SafeAreaView className="flex-1 bg-[#f4f5f9] px-6 py-8">
        <StatusBar style="dark" />
        <Card className="mt-auto gap-4 rounded-[30px] bg-white">
          <Text className="text-[28px] font-extrabold text-[#24314b]">{t('register.alreadySubmittedTitle')}</Text>
          <Text className="text-[16px] leading-7 text-[#6f7892]">
            {t('register.alreadySubmittedBody', { email: invitation.email })}
          </Text>
          <Button fullWidth label={t('login.signIn')} onPress={() => router.replace('/' as never)} />
        </Card>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#f4f5f9]">
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
        <Pressable className="mb-5 h-9 w-9 items-center justify-center" onPress={() => router.back()}>
          <Text className="text-[34px] leading-[34px] text-[#24314b]" style={directionalIconStyle}>‹</Text>
        </Pressable>

        <View className="gap-3">
          <Text className="text-[32px] font-extrabold leading-[38px] text-[#24314b]">{t('register.title')}</Text>
          <Text className="text-[17px] leading-[26px] text-[#7a8094]">
            {invitation.status === 'APPROVED' ? t('register.approvedSubtitle') : t('register.subtitle')}
          </Text>
        </View>

        <Card className="mt-6 gap-4 rounded-[30px] bg-white">
          <View className="gap-2">
            <Text className="text-[13px] font-bold uppercase tracking-[1.8px] text-[#7a8094]">{t('register.email')}</Text>
            <Text className="text-[18px] font-semibold text-[#24314b]">{invitation.email}</Text>
          </View>

          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, password: value }))}
            placeholder={t('register.password')}
            placeholderTextColor="#8a92ab"
            secureTextEntry
            style={textDirectionStyle}
            value={form.password}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, firstName: value }))}
            placeholder={t('register.firstName')}
            placeholderTextColor="#8a92ab"
            style={textDirectionStyle}
            value={form.firstName}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, lastName: value }))}
            placeholder={t('register.lastName')}
            placeholderTextColor="#8a92ab"
            style={textDirectionStyle}
            value={form.lastName}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, middleName: value }))}
            placeholder={t('register.middleName')}
            placeholderTextColor="#8a92ab"
            style={textDirectionStyle}
            value={form.middleName}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, birthDate: value }))}
            placeholder={t('register.birthDatePlaceholder')}
            placeholderTextColor="#8a92ab"
            style={textDirectionStyle}
            value={form.birthDate}
          />
          <TextInput
            className="min-h-[60px] rounded-[18px] border border-[#d6dceb] bg-[#f9fbff] px-4 text-[16px] text-[#24314b]"
            onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
            placeholder={t('register.phone')}
            placeholderTextColor="#8a92ab"
            style={textDirectionStyle}
            value={form.phone}
          />

          <View className="flex-row gap-3">
            <Button
              className="flex-1"
              label={t('register.male')}
              onPress={() => setForm((current) => ({ ...current, gender: 'male' }))}
              variant={form.gender === 'male' ? 'primary' : 'secondary'}
            />
            <Button
              className="flex-1"
              label={t('register.female')}
              onPress={() => setForm((current) => ({ ...current, gender: 'female' }))}
              variant={form.gender === 'female' ? 'primary' : 'secondary'}
            />
          </View>

          {message ? <Text className="text-[14px] leading-6 text-[#546cf2]">{message}</Text> : null}
          {error ? <Text className="text-[14px] leading-6 text-[#b93b4a]">{error}</Text> : null}

          <Button
            fullWidth
            label={submitting ? t('register.submitting') : t('register.submit')}
            onPress={() => void handleSubmit()}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

