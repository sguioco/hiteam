import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { getCalendars } from 'expo-localization';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapView, { Circle, Marker, type MapPressEvent } from 'react-native-maps';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../../components/ui/text';
import { PressableScale } from '../../components/ui/pressable-scale';
import {
  createManagerShiftTemplate,
  createManagerTeam,
  loadMobileOrganizationSetup,
  saveMobileOrganizationSetup,
  type MobileOrganizationSetup,
} from '../../lib/api';
import { updateAuthFlowState } from '../../lib/auth-flow';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import { useI18n } from '../../lib/i18n';
import { getWorkspaceSetupHref, resolveWorkspaceSetupStep } from '../../lib/workspace-setup';

type SetupStep = 'workplace' | 'team' | 'schedule';
type TimeField = 'start' | 'end' | null;

const STEP_ORDER: SetupStep[] = ['workplace', 'team', 'schedule'];
const DEFAULT_RADIUS_METERS = 100;
const MIN_RADIUS_METERS = 100;
const MAX_RADIUS_METERS = 1000;
const RADIUS_STEP_METERS = 25;
const DEFAULT_MAP_COORDINATE = { latitude: 25.2048, longitude: 55.2708 };
const WEEK_DAYS = [
  { value: 1, en: 'Mon', ru: 'Пн' },
  { value: 2, en: 'Tue', ru: 'Вт' },
  { value: 3, en: 'Wed', ru: 'Ср' },
  { value: 4, en: 'Thu', ru: 'Чт' },
  { value: 5, en: 'Fri', ru: 'Пт' },
  { value: 6, en: 'Sat', ru: 'Сб' },
  { value: 7, en: 'Sun', ru: 'Вс' },
] as const;

