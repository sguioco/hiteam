import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../../src/components/BottomSheetModal';
import { Screen } from '../../components/ui/screen';
import { useI18n } from '../../lib/i18n';
import { hapticError, hapticSuccess } from '../../lib/haptics';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function InviteScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invitationCompanyName, setInvitationCompanyName] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!code.trim()) {
      hapticError();
      setError(t('invite.errorEmpty'));
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/v1/employees/invitations/public/${code.trim()}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? t('invite.invalidCode'));
      }

      const invitation = await response.json();
      hapticSuccess();
      setInvitationCompanyName(invitation.companyName ?? '—');
      setInvitationToken(code.trim());
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : t('invite.verificationFailed'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Screen safeAreaClassName="bg-[#f4f5f9]" contentClassName="flex-grow justify-between px-6 pb-8 pt-4">
        <StatusBar style="dark" />

        <Animated.View
          entering={FadeInUp.duration(180).withInitialValues({
            opacity: 0,
            transform: [{ translateY: 8 }],
          })}
        >
          <PressableScale
            className="mb-5 h-9 w-9 items-center justify-center"
            haptic="selection"
            onPress={() => router.back()}
          >
            <Text className="text-[34px] leading-[34px] text-[#24314b]">‹</Text>
          </PressableScale>

          <Text className="mb-8 text-center text-[20px] font-bold text-[#24314b]">{t('invite.joinCompany')}</Text>
          <Text className="mb-3 text-[30px] font-extrabold leading-[36px] text-[#24314b]">{t('invite.enterInviteCode')}</Text>
          <Text className="mb-8 text-[18px] leading-[28px] text-[#8a90a3]">{t('invite.description')}</Text>

          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            className="min-h-[82px] rounded-[22px] border border-[#dfe3ee] bg-white px-5 text-[18px] text-[#24314b]"
            onChangeText={setCode}
            placeholder={t('invite.placeholder')}
            placeholderTextColor="#8b91a5"
            value={code}
          />

          {error ? <Text className="mt-3 text-[14px] text-[#b93b4a]">{error}</Text> : null}
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(50).duration(180).withInitialValues({
            opacity: 0,
            transform: [{ translateY: 8 }],
          })}
        >
          <PressableScale
          className={`min-h-[76px] items-center justify-center rounded-[22px] bg-[#546cf2] ${
            loading ? 'opacity-70' : ''
          }`}
          disabled={loading}
          haptic="medium"
          onPress={() => void handleContinue()}
          style={{
            shadowColor: '#546cf2',
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.2,
            shadowRadius: 24,
            elevation: 6,
          }}
        >
          <Text className="text-[20px] font-bold text-white">{loading ? '...' : t('invite.continue')}</Text>
          </PressableScale>
        </Animated.View>
      </Screen>

      <BottomSheetModal
        onClose={() => {
          setInvitationCompanyName(null);
          setInvitationToken(null);
        }}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={invitationCompanyName !== null}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">{t('invite.invitationFoundTitle')}</Text>
            <Text className="mt-1 font-body text-sm leading-6 text-muted-foreground">
              {t('invite.invitationFoundBody', { companyName: invitationCompanyName ?? '—' })}
            </Text>
          </View>
          <PressableScale className="h-10 w-10 items-center justify-center rounded-full bg-muted/80" haptic="selection" onPress={() => {
            setInvitationCompanyName(null);
            setInvitationToken(null);
          }}>
            <Text className="text-[20px] text-[#55617d]">×</Text>
          </PressableScale>
        </View>

        <PressableScale
          className="rounded-[24px] bg-primary px-4 py-4"
          haptic="success"
          onPress={() => {
            if (!invitationToken) {
              return;
            }

            setInvitationCompanyName(null);
            router.push(`/auth/register/${invitationToken}` as never);
          }}
        >
          <Text className="text-center font-display text-[16px] font-semibold text-white">{t('invite.continue')}</Text>
        </PressableScale>
      </BottomSheetModal>
    </>
  );
}
