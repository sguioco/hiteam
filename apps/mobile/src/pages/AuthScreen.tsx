import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
  Alert,
  AppState,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  bootstrapDemoDevice,
  loadBiometricPolicy,
  loadMyAccessStatus,
  signInWithEmail,
  submitCompanyJoinRequest,
  lookupCompanyByCode,
} from '../../lib/api';
import { signInLocally } from '../../lib/auth-flow';
import { useI18n } from '../../lib/i18n';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { getPreciseLocationAccessStatus } from '../../lib/location';
import { warmWorkspaceCachesWithinBudget } from '../../lib/workspace-cache';
import { PressableScale } from '../../components/ui/pressable-scale';
import { BrandWordmark } from '../components/brand-wordmark';

type AuthMode = 'join' | 'joinProfile' | 'landing' | 'signin';
type JoinCompanyPayload = Awaited<ReturnType<typeof lookupCompanyByCode>>;
type JoinProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthDate: string;
  avatarDataUrl: string;
  avatarPreviewUri: string;
};

const FORM_FOOTER_BOTTOM_OFFSET = -34;
const JOIN_PROFILE_COUNTRY_CODES = [
  { code: '+7', country: 'Russia / Kazakhstan' },
  { code: '+1', country: 'United States / Canada' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+49', country: 'Germany' },
  { code: '+971', country: 'UAE' },
  { code: '+998', country: 'Uzbekistan' },
  { code: '+996', country: 'Kyrgyzstan' },
  { code: '+995', country: 'Georgia' },
] as const;
const INITIAL_JOIN_PROFILE_FORM: JoinProfileForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  birthDate: '',
  avatarDataUrl: '',
  avatarPreviewUri: '',
};
const AUTH_TRANSITION_TIMING = {
  duration: 210,
  easing: Easing.out(Easing.cubic),
} as const;
const AUTH_KEYBOARD_TIMING = {
  duration: 180,
  easing: Easing.out(Easing.quad),
} as const;

