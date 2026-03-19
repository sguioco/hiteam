import { useEffect, useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated as NativeAnimated, ImageBackground, Text, View } from 'react-native';
import { useI18n } from '../../lib/i18n';
import { PressableScale } from '../../components/ui/pressable-scale';

type ShiftStatusCardProps = {
  greeting: string;
  name: string;
  topInset?: number;
};

const ShiftStatusCard = ({ greeting, name, topInset = 0 }: ShiftStatusCardProps) => {
  const lateStatusOutlineWidth = 1;
  const [checkedIn, setCheckedIn] = useState(false);
  const { language, t } = useI18n();
  const latePulse = useRef(new NativeAnimated.Value(1)).current;
  const textGlow = {
    textShadowColor: 'rgba(36, 5, 72, 0.34)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 15,
  } as const;
  const greetingStyle = {
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.45,
  } as const;
  const shiftTimeStyle = {
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.65,
  } as const;
  const shiftLabelStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.16,
  } as const;
  const statusTextStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.08,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  } as const;
  const buttonLabelStyle = {
    fontFamily: 'Manrope_600SemiBold',
    letterSpacing: -0.1,
  } as const;
  const utcPlus7Now = new Date(Date.now() + (new Date().getTimezoneOffset() + 7 * 60) * 60 * 1000);
  const nowMinutes = utcPlus7Now.getUTCHours() * 60 + utcPlus7Now.getUTCMinutes();
  const shiftStartMinutes = 9 * 60;
  const shiftEndMinutes = 18 * 60;
  const hourLabel = language === 'ru' ? 'ч' : 'h';
  const minuteLabel = language === 'ru' ? 'м' : 'm';

  function formatDuration(totalMinutes: number) {
    const safeMinutes = Math.max(totalMinutes, 0);
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours === 0) {
      return `${minutes}${minuteLabel}`;
    }

    if (minutes === 0) {
      return `${hours}${hourLabel}`;
    }

    return `${hours}${hourLabel} ${minutes}${minuteLabel}`;
  }

  const shiftMeta = (() => {
    if (checkedIn && nowMinutes < shiftEndMinutes) {
      return {
        color: '#86efac',
        icon: 'checkmark-circle' as const,
        blinking: false,
        textShadowColor: 'rgba(255,255,255,0.88)',
        text: language === 'ru'
          ? `На смене • осталось ${formatDuration(shiftEndMinutes - nowMinutes)}`
          : `On shift • ${formatDuration(shiftEndMinutes - nowMinutes)} left`,
      };
    }

    if (nowMinutes < shiftStartMinutes) {
      return {
        color: '#86efac',
        icon: 'time' as const,
        blinking: false,
        textShadowColor: 'rgba(255,255,255,0.88)',
        text: language === 'ru'
          ? `Начнётся через ${formatDuration(shiftStartMinutes - nowMinutes)}`
          : `Starts in ${formatDuration(shiftStartMinutes - nowMinutes)}`,
      };
    }

    if (nowMinutes <= shiftEndMinutes) {
      return {
        color: '#ff5b72',
        icon: 'alert-circle' as const,
        blinking: true,
        textShadowColor: 'rgba(255,255,255,0.98)',
        text: language === 'ru'
          ? `Смена началась ${formatDuration(nowMinutes - shiftStartMinutes)} назад • Вы опаздываете`
          : `Shift started ${formatDuration(nowMinutes - shiftStartMinutes)} ago • You are late`,
      };
    }

      return {
        color: '#ddd6fe',
        icon: 'moon' as const,
        blinking: false,
        textShadowColor: 'rgba(255,255,255,0.82)',
        text: language === 'ru'
          ? `Смена закончилась ${formatDuration(nowMinutes - shiftEndMinutes)} назад`
          : `Shift ended ${formatDuration(nowMinutes - shiftEndMinutes)} ago`,
      };
  })();
  useEffect(() => {
    if (!shiftMeta.blinking) {
      latePulse.stopAnimation();
      latePulse.setValue(1);
      return;
    }

    const pulseAnimation = NativeAnimated.loop(
      NativeAnimated.sequence([
        NativeAnimated.timing(latePulse, {
          duration: 650,
          toValue: 0.42,
          useNativeDriver: true,
        }),
        NativeAnimated.timing(latePulse, {
          duration: 650,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
      latePulse.stopAnimation();
      latePulse.setValue(1);
    };
  }, [latePulse, shiftMeta.blinking]);

  return (
    <View className="relative overflow-hidden rounded-b-[34px] border-x border-b border-white/70 bg-white/80 shadow-lg shadow-[#1f2687]/12">
      <View className="absolute inset-0">
        <ImageBackground
          className="h-full w-full"
          resizeMode="cover"
          source={require('../../bg.webp')}
        />
      </View>
      <View className="absolute inset-0 bg-[#140d2f]/18" />
      <View className="absolute inset-x-0 bottom-0 h-44 bg-[#120a28]/24" />
      <View className="absolute inset-[1px] rounded-[33px] bg-white/4" />

      <View
        className="relative z-10 justify-between px-7 pb-6"
        style={{ minHeight: 280 + topInset, paddingTop: topInset + 14 }}
      >
        <View>
          <Text className="text-[34px] leading-[42px] text-white" style={[textGlow, greetingStyle]}>
            {greeting}, {name}
          </Text>
        </View>

        <View className="mt-10">
          <Text className="text-[18px] text-[#f3ecff]" style={[textGlow, shiftLabelStyle]}>
            {t('today.shiftTiming')}
          </Text>
          <Text className="mt-1 text-[44px] leading-[48px] text-white" style={[textGlow, shiftTimeStyle]}>
            09:00 - 18:00
          </Text>
          {shiftMeta.blinking ? (
            <View className="mt-1 flex-row items-center gap-2 self-start">
              <NativeAnimated.View style={{ opacity: latePulse }}>
                <View className="h-2.5 w-2.5 rounded-full bg-[#ff5b72]" />
              </NativeAnimated.View>
              <View className="relative max-w-[300px] flex-1 self-start">
                {[
                  [-lateStatusOutlineWidth, 0],
                  [lateStatusOutlineWidth, 0],
                  [0, -lateStatusOutlineWidth],
                  [0, lateStatusOutlineWidth],
                  [-lateStatusOutlineWidth, -lateStatusOutlineWidth],
                  [lateStatusOutlineWidth, -lateStatusOutlineWidth],
                  [-lateStatusOutlineWidth, lateStatusOutlineWidth],
                  [lateStatusOutlineWidth, lateStatusOutlineWidth],
                ].map(([x, y]) => (
                  <Text
                    key={`${x}:${y}`}
                    className="absolute left-0 top-0 text-[15px] leading-[20px]"
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      ...statusTextStyle,
                      color: '#ff5b72',
                      textShadowColor: 'transparent',
                      textShadowRadius: 0,
                      transform: [{ translateX: x }, { translateY: y }],
                    }}
                  >
                    {shiftMeta.text}
                  </Text>
                ))}
                <NativeAnimated.Text
                  className="absolute left-0 top-0 text-[15px] leading-[20px]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    ...statusTextStyle,
                    color: 'rgba(255, 255, 255, 0.02)',
                    opacity: latePulse,
                    textShadowColor: 'rgba(255, 91, 114, 0.98)',
                    textShadowRadius: 20,
                  }}
                >
                  {shiftMeta.text}
                </NativeAnimated.Text>
                <Text
                  className="text-[15px] leading-[20px]"
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    ...statusTextStyle,
                    color: '#ffffff',
                    textShadowColor: 'rgba(255, 91, 114, 0.9)',
                    textShadowRadius: 12,
                  }}
                >
                  {shiftMeta.text}
                </Text>
              </View>
            </View>
          ) : (
            <View className="mt-1 flex-row items-center gap-2">
              <Ionicons color={shiftMeta.color} name={shiftMeta.icon} size={16} />
              <Text
                className="text-[16px] leading-[21px]"
                style={[
                  statusTextStyle,
                  {
                    color: shiftMeta.color,
                    textShadowColor: shiftMeta.textShadowColor,
                  },
                ]}
              >
                {shiftMeta.text}
              </Text>
            </View>
          )}
        </View>

        <View className="mt-4">
          <PressableScale
            className={`w-full overflow-hidden rounded-[24px] shadow-lg ${
              checkedIn ? 'bg-[#d92f45]' : 'bg-[#dff8d8]'
            }`}
            haptic={checkedIn ? 'warning' : 'success'}
            onPress={() => setCheckedIn((value) => !value)}
          >
            <View className={checkedIn ? 'bg-[#ff5b6f]' : 'bg-[#f4fff1]'}>
              <View
                className={`px-4 py-4 ${
                  checkedIn ? 'bg-[#c81f37]/35' : 'bg-[#7ee787]/28'
                }`}
              >
                <View className="flex-row items-center justify-center gap-2">
                  <Text className="text-base">{'\u{1F44B}'}</Text>
                  <Text className={`text-base ${checkedIn ? 'text-white' : 'text-[#11233d]'}`} style={buttonLabelStyle}>
                    {checkedIn ? 'Bye' : 'Hi'}
                  </Text>
                </View>
              </View>
            </View>
          </PressableScale>
        </View>
      </View>
    </View>
  );
};

export default ShiftStatusCard;