function getDeviceTimeZone() {
  try {
    return getCalendars()[0]?.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function createTime(hours: number, minutes = 0) {
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

function formatTime(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function formatAddress(geo: Location.LocationGeocodedAddress | undefined, fallback: string) {
  if (!geo) {
    return fallback;
  }

  return Array.from(
    new Set([geo.name, geo.street, geo.city, geo.district, geo.region, geo.country].filter(Boolean)),
  ).join(', ') || fallback;
}

export default function OrganizationOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language } = useI18n();
  const isRussian = language === 'ru';
  const copy = useMemo(
    () =>
      isRussian
        ? {
            setup: 'Настройка организации',
            workplace: 'Рабочее место',
            workplaceTitle: 'Где работает команда?',
            workplaceBody: 'Настройте рабочую точку, геозону и правила посещаемости.',
            organizationName: 'Название организации',
            logo: 'Логотип',
            chooseLogo: 'Выбрать логотип',
            address: 'Адрес организации',
            searchAddress: 'Найти',
            currentLocation: 'Моя геолокация',
            radius: 'Радиус геозоны',
            timeZone: 'Часовой пояс',
            attendance: 'Учёт посещаемости',
            attendanceBody: 'Смены, check-in/out, геолокация, биометрия и рейтинг.',
            tasksOnly: 'Только задачи и чек-листы',
            tasksOnlyBody: 'Без смен, отметок посещаемости, биометрии и рейтинга.',
            team: 'Команда',
            teamTitle: 'Создайте первую команду',
            teamBody: 'Например: Основная смена, Кухня или Склад. Сотрудников можно добавить позже.',
            teamName: 'Название команды',
            teamDescription: 'Описание (необязательно)',
            schedule: 'График',
            scheduleTitle: 'Добавьте шаблон смены',
            scheduleBody: 'Он появится в календаре и ускорит назначение смен сотрудникам.',
            templateName: 'Название шаблона',
            startsAt: 'Начало',
            endsAt: 'Конец',
            workDays: 'Рабочие дни',
            tasksOnlySchedule: 'График не нужен: вы выбрали режим только задач и чек-листов.',
            continue: 'Продолжить',
            finish: 'Завершить настройку',
            skip: 'Пропустить сейчас',
            back: 'Назад',
            loading: 'Загружаем организацию...',
            saving: 'Сохраняем...',
            requiredName: 'Введите название организации.',
            requiredAddress: 'Найдите адрес или поставьте точку на карте.',
            locationPermission: 'Разрешите доступ к геолокации, чтобы определить рабочую точку.',
            locationError: 'Не удалось определить геолокацию.',
            addressError: 'Адрес не найден. Уточните город, улицу и номер дома.',
            saveError: 'Не удалось сохранить настройку организации.',
            scheduleError: 'Проверьте название, рабочие дни и время смены.',
          }
        : {
            setup: 'Organization setup',
            workplace: 'Workplace',
            workplaceTitle: 'Where does your team work?',
            workplaceBody: 'Set the workplace, geofence, and attendance rules.',
            organizationName: 'Organization name',
            logo: 'Logo',
            chooseLogo: 'Choose logo',
            address: 'Organization address',
            searchAddress: 'Find',
            currentLocation: 'Use my location',
            radius: 'Geofence radius',
            timeZone: 'Time zone',
            attendance: 'Attendance tracking',
            attendanceBody: 'Shifts, check-in/out, location, biometrics, and leaderboard.',
            tasksOnly: 'Tasks and checklists only',
            tasksOnlyBody: 'No shifts, attendance, biometrics, or leaderboard.',
            team: 'Team',
            teamTitle: 'Create your first team',
            teamBody: 'For example: Main shift, Kitchen, or Warehouse. You can add employees later.',
            teamName: 'Team name',
            teamDescription: 'Description (optional)',
            schedule: 'Schedule',
            scheduleTitle: 'Add a shift template',
            scheduleBody: 'It will appear in Calendar and make assigning shifts faster.',
            templateName: 'Template name',
            startsAt: 'Starts',
            endsAt: 'Ends',
            workDays: 'Work days',
            tasksOnlySchedule: 'A schedule is not needed because tasks-only mode is selected.',
            continue: 'Continue',
            finish: 'Finish setup',
            skip: 'Skip for now',
            back: 'Back',
            loading: 'Loading organization...',
            saving: 'Saving...',
            requiredName: 'Enter the organization name.',
            requiredAddress: 'Find an address or place a point on the map.',
            locationPermission: 'Allow location access to detect the workplace.',
            locationError: 'Unable to determine your location.',
            addressError: 'Address not found. Add a city, street, and building number.',
            saveError: 'Unable to save organization setup.',
            scheduleError: 'Check the template name, work days, and shift time.',
          },
    [isRussian],
  );
  const [step, setStep] = useState<SetupStep>('workplace');
  const [initialSetup, setInitialSetup] = useState<MobileOrganizationSetup | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locationBusy, setLocationBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('');
  const [companyLogoUrl, setCompanyLogoUrl] = useState('');
  const [companyLogoPreview, setCompanyLogoPreview] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geofenceRadiusMeters, setGeofenceRadiusMeters] = useState(DEFAULT_RADIUS_METERS);
  const [timeZone, setTimeZone] = useState(getDeviceTimeZone);
  const [attendanceTrackingEnabled, setAttendanceTrackingEnabled] = useState(true);
  const [teamName, setTeamName] = useState('');
  const [teamDescription, setTeamDescription] = useState('');
  const [templateName, setTemplateName] = useState(isRussian ? 'Основная смена' : 'Main shift');
  const [weekDays, setWeekDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startsAt, setStartsAt] = useState(() => createTime(9));
  const [endsAt, setEndsAt] = useState(() => createTime(18));
  const [timeField, setTimeField] = useState<TimeField>(null);
  const currentStepIndex = STEP_ORDER.indexOf(step);
  const mapCoordinate = {
    latitude: latitude ?? DEFAULT_MAP_COORDINATE.latitude,
    longitude: longitude ?? DEFAULT_MAP_COORDINATE.longitude,
  };

  useEffect(() => {
    let cancelled = false;

    async function loadSetup() {
      try {
        const setup = await loadMobileOrganizationSetup();
        if (cancelled) return;

        const configuredAddress = setup.location?.address === 'Not set yet' ? '' : setup.location?.address ?? '';
        const nextLatitude = setup.location?.latitude && setup.location.latitude !== 0 ? setup.location.latitude : null;
        const nextLongitude = setup.location?.longitude && setup.location.longitude !== 0 ? setup.location.longitude : null;

        setInitialSetup(setup);
        setCompanyName(setup.company?.name ?? '');
        setCompanyLogoUrl(setup.company?.logoUrl ?? '');
        setCompanyLogoPreview(setup.company?.logoUrl ?? '');
        setAddress(configuredAddress);
        setCountry(setup.location?.country ?? '');
        setLatitude(nextLatitude);
        setLongitude(nextLongitude);
        setGeofenceRadiusMeters(
          Math.max(MIN_RADIUS_METERS, setup.location?.geofenceRadiusMeters ?? setup.defaultGeofenceRadiusMeters ?? DEFAULT_RADIUS_METERS),
        );
        setTimeZone(setup.location?.timezone || getDeviceTimeZone());
        setAttendanceTrackingEnabled(setup.attendanceTrackingEnabled ?? true);
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : copy.saveError);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadSetup();
    return () => {
      cancelled = true;
    };
  }, [copy.saveError]);

  function goBack() {
    hapticSelection();
    setError(null);
    if (step === 'schedule') {
      setStep('team');
    } else if (step === 'team') {
      setStep('workplace');
    }
  }

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.86,
      selectionLimit: 1,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64 || !asset.uri) return;

    const dataUrl = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
    setCompanyLogoUrl(dataUrl);
    setCompanyLogoPreview(asset.uri);
    hapticSuccess();
  }

  async function commitCoordinate(nextLatitude: number, nextLongitude: number, fallback: string) {
    setLatitude(nextLatitude);
    setLongitude(nextLongitude);

    try {
      const [geo] = await Location.reverseGeocodeAsync({ latitude: nextLatitude, longitude: nextLongitude });
      setAddress(formatAddress(geo, fallback));
      setCountry(geo?.country ?? '');
    } catch {
      setAddress(fallback);
    }
  }

  async function useCurrentLocation() {
    setLocationBusy(true);
    setError(null);
    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) throw new Error(copy.locationPermission);

      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      await commitCoordinate(position.coords.latitude, position.coords.longitude, copy.currentLocation);
      hapticSuccess();
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.locationError);
    } finally {
      setLocationBusy(false);
    }
  }

  async function findAddress() {
    const query = address.trim();
    if (!query) {
      setError(copy.requiredAddress);
      return;
    }

    Keyboard.dismiss();
    setLocationBusy(true);
    setError(null);
    try {
      if (Platform.OS === 'android') {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted) permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) throw new Error(copy.locationPermission);
      }
      const [result] = await Location.geocodeAsync(query);
      if (!result) throw new Error(copy.addressError);
      await commitCoordinate(result.latitude, result.longitude, query);
      hapticSuccess();
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.addressError);
    } finally {
      setLocationBusy(false);
    }
  }

  function handleMapPress(event: MapPressEvent) {
    const coordinate = event.nativeEvent.coordinate;
    void commitCoordinate(
      coordinate.latitude,
      coordinate.longitude,
      `${coordinate.latitude.toFixed(5)}, ${coordinate.longitude.toFixed(5)}`,
    );
  }

  async function saveWorkplace() {
    if (!companyName.trim()) {
      setError(copy.requiredName);
      return;
    }
    if (!address.trim() || latitude === null || longitude === null) {
      setError(copy.requiredAddress);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextSetup = await saveMobileOrganizationSetup({
        address: address.trim(),
        attendanceTrackingEnabled,
        companyLogoUrl: companyLogoUrl || undefined,
        companyName: companyName.trim(),
        country: country || undefined,
        geofenceRadiusMeters,
        latitude,
        longitude,
        mode: initialSetup?.configured ? 'update' : 'create',
        timezone: timeZone,
      });
      setInitialSetup(nextSetup);
      setStep('team');
      hapticSuccess();
    } catch (nextError) {
      hapticError();
      setError(nextError instanceof Error ? nextError.message : copy.saveError);
    } finally {
      setSaving(false);
    }
  }

  async function continueFromTeam(skip = false) {
    if (!skip && teamName.trim()) {
      setSaving(true);
      setError(null);
      try {
        await createManagerTeam({
          avatarEmoji: '👥',
          description: teamDescription.trim() || undefined,
          name: teamName.trim(),
        });
        hapticSuccess();
      } catch (nextError) {
        hapticError();
        setError(nextError instanceof Error ? nextError.message : copy.saveError);
        setSaving(false);
        return;
      }
      setSaving(false);
    }
    setStep('schedule');
  }

  async function finishSetup(skipSchedule = false) {
    if (attendanceTrackingEnabled && !skipSchedule) {
      if (!templateName.trim() || weekDays.length === 0 || startsAt >= endsAt) {
        setError(copy.scheduleError);
        return;
      }

      setSaving(true);
      setError(null);
      try {
        await createManagerShiftTemplate({
          endsAtLocal: formatTime(endsAt),
          gracePeriodMinutes: 5,
          name: templateName.trim(),
          startsAtLocal: formatTime(startsAt),
          weekDays,
        });
        hapticSuccess();
      } catch (nextError) {
        hapticError();
        setError(nextError instanceof Error ? nextError.message : copy.scheduleError);
        setSaving(false);
        return;
      }
      setSaving(false);
    }

    const nextStep = await resolveWorkspaceSetupStep();
    updateAuthFlowState({ workspaceSetupStep: nextStep });
    if (nextStep) {
      router.replace(getWorkspaceSetupHref(nextStep) as never);
    } else {
      router.replace('/today' as never);
    }
  }

  function handleTimeChange(event: DateTimePickerEvent, value?: Date) {
    const field = timeField;
    if (Platform.OS === 'android') setTimeField(null);
    if (event.type === 'dismissed' || !value || !field) return;
    if (field === 'start') setStartsAt(value);
    else setEndsAt(value);
  }

  function toggleWeekDay(value: number) {
    hapticSelection();
    setWeekDays((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value].sort(),
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <StatusBar style="dark" />
        <ActivityIndicator color="#536cf5" size="large" />
        <Text className="mt-4 text-[15px] text-[#6f7892]">{copy.loading}</Text>
      </View>
    );
  }

  const actionLabel = step === 'schedule' ? copy.finish : copy.continue;
  const handlePrimaryAction = () => {
    if (step === 'workplace') void saveWorkplace();
    else if (step === 'team') void continueFromTeam();
    else void finishSetup(!attendanceTrackingEnabled);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#f7f8fb]" edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <View className="flex-row items-center justify-between px-5 pb-3 pt-2">
          <PressableScale
            accessibilityLabel={copy.back}
            className="h-11 w-11 items-center justify-center rounded-full bg-white"
            disabled={step === 'workplace'}
            haptic="selection"
            onPress={goBack}
          >
            <Ionicons color={step === 'workplace' ? '#c8cdd8' : '#26334a'} name="chevron-back" size={23} />
          </PressableScale>
          <View className="items-center">
            <Text className="text-[13px] font-semibold uppercase text-[#7b8498]">{copy.setup}</Text>
            <Text className="mt-1 text-[14px] font-semibold text-[#26334a]">{currentStepIndex + 1} / {STEP_ORDER.length}</Text>
          </View>
          <View className="h-11 w-11" />
        </View>

        <View className="flex-row gap-2 px-6 pb-4">
          {STEP_ORDER.map((item, index) => (
            <View className={`h-1.5 flex-1 rounded-full ${index <= currentStepIndex ? 'bg-[#536cf5]' : 'bg-[#dfe3ec]'}`} key={item} />
          ))}
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 132 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {step === 'workplace' ? (
            <View className="gap-5 px-5 pb-6">
              <View className="gap-2 px-1">
                <Text className="text-[34px] leading-[39px] text-[#26334a]">{copy.workplaceTitle}</Text>
                <Text className="text-[16px] leading-[23px] text-[#6f7892]">{copy.workplaceBody}</Text>
              </View>

              <View className="gap-4 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                <View className="flex-row items-center gap-4">
                  <PressableScale className="h-[74px] w-[74px] items-center justify-center overflow-hidden rounded-[18px] bg-[#eef1f7]" haptic="selection" onPress={() => void pickLogo()}>
                    {companyLogoPreview ? <Image className="h-full w-full" resizeMode="cover" source={{ uri: companyLogoPreview }} /> : <Ionicons color="#8290a7" name="image-outline" size={28} />}
                  </PressableScale>
                  <View className="flex-1 gap-2">
                    <Text className="text-[13px] font-semibold uppercase text-[#7b8498]">{copy.logo}</Text>
                    <PressableScale className="min-h-[38px] items-center justify-center rounded-[14px] border border-[#d9deea] bg-white px-3" haptic="selection" onPress={() => void pickLogo()}>
                      <Text className="text-[14px] font-semibold text-[#536cf5]">{copy.chooseLogo}</Text>
                    </PressableScale>
                  </View>
                </View>
                <TextInput
                  autoCapitalize="words"
                  className="min-h-[56px] rounded-[17px] border border-[#d9deea] bg-white px-4 text-[16px] text-[#26334a]"
                  onChangeText={(value) => { setCompanyName(value); setError(null); }}
                  placeholder={copy.organizationName}
                  placeholderTextColor="#8a95a9"
                  value={companyName}
                />
              </View>

              <View className="gap-3 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                <Text className="text-[13px] font-semibold uppercase text-[#7b8498]">{copy.address}</Text>
                <View className="flex-row gap-2">
                  <TextInput
                    className="min-h-[54px] flex-1 rounded-[17px] border border-[#d9deea] bg-white px-4 text-[15px] text-[#26334a]"
                    onChangeText={(value) => { setAddress(value); setError(null); }}
                    placeholder={copy.address}
                    placeholderTextColor="#8a95a9"
                    returnKeyType="search"
                    onSubmitEditing={() => void findAddress()}
                    value={address}
                  />
                  <PressableScale className="h-[54px] min-w-[72px] items-center justify-center rounded-[17px] bg-[#26334a] px-3" disabled={locationBusy} haptic="selection" onPress={() => void findAddress()}>
                    {locationBusy ? <ActivityIndicator color="white" size="small" /> : <Text className="text-[14px] font-semibold text-white">{copy.searchAddress}</Text>}
                  </PressableScale>
                </View>
                <PressableScale className="min-h-[46px] flex-row items-center justify-center gap-2 rounded-[16px] bg-[#edf1ff]" disabled={locationBusy} haptic="selection" onPress={() => void useCurrentLocation()}>
                  <Ionicons color="#536cf5" name="locate-outline" size={19} />
                  <Text className="text-[14px] font-semibold text-[#536cf5]">{copy.currentLocation}</Text>
                </PressableScale>
                <View className="h-[230px] overflow-hidden rounded-[20px]">
                  <MapView
                    initialRegion={{ ...mapCoordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
                    key={`${mapCoordinate.latitude.toFixed(4)}-${mapCoordinate.longitude.toFixed(4)}`}
                    onPress={handleMapPress}
                    style={{ flex: 1 }}
                  >
                    {latitude !== null && longitude !== null ? (
                      <>
                        <Circle center={{ latitude, longitude }} fillColor="rgba(83,108,245,0.14)" radius={geofenceRadiusMeters} strokeColor="#536cf5" strokeWidth={2} />
                        <Marker coordinate={{ latitude, longitude }} draggable onDragEnd={(event) => void commitCoordinate(event.nativeEvent.coordinate.latitude, event.nativeEvent.coordinate.longitude, address)} />
                      </>
                    ) : null}
                  </MapView>
                </View>
              </View>

              <View className="gap-4 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-[13px] font-semibold uppercase text-[#7b8498]">{copy.radius}</Text>
                    <Text className="mt-1 text-[23px] font-semibold text-[#26334a]">{geofenceRadiusMeters} m</Text>
                  </View>
                  <View className="flex-row gap-2">
                    <PressableScale className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#d9deea]" haptic="selection" onPress={() => setGeofenceRadiusMeters((value) => Math.max(MIN_RADIUS_METERS, value - RADIUS_STEP_METERS))}>
                      <Ionicons color="#26334a" name="remove" size={21} />
                    </PressableScale>
                    <PressableScale className="h-11 w-11 items-center justify-center rounded-[14px] border border-[#d9deea]" haptic="selection" onPress={() => setGeofenceRadiusMeters((value) => Math.min(MAX_RADIUS_METERS, value + RADIUS_STEP_METERS))}>
                      <Ionicons color="#26334a" name="add" size={21} />
                    </PressableScale>
                  </View>
                </View>
                <View className="h-px bg-[#edf0f5]" />
                <View>
                  <Text className="text-[13px] font-semibold uppercase text-[#7b8498]">{copy.timeZone}</Text>
                  <Text className="mt-2 text-[16px] font-semibold text-[#26334a]">{timeZone}</Text>
                </View>
              </View>

              <View className="gap-3 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1">
                    <Text className="text-[17px] font-semibold text-[#26334a]">{attendanceTrackingEnabled ? copy.attendance : copy.tasksOnly}</Text>
                    <Text className="mt-1 text-[14px] leading-[20px] text-[#6f7892]">{attendanceTrackingEnabled ? copy.attendanceBody : copy.tasksOnlyBody}</Text>
                  </View>
                  <Switch onValueChange={setAttendanceTrackingEnabled} trackColor={{ false: '#36b777', true: '#536cf5' }} value={attendanceTrackingEnabled} />
                </View>
              </View>
            </View>
          ) : step === 'team' ? (
            <View className="gap-5 px-5 pb-6">
              <View className="gap-2 px-1">
                <Text className="text-[34px] leading-[39px] text-[#26334a]">{copy.teamTitle}</Text>
                <Text className="text-[16px] leading-[23px] text-[#6f7892]">{copy.teamBody}</Text>
              </View>
              <View className="gap-4 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                <View className="h-16 w-16 items-center justify-center rounded-[18px] bg-[#edf1ff]">
                  <Ionicons color="#536cf5" name="people-outline" size={28} />
                </View>
                <TextInput autoCapitalize="words" className="min-h-[58px] rounded-[18px] border border-[#d9deea] px-4 text-[16px] text-[#26334a]" onChangeText={(value) => { setTeamName(value); setError(null); }} placeholder={copy.teamName} placeholderTextColor="#8a95a9" value={teamName} />
                <TextInput className="min-h-[96px] rounded-[18px] border border-[#d9deea] px-4 py-3 text-[16px] text-[#26334a]" multiline onChangeText={setTeamDescription} placeholder={copy.teamDescription} placeholderTextColor="#8a95a9" textAlignVertical="top" value={teamDescription} />
              </View>
              <PressableScale className="min-h-[46px] items-center justify-center" disabled={saving} haptic="selection" onPress={() => void continueFromTeam(true)}>
                <Text className="text-[15px] font-semibold text-[#536cf5]">{copy.skip}</Text>
              </PressableScale>
            </View>
          ) : (
            <View className="gap-5 px-5 pb-6">
              <View className="gap-2 px-1">
                <Text className="text-[34px] leading-[39px] text-[#26334a]">{copy.scheduleTitle}</Text>
                <Text className="text-[16px] leading-[23px] text-[#6f7892]">{copy.scheduleBody}</Text>
              </View>
              {attendanceTrackingEnabled ? (
                <View className="gap-5 rounded-[24px] border border-[#e2e5ec] bg-white p-4">
                  <TextInput autoCapitalize="words" className="min-h-[58px] rounded-[18px] border border-[#d9deea] px-4 text-[16px] text-[#26334a]" onChangeText={(value) => { setTemplateName(value); setError(null); }} placeholder={copy.templateName} placeholderTextColor="#8a95a9" value={templateName} />
                  <View>
                    <Text className="mb-3 text-[13px] font-semibold uppercase text-[#7b8498]">{copy.workDays}</Text>
                    <View className="flex-row justify-between gap-1.5">
                      {WEEK_DAYS.map((day) => {
                        const selected = weekDays.includes(day.value);
                        return (
                          <PressableScale className={`h-11 flex-1 items-center justify-center rounded-[14px] ${selected ? 'bg-[#536cf5]' : 'bg-[#eef1f6]'}`} haptic="selection" key={day.value} onPress={() => toggleWeekDay(day.value)}>
                            <Text className={`text-[13px] font-semibold ${selected ? 'text-white' : 'text-[#6f7892]'}`}>{isRussian ? day.ru : day.en}</Text>
                          </PressableScale>
                        );
                      })}
                    </View>
                  </View>
                  <View className="flex-row gap-3">
                    <PressableScale className="min-h-[68px] flex-1 justify-center rounded-[18px] border border-[#d9deea] px-4" haptic="selection" onPress={() => setTimeField('start')}>
                      <Text className="text-[12px] font-semibold uppercase text-[#7b8498]">{copy.startsAt}</Text>
                      <Text className="mt-1 text-[22px] font-semibold text-[#26334a]">{formatTime(startsAt)}</Text>
                    </PressableScale>
                    <PressableScale className="min-h-[68px] flex-1 justify-center rounded-[18px] border border-[#d9deea] px-4" haptic="selection" onPress={() => setTimeField('end')}>
                      <Text className="text-[12px] font-semibold uppercase text-[#7b8498]">{copy.endsAt}</Text>
                      <Text className="mt-1 text-[22px] font-semibold text-[#26334a]">{formatTime(endsAt)}</Text>
                    </PressableScale>
                  </View>
                </View>
              ) : (
                <View className="flex-row gap-3 rounded-[24px] border border-[#ccebdc] bg-[#effaf4] p-5">
                  <Ionicons color="#22945d" name="checkmark-circle" size={24} />
                  <Text className="flex-1 text-[15px] leading-[22px] text-[#316b4e]">{copy.tasksOnlySchedule}</Text>
                </View>
              )}
              {attendanceTrackingEnabled ? (
                <PressableScale className="min-h-[46px] items-center justify-center" disabled={saving} haptic="selection" onPress={() => void finishSetup(true)}>
                  <Text className="text-[15px] font-semibold text-[#536cf5]">{copy.skip}</Text>
                </PressableScale>
              ) : null}
            </View>
          )}

          {error ? <Text className="px-6 pb-5 text-center text-[14px] leading-[20px] text-[#b83c4a]">{error}</Text> : null}
        </ScrollView>

        <View className="absolute bottom-0 left-0 right-0 border-t border-[#e4e7ee] bg-white px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 14) }}>
          <PressableScale className={`min-h-[58px] items-center justify-center rounded-[20px] bg-[#536cf5] ${saving ? 'opacity-70' : ''}`} disabled={saving || locationBusy} haptic="medium" onPress={handlePrimaryAction}>
            <View className="flex-row items-center gap-3">
              {saving ? <ActivityIndicator color="white" size="small" /> : null}
              <Text className="text-[18px] font-semibold text-white">{saving ? copy.saving : actionLabel}</Text>
            </View>
          </PressableScale>
        </View>

        {timeField ? (
          <DateTimePicker
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour
            mode="time"
            onChange={handleTimeChange}
            value={timeField === 'start' ? startsAt : endsAt}
          />
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
