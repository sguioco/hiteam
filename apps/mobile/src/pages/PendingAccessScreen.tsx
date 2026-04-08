import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { AppGradientBackground } from '../../components/ui/screen';
import { loadMyAccessStatus } from '../../lib/api';
import { signOutLocally } from '../../lib/auth-flow';
import { getDateLocale, useI18n } from '../../lib/i18n';

export default function PendingAccessScreen() {
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Awaited<ReturnType<typeof loadMyAccessStatus>> | null>(null);

  async function refresh() {
    setLoading(true);
    setError(null);

    try {
      setStatus(await loadMyAccessStatus());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : t('arrival.loadError'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const isRejected = status?.invitationStatus === 'REJECTED';
  const title = isRejected ? t('pending.rejectedTitle') : t('pending.title');
  const body = isRejected ? t('pending.rejectedBody') : t('pending.body');

  return (
    <SafeAreaView className="flex-1 bg-transparent px-6 py-8">
      <AppGradientBackground />
      <StatusBar style="dark" />

      <View className="flex-1 justify-center gap-5">
        <Card className="gap-4 rounded-[32px] bg-white">
          <Text className="text-[28px] font-extrabold text-foreground">{title}</Text>
          <Text className="text-[16px] leading-7 text-muted-foreground">{body}</Text>

          {status?.submittedAt ? (
            <Text className="text-[14px] leading-6 text-muted-foreground">
              {t('pending.submittedAt', {
                date: new Date(status.submittedAt).toLocaleString(locale),
              })}
            </Text>
          ) : null}

          {isRejected && status?.rejectedReason ? (
            <Text className="text-[14px] leading-6 text-danger">{t('pending.rejectedReason', { reason: status.rejectedReason })}</Text>
          ) : null}

          {error ? <Text className="text-[14px] leading-6 text-danger">{error}</Text> : null}

          <Button
            fullWidth
            label={loading ? t('common.loading') : t('pending.retry')}
            onPress={() => void refresh()}
            variant="secondary"
          />
          <Button fullWidth label={t('pending.signOut')} onPress={() => signOutLocally()} />
        </Card>
      </View>
    </SafeAreaView>
  );
}
