import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { lookupCompanyByCode, signInWithEmail } from '../../lib/api';
import { signInLocally } from '../../lib/auth-flow';
import { useI18n } from '../../lib/i18n';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { PressableScale } from '../../components/ui/pressable-scale';
import { BrandWordmark } from '../components/brand-wordmark';

type AuthMode = 'join' | 'landing' | 'signin';

const FORM_FOOTER_BOTTOM_OFFSET = -50;

const AuthScreen = () => {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const [mode, setMode] = useState<AuthMode>('landing');
  const [inviteCode, setInviteCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [interactionBlocked, setInteractionBlocked] = useState(false);
  const transition = useSharedValue(0);
  const keyboardProgress = useSharedValue(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const collapsedHeroHeight = Math.min(Math.max(screenHeight * 0.46, 400), 550);
  const compactJoinHeroHeight = Math.min(Math.max(screenHeight * 0.42, 360), 430);
  const compactSignInHeroHeight = Math.min(Math.max(screenHeight * 0.36, 300), 360);
  const compactHeroHeight = mode === 'join' ? compactJoinHeroHeight : compactSignInHeroHeight;
  const compactHeroTitleOffset = mode === 'join' ? 184 : 160;
  const compactFormTop = mode === 'join' ? compactHeroHeight + 14 : compactHeroHeight + 12;

  const player = useVideoPlayer(require('../../timelapse-mobile.mp4'), (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
    nextPlayer.play();
  });

  useEffect(() => {
    transition.value = withTiming(mode === 'landing' ? 0 : 1, {
      duration: 240,
    });
  }, [mode, transition]);

  useEffect(() => {
    if (!interactionBlocked) {
      return;
    }

    const timer = setTimeout(() => {
      setInteractionBlocked(false);
    }, 320);

    return () => clearTimeout(timer);
  }, [interactionBlocked]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = () => {
      setKeyboardVisible(true);
      keyboardProgress.value = withTiming(1, { duration: 220 });
    };

    const handleHide = () => {
      setKeyboardVisible(false);
      keyboardProgress.value = withTiming(0, { duration: 220 });
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardProgress]);

  const heroStyle = useAnimatedStyle(() => ({
    top: 0,
    zIndex: 20,
    height: interpolate(
      transition.value,
      [0, 1],
      [
        screenHeight + 40,
        interpolate(
          keyboardProgress.value,
          [0, 1],
          [collapsedHeroHeight, compactHeroHeight],
          Extrapolation.CLAMP,
        ),
      ],
      Extrapolation.CLAMP,
    ),
    borderBottomLeftRadius: interpolate(transition.value, [0, 1], [0, 34], Extrapolation.CLAMP),
    borderBottomRightRadius: interpolate(transition.value, [0, 1], [0, 34], Extrapolation.CLAMP),
  }));

  const heroContentStyle = useAnimatedStyle(() => ({
    marginTop: interpolate(
      transition.value,
      [0, 1],
      [
        screenHeight * 0.46,
        interpolate(keyboardProgress.value, [0, 1], [210, compactHeroTitleOffset], Extrapolation.CLAMP),
      ],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(transition.value, [0, 1], [0, -18], Extrapolation.CLAMP),
      },
    ],
  }));

  const landingActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(transition.value, [0, 1], [0, -28], Extrapolation.CLAMP),
      },
    ],
  }));

  const formAreaStyle = useAnimatedStyle(() => ({
    paddingTop: interpolate(
      transition.value,
      [0, 1],
      [
        screenHeight * 0.82,
        interpolate(
          keyboardProgress.value,
          [0, 1],
          [collapsedHeroHeight + 18, compactFormTop],
          Extrapolation.CLAMP,
        ),
      ],
      Extrapolation.CLAMP,
    ),
    opacity: interpolate(transition.value, [0, 1], [0, 1], Extrapolation.CLAMP),
  }));

  function switchMode(nextMode: AuthMode) {
    if (interactionBlocked) {
      return;
    }

    Keyboard.dismiss();
    hapticSelection();
    setMessage(null);
    setMode(nextMode);
  }

  function resetToLanding() {
    if (interactionBlocked) {
      return;
    }

    Keyboard.dismiss();
    hapticSelection();
    setInteractionBlocked(true);
    setMode('landing');
    setInviteCode('');
    setIdentifier('');
    setPassword('');
    setMessage(null);
    setSubmitting(false);
    setKeyboardVisible(false);
    keyboardProgress.value = withTiming(0, { duration: 180 });
  }

  async function handleJoinTeam() {
    const trimmedInviteCode = inviteCode.trim();

    if (!trimmedInviteCode) {
      hapticError();
      setMessage(t('invite.errorEmpty'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await lookupCompanyByCode(trimmedInviteCode);
      hapticSuccess();
      router.push(`/auth/join/${encodeURIComponent(trimmedInviteCode)}` as never);
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : t('invite.verificationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignIn() {
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      hapticError();
      setMessage(t('login.signInErrorEmpty'));
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (!trimmedIdentifier.includes('@')) {
        throw new Error(t('login.signInPhoneHint'));
      }

      await signInWithEmail(trimmedIdentifier, trimmedPassword);
      hapticSuccess();
      signInLocally();
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : t('login.signInErrorEmpty'));
    } finally {
      setSubmitting(false);
    }
  }

  function renderHeroSubtitle(textColorClassName: string) {
    if (language === 'en') {
      return (
        <Text className={`text-center text-[20px] leading-[28px] ${textColorClassName}`}>
          <Text style={{ fontFamily: 'TeodorTRIAL-Regular' }}>Your </Text>
          <Text style={{ fontFamily: 'TeodorTRIAL-RegularItalic' }}>workspace</Text>
          <Text style={{ fontFamily: 'TeodorTRIAL-Regular' }}> in your pocket</Text>
        </Text>
      );
    }

      return (
        <Text
        className={`text-center text-[22px] leading-[30px] ${textColorClassName}`}
        style={{ fontFamily: 'TeodorTRIAL-Regular' }}
      >
        {t('login.heroSubtitle')}
      </Text>
    );
  }

  function renderJoinTitle() {
    return (
      <Text className="text-[31px] leading-[34px] text-[#26334a]">
        <Text style={{ fontFamily: 'TeodorTRIAL-RegularItalic' }}>Join</Text>
        <Text style={{ fontFamily: 'TeodorTRIAL-Regular' }}> with code</Text>
      </Text>
    );
  }

  function renderSignInTitle() {
    return (
      <Text className="text-[31px] leading-[34px] text-[#26334a]">
        <Text style={{ fontFamily: 'TeodorTRIAL-RegularItalic' }}>Sign in</Text>
        <Text style={{ fontFamily: 'TeodorTRIAL-Regular' }}> to your account</Text>
      </Text>
    );
  }

  const actionLabelStyle = {
    color: '#f7f1e6',
    fontFamily: 'TeodorTRIAL-Regular',
    fontSize: 20,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;

  const footerNoteStyle = {
    color: '#7c8591',
    fontFamily: 'TeodorTRIAL-Regular',
    fontSize: 17,
    includeFontPadding: false,
    lineHeight: 20,
  } as const;

  const footerLinkStyle = {
    color: '#26334a',
    fontFamily: 'TeodorTRIAL-Regular',
    fontSize: 17,
    includeFontPadding: false,
    lineHeight: 20,
  } as const;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
      <StatusBar backgroundColor="transparent" style="light" translucent />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 12}
      >
        <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View className="flex-1 bg-white">
          <Animated.View
            className="absolute left-0 right-0 overflow-hidden"
            style={heroStyle}
          >
            <View className="absolute inset-0">
              <Image
                className="h-full w-full"
                resizeMode="cover"
                source={require('../../timelapse-poster.jpg')}
              />
              <VideoView
                contentFit="cover"
                nativeControls={false}
                onFirstFrameRender={() => setVideoReady(true)}
                player={player}
                style={{
                  ...StyleSheet.absoluteFillObject,
                  opacity: videoReady ? 1 : 0,
                }}
              />
              <LinearGradient
                colors={['rgba(5,10,15,0.16)', 'rgba(5,10,15,0.34)', 'rgba(5,10,15,0.64)', 'rgba(5,10,15,0.78)']}
                locations={[0, 0.32, 0.72, 1]}
                style={StyleSheet.absoluteFillObject}
              />
            </View>

            <View
              pointerEvents={mode === 'landing' ? 'none' : interactionBlocked ? 'none' : 'auto'}
              onStartShouldSetResponder={() => !interactionBlocked}
              onResponderRelease={resetToLanding}
              style={[StyleSheet.absoluteFillObject, { zIndex: 30 }]}
            >
              <Animated.View className="items-center px-6" style={heroContentStyle}>
                <BrandWordmark
                  className={`text-white ${mode === 'landing' ? 'text-[66px] leading-[70px]' : 'text-[42px] leading-[46px]'}`}
                />
              </Animated.View>
            </View>

            <Animated.View
              className="absolute left-6 right-6"
              pointerEvents={mode === 'landing' ? 'auto' : 'none'}
              style={[
                landingActionsStyle,
                {
                  bottom: insets.bottom + 70,
                  zIndex: 10,
                },
              ]}
            >
              <View className="mb-4">{renderHeroSubtitle('text-white')}</View>

              <PressableScale
                className="min-h-[58px] items-center justify-center rounded-[20px] bg-[#f6f1e7]"
                haptic="medium"
                onPress={() => switchMode('join')}
              >
                <Text className="text-[18px] font-semibold text-[#0f2530]">{t('login.joinTeam')}</Text>
              </PressableScale>

              <PressableScale
                className="mt-3 min-h-[58px] items-center justify-center rounded-[20px] border border-white/35 bg-white/8"
                haptic="selection"
                onPress={() => switchMode('signin')}
              >
                <Text className="text-[18px] font-semibold text-white">{t('login.signIn')}</Text>
              </PressableScale>
            </Animated.View>
          </Animated.View>

          <Animated.View
            className="flex-1 px-6"
            pointerEvents={mode === 'landing' || interactionBlocked ? 'none' : 'auto'}
            style={[
              formAreaStyle,
              {
                paddingBottom: insets.bottom + (keyboardVisible ? 8 : 20),
              },
            ]}
          >
            {mode === 'landing' ? null : (
              <Animated.View
                entering={FadeInDown.duration(180)}
                exiting={FadeOut.duration(120)}
                className="flex-1"
              >
                <View className="flex-1 justify-between">
                  <View
                    className={
                      keyboardVisible
                        ? mode === 'join'
                          ? 'pb-8 pt-10'
                          : 'pb-6 pt-6'
                        : 'pb-10 pt-20'
                    }
                  >
                    <View className="mb-7 items-center">
                      <Text className="text-center text-[31px] leading-[34px] text-[#26334a]">
                      {mode === 'join' ? renderJoinTitle() : renderSignInTitle()}
                      </Text>
                    </View>

                    <View className="gap-3">
                      {mode === 'join' ? (
                        <TextInput
                          autoCapitalize="characters"
                          autoCorrect={false}
                          className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                          importantForAutofill="no"
                          keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                          key="join-code-input"
                          onChangeText={(nextValue) => {
                            setInviteCode(nextValue);
                            setMessage(null);
                          }}
                          placeholder={t('invite.placeholder')}
                          placeholderTextColor="#7f8da1"
                          returnKeyType="go"
                          selectionColor="#26334a"
                          showSoftInputOnFocus
                          textAlign="center"
                          value={inviteCode}
                        />
                      ) : (
                        <>
                          <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                            importantForAutofill="no"
                            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'email-address'}
                            key="signin-identifier-input"
                            onChangeText={(nextValue) => {
                              setIdentifier(nextValue);
                              setMessage(null);
                            }}
                            placeholder={t('login.emailPlaceholder')}
                            placeholderTextColor="#7f8da1"
                            returnKeyType="next"
                            selectionColor="#26334a"
                            showSoftInputOnFocus
                            textAlign="center"
                            value={identifier}
                          />
                          <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                            key="signin-password-input"
                            onChangeText={(nextValue) => {
                              setPassword(nextValue);
                              setMessage(null);
                            }}
                            placeholder={t('login.passwordPlaceholder')}
                            placeholderTextColor="#7f8da1"
                            returnKeyType="go"
                            secureTextEntry
                            selectionColor="#26334a"
                            showSoftInputOnFocus
                            textAlign="center"
                            value={password}
                          />
                        </>
                      )}
                    </View>

                    {message ? (
                      <Text className="mt-4 text-[14px] leading-[20px] text-[#9e3541]">{message}</Text>
                    ) : null}
                  </View>

                  <View
                    className={
                      keyboardVisible
                        ? mode === 'join'
                          ? 'pt-8'
                          : 'pt-4'
                        : 'pt-10'
                    }
                    style={{
                      paddingBottom: insets.bottom + (keyboardVisible ? 8 : 0),
                      marginBottom: keyboardVisible ? 0 : FORM_FOOTER_BOTTOM_OFFSET,
                    }}
                  >
                    <PressableScale
                      className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${
                        submitting ? 'opacity-70' : ''
                      }`}
                      disabled={submitting}
                      haptic="medium"
                      onPress={() => void (mode === 'join' ? handleJoinTeam() : handleSignIn())}
                    >
                      {mode === 'join' ? (
                        <Text style={actionLabelStyle}>{submitting ? '...' : t('invite.joinButton')}</Text>
                      ) : (
                        <Text style={actionLabelStyle}>{submitting ? '...' : t('login.signIn')}</Text>
                      )}
                    </PressableScale>

                    <View className="mt-10 min-h-[20px] items-center justify-center">
                      {mode === 'join' ? (
                        <Text style={footerNoteStyle}>
                          <Text style={footerNoteStyle}>{t('welcome.alreadyHaveAccount')} </Text>
                          <Text onPress={() => switchMode('signin')} style={footerLinkStyle}>
                            {t('login.logIn')}
                          </Text>
                        </Text>
                      ) : (
                        <Text style={footerNoteStyle}>
                          <Text style={footerNoteStyle}>{t('login.needInvite')} </Text>
                          <Text onPress={() => switchMode('join')} style={footerLinkStyle}>
                            {t('login.joinTeam')}
                          </Text>
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
              </Animated.View>
            )}
          </Animated.View>
        </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default AuthScreen;