function AuthHeroVideoOverlay({ onReady }: { onReady: () => void }) {
  const player = useVideoPlayer(require('../../timelapse-mobile.mp4'), (nextPlayer) => {
    nextPlayer.loop = true;
    nextPlayer.muted = true;
    nextPlayer.play();
  });

  useEffect(() => {
    player.play();

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        player.play();
        return;
      }

      player.pause();
    });

    return () => {
      appStateSubscription.remove();
    };
  }, [player]);

  return (
    <VideoView
      contentFit="cover"
      nativeControls={false}
      onFirstFrameRender={() => {
        onReady();
        player.play();
      }}
      player={player}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

const AuthScreen = () => {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const [mode, setMode] = useState<AuthMode>('landing');
  const [inviteCode, setInviteCode] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [joinCompany, setJoinCompany] = useState<JoinCompanyPayload | null>(null);
  const [joinProfileForm, setJoinProfileForm] = useState<JoinProfileForm>(INITIAL_JOIN_PROFILE_FORM);
  const [joinProfileCountryCode, setJoinProfileCountryCode] = useState('+7');
  const [joinProfileCountryPickerVisible, setJoinProfileCountryPickerVisible] = useState(false);
  const [joinProfileDatePickerVisible, setJoinProfileDatePickerVisible] = useState(false);
  const [joinProfileSubmitted, setJoinProfileSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [interactionBlocked, setInteractionBlocked] = useState(false);
  const joinProfileFirstNameInputRef = useRef<TextInput | null>(null);
  const joinProfileLastNameInputRef = useRef<TextInput | null>(null);
  const joinProfileEmailInputRef = useRef<TextInput | null>(null);
  const joinProfilePhoneInputRef = useRef<TextInput | null>(null);
  const joinProfileBirthDateInputRef = useRef<TextInput | null>(null);
  const transition = useSharedValue(0);
  const keyboardProgress = useSharedValue(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const shouldUseHeroVideo = Platform.OS !== 'web';
  const shouldRenderHeroVideo = shouldUseHeroVideo;

  const collapsedHeroHeight = Math.min(Math.max(screenHeight * 0.46, 400), 550);
  const compactJoinHeroHeight = Math.min(Math.max(screenHeight * 0.42, 360), 430);
  const compactJoinProfileHeroHeight = Math.min(Math.max(screenHeight * 0.2, 280), 280);
  const compactJoinProfileSuccessHeroHeight = 480;
  const compactSignInHeroHeight = Math.min(Math.max(screenHeight * 0.36, 300), 360);
  const compactJoinProfileTitleOffset = 135;
  const compactJoinProfileSuccessTitleOffset = 240;
  const compactJoinContentPaddingClass = 'pb-28 pt-28';
  const compactSignInContentPaddingClass = 'pb-8 pt-32';
  const compactJoinFooterPaddingClass = 'pt-24';
  const compactSignInFooterPaddingClass = 'pt-28';
  const compactHeroHeight =
    mode === 'joinProfile'
      ? joinProfileSubmitted
        ? compactJoinProfileSuccessHeroHeight
        : compactJoinProfileHeroHeight
      : mode === 'join'
        ? compactJoinHeroHeight
        : compactSignInHeroHeight;
  const compactHeroTitleOffset =
    mode === 'joinProfile'
      ? joinProfileSubmitted
        ? compactJoinProfileSuccessTitleOffset
        : compactJoinProfileTitleOffset
      : mode === 'join'
        ? 184
        : 160;
  const compactFormTop =
    mode === 'joinProfile' ? compactHeroHeight - 8 : mode === 'join' ? compactHeroHeight + 14 : compactHeroHeight + 12;
  const joinProfileCopy = useMemo(
    () => ({
      company: t('joinProfile.company'),
      firstName: t('joinProfile.firstName'),
      lastName: t('joinProfile.lastName'),
      email: t('joinProfile.email'),
      phone: t('joinProfile.phone'),
      birthDateHint: t('joinProfile.birthDateHint'),
      birthDatePlaceholder: t('joinProfile.birthDatePlaceholder'),
      countryCodeLabel: t('joinProfile.countryCodeLabel'),
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
      successBodyLineOne: t('joinProfile.successBodyLineOne', {
        companyName: '{companyName}',
      }),
      successBodyLineTwo: t('joinProfile.successBodyLineTwo'),
      done: t('joinProfile.done'),
    }),
    [t],
  );
  const joinProfileInputStyle = {
    color: '#24314b',
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    includeFontPadding: false,
  } as const;
  const joinProfileMetaLabelStyle = {
    color: '#7a8094',
    fontFamily: 'Manrope_500Medium',
    fontSize: 13,
    includeFontPadding: false,
    letterSpacing: 1.2,
    lineHeight: 18,
    textTransform: 'uppercase',
  } as const;
  const joinProfileHeadingStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 28,
    includeFontPadding: false,
    lineHeight: 32,
  } as const;
  const joinProfileBodyStyle = {
    color: '#6f7892',
    fontFamily: 'Manrope_500Medium',
    fontSize: 16,
    includeFontPadding: false,
    lineHeight: 24,
  } as const;
  const joinProfileErrorStyle = {
    color: '#b93b4a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: 'center',
  } as const;

  useEffect(() => {
    transition.value = withTiming(mode === 'landing' ? 0 : 1, AUTH_TRANSITION_TIMING);
  }, [mode, transition]);

  useEffect(() => {
    if (!interactionBlocked) {
      return;
    }

    const timer = setTimeout(() => {
      setInteractionBlocked(false);
    }, 220);

    return () => clearTimeout(timer);
  }, [interactionBlocked]);

  useEffect(() => {
    if (mode !== 'joinProfile' || joinProfileSubmitted) {
      return;
    }

    const timer = setTimeout(() => {
      joinProfileFirstNameInputRef.current?.focus();
    }, 280);

    return () => clearTimeout(timer);
  }, [joinProfileSubmitted, mode]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = () => {
      setKeyboardVisible(true);
      keyboardProgress.value = withTiming(1, AUTH_KEYBOARD_TIMING);
    };

    const handleHide = () => {
      setKeyboardVisible(false);
      keyboardProgress.value = withTiming(0, AUTH_KEYBOARD_TIMING);
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [keyboardProgress]);

  const heroStyle = useAnimatedStyle(() => {
    const compactTargetHeight =
      mode === 'joinProfile'
        ? interpolate(keyboardProgress.value, [0, 1], [compactHeroHeight, 0], Extrapolation.CLAMP)
        : interpolate(
          keyboardProgress.value,
          [0, 1],
          [collapsedHeroHeight, compactHeroHeight],
          Extrapolation.CLAMP,
        );

    return {
      top: 0,
      zIndex: 20,
      height: interpolate(
        transition.value,
        [0, 1],
        [
          screenHeight + 40,
          compactTargetHeight,
        ],
        Extrapolation.CLAMP,
      ),
      borderBottomLeftRadius: interpolate(transition.value, [0, 1], [0, 34], Extrapolation.CLAMP),
      borderBottomRightRadius: interpolate(transition.value, [0, 1], [0, 34], Extrapolation.CLAMP),
    };
  });

  const heroContentStyle = useAnimatedStyle(() => {
    const compactMarginTop =
      mode === 'joinProfile'
        ? interpolate(keyboardProgress.value, [0, 1], [compactHeroTitleOffset, 0], Extrapolation.CLAMP)
        : interpolate(
          keyboardProgress.value,
          [0, 1],
          [210, compactHeroTitleOffset],
          Extrapolation.CLAMP,
        );

    return {
      marginTop: interpolate(
        transition.value,
        [0, 1],
        [
          screenHeight * 0.46,
          compactMarginTop,
        ],
        Extrapolation.CLAMP,
      ),
      opacity: mode === 'joinProfile' ? interpolate(keyboardProgress.value, [0, 1], [1, 0], Extrapolation.CLAMP) : 1,
      transform: [
        {
          translateY: interpolate(transition.value, [0, 1], [0, -18], Extrapolation.CLAMP),
        },
      ],
    };
  });

  const landingActionsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(transition.value, [0, 1], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(transition.value, [0, 1], [0, -28], Extrapolation.CLAMP),
      },
    ],
  }));

  const formAreaStyle = useAnimatedStyle(() => {
    const compactPaddingTop =
      mode === 'joinProfile'
        ? interpolate(keyboardProgress.value, [0, 1], [compactFormTop, 8], Extrapolation.CLAMP)
        : interpolate(
          keyboardProgress.value,
          [0, 1],
          [collapsedHeroHeight - 40, compactFormTop],
          Extrapolation.CLAMP,
        );

    return {
      paddingTop: interpolate(
        transition.value,
        [0, 1],
        [
          screenHeight * 0.82,
          compactPaddingTop,
        ],
        Extrapolation.CLAMP,
      ),
      opacity: interpolate(transition.value, [0, 1], [0, 1], Extrapolation.CLAMP),
    };
  });

  function switchMode(nextMode: AuthMode, options?: { skipHaptic?: boolean }) {
    if (interactionBlocked) {
      return;
    }

    Keyboard.dismiss();

    if (!options?.skipHaptic) {
      hapticSelection();
    }

    setMessage(null);

    if (mode !== nextMode) {
      setInteractionBlocked(true);
    }

    if (nextMode !== 'joinProfile') {
      setJoinCompany(null);
      setJoinProfileForm(INITIAL_JOIN_PROFILE_FORM);
      setJoinProfileSubmitted(false);
    }
    setMode(nextMode);
  }

  function focusJoinProfileInput(input: TextInput | null) {
    setJoinProfileDatePickerVisible(false);
    setJoinProfileCountryPickerVisible(false);
    requestAnimationFrame(() => {
      input?.focus();
    });
  }

  function formatJoinProfileBirthDate(date: Date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function parseJoinProfileBirthDate(value: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return new Date(2000, 0, 1);
    }

    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function handleJoinProfileBirthDateChange(event: DateTimePickerEvent, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setJoinProfileDatePickerVisible(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    setJoinProfileForm((current) => ({
      ...current,
      birthDate: formatJoinProfileBirthDate(selectedDate),
    }));
    setMessage(null);
  }

  function handleHeroTap() {
    if (interactionBlocked) {
      return;
    }

    Keyboard.dismiss();
    hapticSelection();
    setMessage(null);

    if (mode === 'joinProfile') {
      setMode('join');
      setSubmitting(false);
      return;
    }

    setInteractionBlocked(true);
    setMode('landing');
    setInviteCode('');
    setIdentifier('');
    setPassword('');
    setJoinCompany(null);
    setJoinProfileForm(INITIAL_JOIN_PROFILE_FORM);
    setJoinProfileSubmitted(false);
    setSubmitting(false);
    setKeyboardVisible(false);
    keyboardProgress.value = withTiming(0, AUTH_KEYBOARD_TIMING);
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
      const payload = await lookupCompanyByCode(trimmedInviteCode);
      hapticSuccess();
      setJoinCompany(payload);
      setJoinProfileSubmitted(false);
      setMode('joinProfile');
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : t('invite.verificationFailed'));
    } finally {
      setSubmitting(false);
    }
  }

  async function pickJoinProfilePhoto(source: 'camera' | 'library') {
    try {
      setMessage(null);

      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        hapticError();
        setMessage(joinProfileCopy.photoRequired);
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

      setJoinProfileForm((current) => ({
        ...current,
        avatarDataUrl: `data:${mimeType};base64,${asset.base64}`,
        avatarPreviewUri: asset.uri,
      }));
      hapticSuccess();
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : joinProfileCopy.photoRequired);
    }
  }

  function openJoinProfilePhotoChooser() {
    Alert.alert(joinProfileCopy.photoTitle, undefined, [
      {
        text: joinProfileCopy.pickPhoto,
        onPress: () => {
          void pickJoinProfilePhoto('library');
        },
      },
      {
        text: joinProfileCopy.takePhoto,
        onPress: () => {
          void pickJoinProfilePhoto('camera');
        },
      },
      {
        text: joinProfileCopy.cancel,
        style: 'cancel',
      },
    ]);
  }

  async function handleJoinProfileSubmit() {
    if (!joinCompany) {
      return;
    }

    const trimmedFirstName = joinProfileForm.firstName.trim();
    const trimmedLastName = joinProfileForm.lastName.trim();
    const trimmedEmail = joinProfileForm.email.trim().toLowerCase();
    const trimmedPhone = joinProfileForm.phone.replace(/\D/g, '').trim();
    const trimmedBirthDate = joinProfileForm.birthDate.trim();

    if (
      !trimmedFirstName ||
      !trimmedLastName ||
      !trimmedEmail ||
      !trimmedPhone ||
      !trimmedBirthDate ||
      !joinProfileForm.avatarDataUrl
    ) {
      hapticError();
      setMessage(joinProfileCopy.requiredFields);
      return;
    }

    if (!trimmedEmail.includes('@')) {
      hapticError();
      setMessage(joinProfileCopy.invalidEmail);
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedBirthDate)) {
      hapticError();
      setMessage(joinProfileCopy.invalidBirthDate);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      await submitCompanyJoinRequest({
        code: joinCompany.companyCode,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        email: trimmedEmail,
        phone: `${joinProfileCountryCode}${trimmedPhone}`,
        birthDate: trimmedBirthDate,
        avatarDataUrl: joinProfileForm.avatarDataUrl,
      });
      hapticSuccess();
      setJoinProfileSubmitted(true);
    } catch (error) {
      hapticError();
      setMessage(error instanceof Error ? error.message : joinProfileCopy.requiredFields);
    } finally {
      setSubmitting(false);
    }
  }

  function finishJoinProfileFlow() {
    setJoinProfileSubmitted(false);
    setJoinCompany(null);
    setJoinProfileForm(INITIAL_JOIN_PROFILE_FORM);
    setJoinProfileCountryCode('+7');
    setJoinProfileCountryPickerVisible(false);
    setJoinProfileDatePickerVisible(false);
    setInviteCode('');
    setMessage(null);
    setMode('landing');
  }

  const passwordToggleLabel = passwordVisible
    ? t('login.hidePassword')
    : t('login.showPassword');

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

      const session = await signInWithEmail(trimmedIdentifier, trimmedPassword);
      hapticSuccess();

      if (!session.user.workspaceAccessAllowed) {
        signInLocally();
        return;
      }

      await bootstrapDemoDevice();
      const [biometricPolicy, accessStatus, locationAccessStatus] = await Promise.all([
        loadBiometricPolicy(),
        loadMyAccessStatus(),
        getPreciseLocationAccessStatus(),
      ]);

      if (!accessStatus.workspaceAccessAllowed) {
        signInLocally();
        return;
      }

      await warmWorkspaceCachesWithinBudget(session.user.roleCodes, 320);
      signInLocally();

      if (biometricPolicy.enrollmentStatus !== 'ENROLLED') {
        router.replace({
          pathname: '/biometric',
          params: {
            mode: 'enroll',
            returnTo: '/onboarding/workspace-ready',
          },
        });
        return;
      }

      if (locationAccessStatus.status !== 'ready') {
        router.replace('/onboarding/workspace-ready' as never);
      }
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
          <Text style={heroSubtitleTextStyle}>Your </Text>
          <Text style={heroSubtitleAccentStyle}>workspace</Text>
          <Text style={heroSubtitleTextStyle}> in your pocket</Text>
        </Text>
      );
    }

    return (
      <Text
        className={`text-center text-[22px] leading-[30px] ${textColorClassName}`}
        style={{ fontFamily: 'Manrope_500Medium' }}
      >
        {t('login.heroSubtitle')}
      </Text>
    );
  }

  function renderJoinTitle() {
    return (
      <Text style={styles.joinTitle}>
        {t('login.joinWithCode')}
      </Text>
    );
  }

  function renderSignInTitle() {
    return (
      <View pointerEvents="none" style={styles.signInTitleSlot}>
        <Text style={styles.signInTitle}>
          {t('login.signInToAccount')}
        </Text>
      </View>
    );
  }

  function renderJoinProfileTitle() {
    return (
      <Text className="text-[31px] leading-[34px] text-[#26334a]">
        {t('invite.joinWithCodeTitle')}
      </Text>
    );
  }

  const actionLabelStyle = {
    color: '#f7f1e6',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 19,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 27,
  } as const;

  const heroSubtitleTextStyle = {
    fontFamily: 'Manrope_500Medium',
    includeFontPadding: false,
  } as const;

  const heroSubtitleAccentStyle = {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    includeFontPadding: false,
  } as const;

  const signInPromptStyle = {
    color: '#7c8591',
    fontFamily: 'Manrope_500Medium',
    fontSize: 17,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 24,
  } as const;

  const signInLinkStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 17,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 24,
  } as const;

  const joinPromptStyle = {
    color: '#7c8591',
    fontFamily: 'Manrope_500Medium',
    fontSize: 17,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 24,
  } as const;

  const joinLinkStyle = {
    color: '#26334a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 17,
    includeFontPadding: Platform.OS === 'android',
    lineHeight: 24,
  } as const;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['left', 'right', 'bottom']}>
      <StatusBar backgroundColor="transparent" style="light" translucent />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 12}
      >
        <TouchableWithoutFeedback
          accessible={false}
          onPress={() => {
            if (!keyboardVisible) {
              return;
            }

            Keyboard.dismiss();
          }}
        >
          <View className="flex-1 bg-white">
            <Animated.View
              className="absolute left-0 right-0 overflow-hidden"
              renderToHardwareTextureAndroid
              shouldRasterizeIOS
              style={heroStyle}
            >
              <View className="absolute inset-0">
                <Image
                  className="h-full w-full"
                  resizeMode="cover"
                  source={require('../../timelapse-poster.jpg')}
                />
                {shouldRenderHeroVideo ? (
                  <View
                    pointerEvents="none"
                    style={{
                      ...StyleSheet.absoluteFillObject,
                      opacity: videoReady ? 1 : 0,
                    }}
                  >
                    <AuthHeroVideoOverlay onReady={() => setVideoReady(true)} />
                  </View>
                ) : null}
                <LinearGradient
                  colors={['rgba(5,10,15,0.16)', 'rgba(5,10,15,0.34)', 'rgba(5,10,15,0.64)', 'rgba(5,10,15,0.78)']}
                  locations={[0, 0.32, 0.72, 1]}
                  style={StyleSheet.absoluteFillObject}
                />
              </View>

              <View
                pointerEvents={mode === 'landing' ? 'none' : interactionBlocked ? 'none' : 'auto'}
                onStartShouldSetResponder={() => !interactionBlocked}
                onResponderRelease={handleHeroTap}
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
                  onPress={() => switchMode('join', { skipHaptic: true })}
                >
                  <Text className="text-[18px] font-semibold text-[#0f2530]">{t('login.joinTeam')}</Text>
                </PressableScale>

                <PressableScale
                  className="mt-3 min-h-[58px] items-center justify-center rounded-[20px] border border-white/35 bg-white/8"
                  haptic="selection"
                  onPress={() => switchMode('signin', { skipHaptic: true })}
                >
                  <Text className="text-[18px] font-semibold text-white">{t('login.signIn')}</Text>
                </PressableScale>
              </Animated.View>
            </Animated.View>

            <Animated.View
              className="flex-1 px-6"
              pointerEvents={mode === 'landing' || interactionBlocked ? 'none' : 'auto'}
              renderToHardwareTextureAndroid
              shouldRasterizeIOS
              style={[
                formAreaStyle,
                {
                  paddingBottom: insets.bottom + (keyboardVisible ? 8 : 20),
                },
              ]}
            >
              {mode === 'landing' ? null : (
                <Animated.View className="flex-1">
                  <View className="flex-1">
                    <View
                      className={
                        keyboardVisible
                          ? mode === 'joinProfile'
                            ? 'pb-4 pt-3'
                            : mode === 'join'
                              ? 'pb-8 pt-10'
                              : 'pb-6 pt-6'
                          : mode === 'joinProfile'
                            ? 'pb-6 pt-6'
                            : mode === 'join'
                              ? compactJoinContentPaddingClass
                              : compactSignInContentPaddingClass
                      }
                    >
                      {mode === 'joinProfile' && joinProfileSubmitted ? null : (
                        <View className="mb-7 items-center" style={mode === 'signin' ? styles.signInTitleWrapper : undefined}>
                          {mode === 'joinProfile'
                            ? renderJoinProfileTitle()
                            : mode === 'join'
                              ? renderJoinTitle()
                              : renderSignInTitle()}
                        </View>
                      )}

                      {mode === 'joinProfile' ? (
                        <Animated.View className="gap-3">
                          {joinProfileSubmitted ? (
                            <View className="items-center gap-4 pt-16">
                              <Animated.View className="h-20 w-20 items-center justify-center rounded-full bg-[#eaf7ef]">
                                <Ionicons color="#22a45d" name="checkmark-circle" size={44} />
                              </Animated.View>
                              <Text className="text-center" style={joinProfileHeadingStyle}>
                                {joinProfileCopy.successTitle}
                              </Text>
                              <Text className="text-center" style={joinProfileBodyStyle}>
                                {joinProfileCopy.successBodyLineOne.replace('{companyName}', joinCompany?.companyName ?? '')}
                              </Text>
                              <Text className="text-center" style={joinProfileBodyStyle}>
                                {joinProfileCopy.successBodyLineTwo}
                              </Text>
                            </View>
                          ) : (
                            <>
                              <TextInput
                                autoCapitalize="words"
                                autoCorrect={false}
                                autoFocus={mode === 'joinProfile' && !joinProfileSubmitted}
                                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                                importantForAutofill="no"
                                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                                key="join-profile-first-name-input"
                                onChangeText={(nextValue) => {
                                  setJoinProfileForm((current) => ({ ...current, firstName: nextValue }));
                                  setMessage(null);
                                }}
                                onTouchStart={() => focusJoinProfileInput(joinProfileFirstNameInputRef.current)}
                                placeholder={`${joinProfileCopy.firstName}*`}
                                placeholderTextColor="#7f8da1"
                                returnKeyType="next"
                                ref={joinProfileFirstNameInputRef}
                                selectionColor="#26334a"
                                showSoftInputOnFocus
                                style={joinProfileInputStyle}
                                textAlign="center"
                                value={joinProfileForm.firstName}
                              />
                              <TextInput
                                autoCapitalize="words"
                                autoCorrect={false}
                                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                                importantForAutofill="no"
                                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                                key="join-profile-last-name-input"
                                onChangeText={(nextValue) => {
                                  setJoinProfileForm((current) => ({ ...current, lastName: nextValue }));
                                  setMessage(null);
                                }}
                                onTouchStart={() => focusJoinProfileInput(joinProfileLastNameInputRef.current)}
                                placeholder={`${joinProfileCopy.lastName}*`}
                                placeholderTextColor="#7f8da1"
                                returnKeyType="next"
                                ref={joinProfileLastNameInputRef}
                                selectionColor="#26334a"
                                showSoftInputOnFocus
                                style={joinProfileInputStyle}
                                textAlign="center"
                                value={joinProfileForm.lastName}
                              />
                              <TextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-4 text-center text-[17px] text-[#0f2530]"
                                importantForAutofill="no"
                                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'email-address'}
                                key="join-profile-email-input"
                                onChangeText={(nextValue) => {
                                  setJoinProfileForm((current) => ({ ...current, email: nextValue }));
                                  setMessage(null);
                                }}
                                onTouchStart={() => focusJoinProfileInput(joinProfileEmailInputRef.current)}
                                placeholder={`${joinProfileCopy.email}*`}
                                placeholderTextColor="#7f8da1"
                                returnKeyType="next"
                                ref={joinProfileEmailInputRef}
                                selectionColor="#26334a"
                                showSoftInputOnFocus
                                style={joinProfileInputStyle}
                                textAlign="center"
                                value={joinProfileForm.email}
                              />
                              <View className="min-h-[58px] flex-row items-center rounded-[18px] border border-[#ddd5c7] bg-white px-2">
                                <PressableScale
                                  className="h-[46px] min-w-[96px] items-center justify-center rounded-[14px] border border-[#e7dfd3] bg-[#fbfaf7] px-3"
                                  haptic="selection"
                                  onPress={() => {
                                    Keyboard.dismiss();
                                    setJoinProfileCountryPickerVisible(true);
                                  }}
                                >
                                  <Text className="text-[15px] text-[#24314b]" style={joinProfileInputStyle}>
                                    {joinProfileCountryCode}
                                  </Text>
                                </PressableScale>
                                <TextInput
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  className="min-h-[58px] flex-1 px-4 text-center text-[17px] text-[#0f2530]"
                                  importantForAutofill="no"
                                  key="join-profile-phone-input"
                                  keyboardType="phone-pad"
                                  onChangeText={(nextValue) => {
                                    setJoinProfileForm((current) => ({ ...current, phone: nextValue.replace(/[^\d\s()-]/g, '') }));
                                    setMessage(null);
                                  }}
                                  onTouchStart={() => focusJoinProfileInput(joinProfilePhoneInputRef.current)}
                                  placeholder={`${joinProfileCopy.phone}*`}
                                  placeholderTextColor="#7f8da1"
                                  returnKeyType="next"
                                  ref={joinProfilePhoneInputRef}
                                  selectionColor="#26334a"
                                  showSoftInputOnFocus
                                  style={joinProfileInputStyle}
                                  textAlign="center"
                                  value={joinProfileForm.phone}
                                />
                              </View>
                              <PressableScale
                                className="min-h-[58px] flex-row items-center justify-between rounded-[18px] border border-[#ddd5c7] bg-white px-4"
                                haptic="selection"
                                onPress={() => {
                                  Keyboard.dismiss();
                                  setJoinProfileDatePickerVisible(true);
                                }}
                              >
                                <Text className="text-[16px] text-[#24314b]" style={joinProfileInputStyle}>
                                  {joinProfileForm.birthDate || joinProfileCopy.birthDatePlaceholder}
                                </Text>
                                <Text className="text-[14px] text-[#7f8da1]" style={joinProfileBodyStyle}>
                                  {joinProfileCopy.birthDateHint}
                                </Text>
                              </PressableScale>

                              <View className="items-center justify-center py-2">
                                {joinProfileForm.avatarPreviewUri ? (
                                  <PressableScale
                                    className="h-32 w-32 rounded-[26px]"
                                    haptic="selection"
                                    onPress={openJoinProfilePhotoChooser}
                                  >
                                    <Image
                                      className="h-32 w-32 rounded-[26px]"
                                      resizeMode="cover"
                                      source={{ uri: joinProfileForm.avatarPreviewUri }}
                                    />
                                  </PressableScale>
                                ) : (
                                  <PressableScale
                                    className="h-32 w-32 items-center justify-center rounded-[26px] border border-dashed border-[#c6d1e4] bg-white px-4"
                                    haptic="selection"
                                    onPress={openJoinProfilePhotoChooser}
                                  >
                                    <Text className="text-center" style={joinProfileBodyStyle}>
                                      {joinProfileCopy.photoRequired}
                                    </Text>
                                  </PressableScale>
                                )}
                              </View>
                            </>
                          )}
                          {message ? <Text style={joinProfileErrorStyle}>{message}</Text> : null}

                          <PressableScale
                            className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${submitting ? 'opacity-70' : ''
                              }`}
                            disabled={submitting}
                            haptic="medium"
                            style={joinProfileSubmitted ? { marginTop: 80 } : undefined}
                            onPress={() =>
                              void (
                                joinProfileSubmitted
                                  ? finishJoinProfileFlow()
                                  : handleJoinProfileSubmit()
                              )
                            }
                          >
                            <Text style={actionLabelStyle}>
                              {joinProfileSubmitted
                                ? joinProfileCopy.done
                                : submitting
                                  ? joinProfileCopy.submitting
                                  : joinProfileCopy.submit}
                            </Text>
                          </PressableScale>
                        </Animated.View>
                      ) : (
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
                              <View className="relative justify-center">
                                <TextInput
                                  autoCapitalize="none"
                                  autoCorrect={false}
                                  className="min-h-[58px] rounded-[18px] border border-[#ddd5c7] bg-white px-14 text-center text-[17px] text-[#0f2530]"
                                  key="signin-password-input"
                                  onChangeText={(nextValue) => {
                                    setPassword(nextValue);
                                    setMessage(null);
                                  }}
                                  placeholder={t('login.passwordPlaceholder')}
                                  placeholderTextColor="#7f8da1"
                                  returnKeyType="go"
                                  secureTextEntry={!passwordVisible}
                                  selectionColor="#26334a"
                                  showSoftInputOnFocus
                                  textAlign="center"
                                  value={password}
                                />
                                <Pressable
                                  accessibilityLabel={passwordToggleLabel}
                                  accessibilityRole="button"
                                  className="absolute right-0 top-0 h-[58px] w-14 items-center justify-center"
                                  hitSlop={10}
                                  onPress={() => setPasswordVisible((current) => !current)}
                                >
                                  <Ionicons
                                    color="#6f7892"
                                    name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
                                    size={22}
                                  />
                                </Pressable>
                              </View>
                            </>
                          )}
                        </View>
                      )}

                      {mode !== 'joinProfile' && message ? (
                        <Text
                          className="mt-4 text-center text-[14px] leading-[20px] text-[#9e3541]"
                        >
                          {message}
                        </Text>
                      ) : null}
                    </View>

                    {mode !== 'joinProfile' ? (
                      <View
                        className={
                          keyboardVisible
                            ? mode === 'join'
                              ? 'pt-8'
                              : 'pt-4'
                            : mode === 'join'
                              ? compactJoinFooterPaddingClass
                              : compactSignInFooterPaddingClass
                        }
                        style={{
                          paddingBottom: insets.bottom + (keyboardVisible ? 8 : 0),
                          marginBottom: keyboardVisible ? 0 : FORM_FOOTER_BOTTOM_OFFSET,
                        }}
                      >
                        <PressableScale
                          className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#546cf2] ${submitting ? 'opacity-70' : ''
                            }`}
                          disabled={submitting}
                          haptic="medium"
                          onPress={() =>
                            void (mode === 'join' ? handleJoinTeam() : handleSignIn())
                          }
                        >
                          {mode === 'join' ? (
                            <Text style={actionLabelStyle}>{submitting ? '...' : t('invite.joinButton')}</Text>
                          ) : (
                            <Text style={actionLabelStyle}>{submitting ? '...' : t('login.signIn')}</Text>
                          )}
                        </PressableScale>

                        {mode === 'join' ? (
                          <View className="mt-10 min-h-[24px] items-center justify-center" style={styles.joinFooterWrapper}>
                            <Text style={joinPromptStyle}>
                              <Text style={joinPromptStyle}>{t('welcome.alreadyHaveAccount')} </Text>
                              <Text onPress={() => switchMode('signin')} style={joinLinkStyle}>
                                {t('login.logIn')}
                              </Text>
                            </Text>
                          </View>
                        ) : (
                          <View className="mt-10 min-h-[24px] items-center justify-center" style={styles.signInFooterWrapper}>
                            <Text style={signInPromptStyle}>
                              <Text style={signInPromptStyle}>{t('login.needInvite')} </Text>
                              <Text onPress={() => switchMode('join')} style={signInLinkStyle}>
                                {t('login.joinTeam')}
                              </Text>
                            </Text>
                          </View>
                        )}
                      </View>
                    ) : null}
                  </View>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
        <Modal
          animationType="slide"
          onRequestClose={() => setJoinProfileCountryPickerVisible(false)}
          transparent
          visible={joinProfileCountryPickerVisible}
        >
          <Pressable
            onPress={() => setJoinProfileCountryPickerVisible(false)}
            style={styles.modalOverlay}
          >
            <Pressable onPress={() => undefined} style={styles.modalSheet}>
              <Text style={styles.modalTitle}>{t('login.countryPickerTitle')}</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {JOIN_PROFILE_COUNTRY_CODES.map((option) => (
                  <PressableScale
                    className="flex-row items-center justify-between rounded-[18px] px-4 py-4"
                    haptic="selection"
                    key={option.code}
                    onPress={() => {
                      setJoinProfileCountryCode(option.code);
                      setJoinProfileCountryPickerVisible(false);
                      setMessage(null);
                    }}
                  >
                    <View className="gap-1">
                      <Text style={styles.countryCodeValue}>{option.code}</Text>
                      <Text style={styles.countryCodeLabel}>{option.country}</Text>
                    </View>
                    {joinProfileCountryCode === option.code ? <Text style={styles.countryCodeCheck}>✓</Text> : null}
                  </PressableScale>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
        {Platform.OS === 'ios' ? (
          <Modal
            animationType="slide"
            transparent
            visible={joinProfileDatePickerVisible}
            onRequestClose={() => setJoinProfileDatePickerVisible(false)}
          >
            <Pressable
              onPress={() => setJoinProfileDatePickerVisible(false)}
              style={styles.modalOverlay}
            >
              <Pressable onPress={() => undefined} style={[styles.modalSheet, { paddingBottom: insets.bottom + 20 }]}>
                <View className="mb-4 flex-row items-center justify-between">
                  <Text style={[styles.modalTitle, { marginBottom: 0 }]}>
                    {joinProfileCopy.birthDatePlaceholder.replace('*', '')}
                  </Text>
                  <PressableScale haptic="selection" onPress={() => setJoinProfileDatePickerVisible(false)}>
                    <Text className="text-[17px] font-semibold text-[#546cf2]">{joinProfileCopy.done}</Text>
                  </PressableScale>
                </View>
                <DateTimePicker
                  display="spinner"
                  maximumDate={new Date()}
                  mode="date"
                  onChange={handleJoinProfileBirthDateChange}
                  value={parseJoinProfileBirthDate(joinProfileForm.birthDate)}
                  textColor="#000000"
                />
              </Pressable>
            </Pressable>
          </Modal>
        ) : (
          joinProfileDatePickerVisible && (
            <DateTimePicker
              display="default"
              maximumDate={new Date()}
              mode="date"
              onChange={handleJoinProfileBirthDateChange}
              value={parseJoinProfileBirthDate(joinProfileForm.birthDate)}
            />
          )
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  signInTitleWrapper: {
    paddingHorizontal: 4,
    paddingBottom: Platform.OS === 'android' ? 4 : 0,
    marginBottom: Platform.OS === 'android' ? -4 : 0,
  },
  signInTitleSlot: {
    position: 'relative',
    width: '100%',
    minHeight: 40,
  },
  signInTitle: {
    position: 'absolute',
    top: -28,
    left: 0,
    right: 0,
    color: '#26334a',
    fontSize: 31,
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: Platform.OS === 'android',
  },
  signInTitleAccent: {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    includeFontPadding: Platform.OS === 'android',
  },
  signInTitleBody: {
    fontFamily: 'Manrope_500Medium',
    includeFontPadding: Platform.OS === 'android',
  },
  joinTitle: {
    color: '#26334a',
    fontSize: 31,
    lineHeight: 40,
    textAlign: 'center',
    includeFontPadding: Platform.OS === 'android',
  },
  joinTitleAccent: {
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    includeFontPadding: Platform.OS === 'android',
  },
  joinTitleBody: {
    fontFamily: 'Manrope_500Medium',
    includeFontPadding: Platform.OS === 'android',
  },
  joinFooterWrapper: {
    paddingBottom: 0,
    marginBottom: 0,
    marginTop: 26,
  },
  signInFooterWrapper: {
    paddingBottom: 0,
    marginBottom: 0,
    marginTop: 26,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 24, 44, 0.26)',
  },
  modalSheet: {
    maxHeight: '58%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
  },
  modalTitle: {
    marginBottom: 14,
    color: '#26334a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 24,
    includeFontPadding: false,
  },
  countryCodeValue: {
    color: '#26334a',
    fontFamily: 'Manrope_500Medium',
    fontSize: 18,
    includeFontPadding: false,
  },
  countryCodeLabel: {
    color: '#7f8da1',
    fontFamily: 'Manrope_500Medium',
    fontSize: 14,
    includeFontPadding: false,
  },
  countryCodeCheck: {
    color: '#546cf2',
    fontFamily: 'Manrope_500Medium',
    fontSize: 20,
    includeFontPadding: false,
  },
});

export default AuthScreen;
