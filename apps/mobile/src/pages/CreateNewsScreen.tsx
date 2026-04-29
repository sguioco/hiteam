import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import {
  Alert,
  Image,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import MapView, {
  Marker,
  type MapPressEvent,
  type MarkerDragStartEndEvent,
  type Region,
} from 'react-native-maps';
import { Text } from '../../components/ui/text';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppGradientBackground } from '../../components/ui/screen';
import { PressableScale } from '../../components/ui/pressable-scale';
import BottomSheetModal from '../components/BottomSheetModal';
import { createManagerAnnouncement, loadEmployeesBootstrap } from '../../lib/api';
import { clearScreenCache } from '../../lib/screen-cache';
import { getNewsScreenCacheKey } from '../../lib/workspace-cache';
import { hapticError, hapticSelection, hapticSuccess } from '../../lib/haptics';
import {
  getDateLocale,
  getDirectionalIconStyle,
  getTextDirectionStyle,
  useI18n,
} from '../../lib/i18n';
import {
  mapApiGroups,
  type EmployeeOption,
  type GroupMemberOption,
  type GroupOption,
} from '../../lib/manager-group-options';
import {
  NewsImageCropperModal,
  type NewsImageDraft,
  type NewsImageSource,
} from '../components/news-image-cropper-modal';
import { ParticipantAvatarStrip } from '../components/participant-avatar-strip';
import { announcementAspectRatioToNumber } from '../lib/announcement-images';

type NewsOptionCheckboxProps = {
  checked: boolean;
  label: string;
  onPress: () => void;
};

type CreateNewsSubmitButtonProps = {
  disabled?: boolean;
  label: string;
  loadingLabel: string;
  onPress: () => void;
  submitting: boolean;
};

type NewsDocumentDraft = {
  dataUrl: string;
  fileName: string;
  mimeType: string | null;
  sizeBytes: number | null;
};

type NewsLocationDraft = {
  address: string;
  latitude: number;
  longitude: number;
};

type NewsLocationSuggestion = NewsLocationDraft & {
  id: string;
};

const CREATE_NEWS_SUBMIT_BUTTON_OFFSET = 20;
const CREATE_NEWS_SUBMIT_BUTTON_HEIGHT = 56;
const CREATE_NEWS_SUBMIT_BUTTON_BASE_BOTTOM = 0;
const CREATE_NEWS_SUBMIT_BUTTON_SIDE_PADDING = 20;
const ANNOUNCEMENT_ATTACHMENT_LIMIT = 5;
const NEWS_LOCATION_SUGGESTION_LIMIT = 5;
const NEWS_LOCATION_DELTA = {
  latitudeDelta: 0.012,
  longitudeDelta: 0.012,
};
const DEFAULT_NEWS_LOCATION_COORDINATE = {
  latitude: 55.0302,
  longitude: 82.9204,
};

function localizeText(language: string, ru: string, en: string) {
  return language === 'ru' ? ru : en;
}

function normalizeAnnouncementLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function formatAttachmentSize(sizeBytes: number | null, language: string) {
  if (!sizeBytes || sizeBytes <= 0) {
    return localizeText(language, 'Документ', 'Document');
  }

  if (sizeBytes < 1024 * 1024) {
    return localizeText(
      language,
      `${Math.max(1, Math.round(sizeBytes / 1024))} КБ`,
      `${Math.max(1, Math.round(sizeBytes / 1024))} KB`,
    );
  }

  const megaBytes = sizeBytes / (1024 * 1024);
  return localizeText(
    language,
    `${megaBytes.toFixed(1)} МБ`,
    `${megaBytes.toFixed(1)} MB`,
  );
}

function formatDateLabel(date: Date, language: string) {
  return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function buildNewsLocationRegion(latitude: number, longitude: number): Region {
  return {
    latitude,
    longitude,
    ...NEWS_LOCATION_DELTA,
  };
}

function formatCoordinateAddress(latitude: number, longitude: number) {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function buildLocationSuggestionId(latitude: number, longitude: number, index: number) {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}:${index}`;
}

function formatReverseGeocodeAddress(
  geo: Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>[number] | undefined,
  fallback: string,
) {
  if (!geo) {
    return fallback;
  }

  if (geo.formattedAddress?.trim()) {
    return geo.formattedAddress.trim();
  }

  const streetLine = [geo.street, geo.streetNumber].filter(Boolean).join(', ');
  const parts = [
    geo.name,
    streetLine,
    geo.district,
    geo.city,
    geo.region,
    geo.country,
  ]
    .filter(Boolean)
    .map((part) => String(part).trim())
    .filter(Boolean);

  return Array.from(new Set(parts)).slice(0, 4).join(', ') || fallback;
}

function NewsOptionCheckbox({ checked, label, onPress }: NewsOptionCheckboxProps) {
  return (
    <Pressable
      style={styles.optionPressable}
      onPress={() => {
        hapticSelection();
        onPress();
      }}
    >
      <View style={styles.optionRow}>
        <View
          style={[
            styles.optionBox,
            checked ? styles.optionBoxChecked : styles.optionBoxUnchecked,
          ]}
        >
          {checked ? <Ionicons color="#ffffff" name="checkmark" size={13} /> : null}
        </View>
        <Text style={styles.optionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function CreateNewsSubmitButton({
  disabled = false,
  label,
  loadingLabel,
  onPress,
  submitting,
}: CreateNewsSubmitButtonProps) {
  return (
    <PressableScale
      className="rounded-[24px] border border-transparent bg-[#6d73ff] px-4 py-4 shadow-lg shadow-[#6d73ff]/30"
      dimWhenDisabled={false}
      disabled={disabled}
      haptic="selection"
      onPress={onPress}
    >
      <Text className="text-center font-display text-[16px] font-semibold text-white">
        {submitting ? loadingLabel : label}
      </Text>
    </PressableScale>
  );
}

function getEmployeeInitials(firstName: string, lastName: string) {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function getEmployeeSubtitle(employee: GroupMemberOption | EmployeeOption) {
  return 'department' in employee
    ? employee.department?.name ?? employee.position?.name ?? employee.email
    : employee.departmentName ?? '';
}

export default function CreateNewsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const locale = getDateLocale(language);
  const directionalIconStyle = useMemo(() => getDirectionalIconStyle(language), [language]);
  const textDirectionStyle = useMemo(() => getTextDirectionStyle(language), [language]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageDraft, setImageDraft] = useState<NewsImageDraft | null>(null);
  const [cropSource, setCropSource] = useState<NewsImageSource | null>(null);
  const [cropVisible, setCropVisible] = useState(false);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(true);
  const [participantSheetOpen, setParticipantSheetOpen] = useState(false);
  const [formScrollEnabled, setFormScrollEnabled] = useState(true);
  const [expandedGroupIds, setExpandedGroupIds] = useState<string[]>([]);
  const [limitParticipants, setLimitParticipants] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [attachments, setAttachments] = useState<NewsDocumentDraft[]>([]);
  const [locationAttachment, setLocationAttachment] =
    useState<NewsLocationDraft | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationSearchLoading, setLocationSearchLoading] = useState(false);
  const [locationAddressQuery, setLocationAddressQuery] = useState('');
  const [locationSuggestions, setLocationSuggestions] = useState<
    NewsLocationSuggestion[]
  >([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] =
    useState(false);
  const [locationSuggestionsReady, setLocationSuggestionsReady] = useState(false);
  const [locationSuggestionsSuppressed, setLocationSuggestionsSuppressed] =
    useState(false);
  const [locationMapRegion, setLocationMapRegion] = useState<Region>(() =>
    buildNewsLocationRegion(
      DEFAULT_NEWS_LOCATION_COORDINATE.latitude,
      DEFAULT_NEWS_LOCATION_COORDINATE.longitude,
    ),
  );
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => {
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    return next;
  });

  const imageAspectRatio = useMemo(
    () => announcementAspectRatioToNumber(imageDraft?.aspectRatio),
    [imageDraft?.aspectRatio],
  );
  const locationCoordinate = useMemo(
    () => ({
      latitude: locationAttachment?.latitude ?? locationMapRegion.latitude,
      longitude: locationAttachment?.longitude ?? locationMapRegion.longitude,
    }),
    [locationAttachment, locationMapRegion.latitude, locationMapRegion.longitude],
  );
  const orderedEmployees = useMemo(
    () =>
      [...employees].sort((left, right) =>
        `${left.firstName} ${left.lastName}`.localeCompare(
          `${right.firstName} ${right.lastName}`,
          locale,
        ),
      ),
    [employees, locale],
  );
  const selectedGroups = useMemo(
    () => groups.filter((group) => selectedGroupIds.includes(group.id)),
    [groups, selectedGroupIds],
  );
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  );
  const selectedEmployees = useMemo(
    () => employees.filter((employee) => selectedEmployeeIds.includes(employee.id)),
    [employees, selectedEmployeeIds],
  );
  const selectedGroupMemberIdSet = useMemo(() => {
    const ids = new Set<string>();
    selectedGroups.forEach((group) => group.memberIds.forEach((memberId) => ids.add(memberId)));
    return ids;
  }, [selectedGroups]);
  const selectedParticipants = useMemo(() => {
    const selectedById = new Map<string, EmployeeOption | GroupMemberOption>();

    selectedGroups.forEach((group) => {
      group.members.forEach((member) => {
        selectedById.set(member.id, employeeById.get(member.id) ?? member);
      });
    });

    selectedEmployeeIds.forEach((employeeId) => {
      const employee = employeeById.get(employeeId);

      if (employee) {
        selectedById.set(employeeId, employee);
      }
    });

    return Array.from(selectedById.values()).sort((left, right) =>
      `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`,
        locale,
      ),
    );
  }, [employeeById, locale, selectedEmployeeIds, selectedGroups]);
  const individuallySelectedEmployees = useMemo(
    () => selectedParticipants.filter((employee) => !selectedGroupMemberIdSet.has(employee.id)),
    [selectedGroupMemberIdSet, selectedParticipants],
  );
  const shouldScrollParticipantSheet = groups.length + orderedEmployees.length > 5;
  const submitButtonBottom = insets.bottom + CREATE_NEWS_SUBMIT_BUTTON_BASE_BOTTOM;
  const submitButtonContentPadding =
    submitButtonBottom + CREATE_NEWS_SUBMIT_BUTTON_HEIGHT + Math.max(CREATE_NEWS_SUBMIT_BUTTON_OFFSET, 0) + 28;
  const locationSuggestionQuery = locationAddressQuery.trim();
  const shouldShowLocationSuggestions =
    !locationSuggestionsSuppressed &&
    locationSuggestionQuery.length >= 3 &&
    (locationSuggestionsLoading ||
      locationSuggestionsReady ||
      locationSuggestions.length > 0);

  useEffect(() => {
    let active = true;

    async function init() {
      try {
        const snapshot = await loadEmployeesBootstrap();

        if (!active) {
          return;
        }

        const mappedGroups = mapApiGroups(snapshot.groups);
        setEmployees(snapshot.employeeRecords);
        setGroups(mappedGroups);
        setExpandedGroupIds(mappedGroups.map((group) => group.id));
      } catch {
        if (!active) {
          return;
        }

        setEmployees([]);
        setGroups([]);
      } finally {
        if (active) {
          setParticipantsLoading(false);
        }
      }
    }

    void init();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (locationSuggestionsSuppressed || locationSuggestionQuery.length < 3) {
      setLocationSuggestions([]);
      setLocationSuggestionsLoading(false);
      setLocationSuggestionsReady(false);
      return;
    }

    let active = true;
    setLocationSuggestionsReady(false);
    setLocationSuggestionsLoading(false);
    setLocationSuggestions([]);

    const timer = setTimeout(() => {
      setLocationSuggestionsLoading(true);

      void (async () => {
        try {
          const canLookupAddress = await ensureLocationLookupPermission();

          if (!canLookupAddress) {
            if (active) {
              setLocationSuggestions([]);
            }
            return;
          }

          const results = await Location.geocodeAsync(locationSuggestionQuery);
          const suggestions = await Promise.all(
            results.slice(0, NEWS_LOCATION_SUGGESTION_LIMIT).map(
              async (result, index): Promise<NewsLocationSuggestion> => {
                let address = locationSuggestionQuery;

                try {
                  const [geo] = await Location.reverseGeocodeAsync({
                    latitude: result.latitude,
                    longitude: result.longitude,
                  });
                  address = formatReverseGeocodeAddress(geo, locationSuggestionQuery);
                } catch {
                  address = locationSuggestionQuery;
                }

                return {
                  id: buildLocationSuggestionId(
                    result.latitude,
                    result.longitude,
                    index,
                  ),
                  address,
                  latitude: result.latitude,
                  longitude: result.longitude,
                };
              },
            ),
          );
          const uniqueSuggestions = Array.from(
            suggestions
              .reduce((map, suggestion) => {
                const key = `${suggestion.address.toLowerCase()}|${suggestion.latitude.toFixed(5)}|${suggestion.longitude.toFixed(5)}`;
                if (!map.has(key)) {
                  map.set(key, suggestion);
                }
                return map;
              }, new Map<string, NewsLocationSuggestion>())
              .values(),
          );

          if (active) {
            setLocationSuggestions(uniqueSuggestions);
          }
        } catch {
          if (active) {
            setLocationSuggestions([]);
          }
        } finally {
          if (active) {
            setLocationSuggestionsLoading(false);
            setLocationSuggestionsReady(true);
          }
        }
      })();
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [language, locationSuggestionQuery, locationSuggestionsSuppressed]);

  function openCropper(source: NewsImageSource) {
    setCropSource(source);
    setCropVisible(true);
  }

  function toggleExpandedGroup(id: string) {
    setExpandedGroupIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId)
        ? current.filter((item) => item !== groupId)
        : [...current, groupId],
    );
    setSelectedEmployeeIds([]);
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((item) => item !== employeeId)
        : [...current, employeeId],
    );
    setSelectedGroupIds([]);
  }

  function renderEmployeeRow(
    employee: GroupMemberOption | EmployeeOption,
    options: {
      disabled?: boolean;
      isSelected: boolean;
      onPress: () => void;
      showDivider?: boolean;
    },
  ) {
    const { disabled = false, isSelected, onPress, showDivider = false } = options;
    const subtitle = getEmployeeSubtitle(employee);

    return (
      <PressableScale
        key={employee.id}
        className={`px-1 py-3 ${showDivider ? 'border-b border-[#e7ecf5]' : ''}`}
        disabled={disabled}
        haptic="selection"
        onPress={onPress}
      >
        <View className="flex-row items-center gap-3">
          <View className={`h-6 w-6 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-border bg-white'}`}>
            {isSelected ? <Ionicons color="#ffffff" name="checkmark" size={14} /> : null}
          </View>
          <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
            {'avatar' in employee && employee.avatar ? (
              <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
            ) : (
              <Text className="text-[12px] font-extrabold text-foreground">
                {getEmployeeInitials(employee.firstName, employee.lastName)}
              </Text>
            )}
          </View>
          <View className="flex-1">
            <Text className="text-[14px] font-semibold text-foreground">
              {employee.firstName} {employee.lastName}
            </Text>
            <Text className="mt-1 text-[12px] text-muted-foreground">{subtitle}</Text>
          </View>
        </View>
      </PressableScale>
    );
  }

  function renderGroupBlock(group: GroupOption) {
    const isExplicitlySelected = selectedGroupIds.includes(group.id);
    const isSelected = isExplicitlySelected;
    const isExpanded = expandedGroupIds.includes(group.id);

    return (
      <View key={group.id} className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
        <View className="flex-row items-center gap-3">
          <PressableScale
            className={`h-7 w-7 items-center justify-center rounded-full border ${isSelected ? 'border-primary bg-primary' : 'border-border bg-white'}`}
            haptic="selection"
            onPress={() => toggleGroup(group.id)}
          >
            {isSelected ? <Ionicons color="#ffffff" name="checkmark" size={16} /> : null}
          </PressableScale>

          <View className="flex-1">
            <Text className="text-[15px] font-bold text-foreground">{group.name}</Text>
            <Text className="mt-1 text-[13px] text-muted-foreground">
              {t('manager.groupMembersCount', { count: group.memberIds.length })}
            </Text>
          </View>

          <PressableScale
            className="h-8 w-8 items-center justify-center"
            haptic="selection"
            onPress={() => toggleExpandedGroup(group.id)}
          >
            <Ionicons color="#4b5563" name={isExpanded ? 'chevron-up' : 'chevron-down'} size={18} />
          </PressableScale>
        </View>

        {isExpanded ? (
          <View className="mt-4 border-t border-[#e7ecf5] pt-2">
            {group.members.map((employee, index) =>
              renderEmployeeRow(employee, {
                disabled: isExplicitlySelected,
                isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                onPress: () => toggleEmployee(employee.id),
                showDivider: index < group.members.length - 1,
              }),
            )}
          </View>
        ) : null}
      </View>
    );
  }

  async function handlePickImage(source: 'camera' | 'library') {
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        hapticError();
        Alert.alert(
          'Error',
          t('manager.createNewsPhotoPermissionDenied'),
        );
        return;
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({
              allowsEditing: false,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              allowsEditing: false,
              quality: 1,
              selectionLimit: 1,
            });

      if (result.canceled || !result.assets?.[0]?.uri) {
        return;
      }

      const asset = result.assets[0];
      openCropper({
        height: asset.height ?? 1,
        mimeType: asset.mimeType || 'image/jpeg',
        uri: asset.uri,
        width: asset.width ?? 1,
      });
    } catch (error) {
      hapticError();
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : t('manager.createNewsPhotoError'),
      );
    }
  }

  function openImageSourcePicker() {
    Alert.alert(
      t('manager.createNewsPhotoTitle'),
      t('manager.createNewsPhotoPrompt'),
      [
        {
          text: t('manager.createNewsPhotoCamera'),
          onPress: () => void handlePickImage('camera'),
        },
        {
          text: t('manager.createNewsPhotoLibrary'),
          onPress: () => void handlePickImage('library'),
        },
        {
          style: 'cancel',
          text: t('manager.createNewsPhotoCancel'),
        },
      ],
    );
  }

  async function handlePickDocuments() {
    const result = await DocumentPicker.getDocumentAsync({
      multiple: true,
      copyToCacheDirectory: true,
      type: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'text/plain',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/zip',
        'application/x-zip-compressed',
      ],
    });

    if (result.canceled) {
      return;
    }

    const remainingSlots = Math.max(
      0,
      ANNOUNCEMENT_ATTACHMENT_LIMIT - attachments.length,
    );
    if (remainingSlots === 0) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        localizeText(
          language,
          `Можно прикрепить максимум ${ANNOUNCEMENT_ATTACHMENT_LIMIT} документов.`,
          `You can attach up to ${ANNOUNCEMENT_ATTACHMENT_LIMIT} documents.`,
        ),
      );
      return;
    }

    const nextAssets = result.assets.slice(0, remainingSlots);

    try {
      const nextAttachments = await Promise.all(
        nextAssets.map(async (asset) => {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          const mimeType = asset.mimeType ?? 'application/octet-stream';
          return {
            dataUrl: `data:${mimeType};base64,${base64}`,
            fileName: asset.name,
            mimeType,
            sizeBytes: typeof asset.size === 'number' ? asset.size : null,
          } satisfies NewsDocumentDraft;
        }),
      );

      setAttachments((current) =>
        [...current, ...nextAttachments].slice(0, ANNOUNCEMENT_ATTACHMENT_LIMIT),
      );

      if (nextAssets.length !== result.assets.length) {
        Alert.alert(
          localizeText(language, 'Внимание', 'Notice'),
          localizeText(
            language,
            `Лишние файлы пропущены. Лимит: ${ANNOUNCEMENT_ATTACHMENT_LIMIT}.`,
            `Extra files were skipped. Limit: ${ANNOUNCEMENT_ATTACHMENT_LIMIT}.`,
          ),
        );
      }
    } catch (error) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        error instanceof Error
          ? error.message
          : localizeText(
              language,
              'Не удалось прочитать выбранные файлы.',
              'Unable to read the selected files.',
            ),
      );
    }
  }

  function resetLocationSuggestions(suppressed = true) {
    setLocationSuggestions([]);
    setLocationSuggestionsLoading(false);
    setLocationSuggestionsReady(false);
    setLocationSuggestionsSuppressed(suppressed);
  }

  function handleLocationAddressQueryChange(value: string) {
    setLocationAddressQuery(value);
    setLocationSuggestionsSuppressed(false);

    if (!value.trim()) {
      resetLocationSuggestions(false);
    }
  }

  function commitLocationAttachment(next: NewsLocationDraft) {
    resetLocationSuggestions(true);
    setLocationAttachment(next);
    setLocationAddressQuery(next.address);
    setLocationMapRegion(buildNewsLocationRegion(next.latitude, next.longitude));
  }

  function handleSelectLocationSuggestion(suggestion: NewsLocationSuggestion) {
    hapticSelection();
    Keyboard.dismiss();
    commitLocationAttachment({
      address: suggestion.address,
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
    });
  }

  async function ensureLocationLookupPermission() {
    if (Platform.OS !== 'android') {
      return true;
    }

    let permission = await Location.getForegroundPermissionsAsync();

    if (!permission.granted && permission.canAskAgain) {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    return permission.granted;
  }

  async function resolveLocationAddress(
    latitude: number,
    longitude: number,
    fallback: string,
  ) {
    try {
      const canLookupAddress = await ensureLocationLookupPermission();

      if (!canLookupAddress) {
        return fallback;
      }

      const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
      return formatReverseGeocodeAddress(geo, fallback);
    } catch {
      return fallback;
    }
  }

  async function commitLocationCoordinate(
    latitude: number,
    longitude: number,
    fallbackAddress?: string,
  ) {
    const fallback =
      fallbackAddress?.trim() ||
      localizeText(language, 'Выбранная точка', 'Selected location');
    const address = await resolveLocationAddress(latitude, longitude, fallback);

    commitLocationAttachment({
      address,
      latitude,
      longitude,
    });
  }

  async function handleSearchLocationAddress() {
    const query = locationAddressQuery.trim();

    if (!query) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        localizeText(language, 'Введите адрес для поиска.', 'Enter an address to search.'),
      );
      return;
    }

    Keyboard.dismiss();
    resetLocationSuggestions(true);
    setLocationSearchLoading(true);

    try {
      const canLookupAddress = await ensureLocationLookupPermission();

      if (!canLookupAddress) {
        throw new Error(
          localizeText(
            language,
            'Разреши доступ к геолокации, чтобы искать адреса на Android.',
            'Allow location access to search addresses on Android.',
          ),
        );
      }

      const results = await Location.geocodeAsync(query);
      const first = results[0];

      if (!first) {
        throw new Error(
          localizeText(
            language,
            'Адрес не найден. Попробуй уточнить город, улицу или номер дома.',
            'Address not found. Try adding the city, street, or building number.',
          ),
        );
      }

      await commitLocationCoordinate(first.latitude, first.longitude, query);
    } catch (error) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        error instanceof Error
          ? error.message
          : localizeText(language, 'Не удалось найти адрес.', 'Unable to find the address.'),
      );
    } finally {
      setLocationSearchLoading(false);
    }
  }

  async function handleMapPointSelect(latitude: number, longitude: number) {
    setLocationSearchLoading(true);

    try {
      await commitLocationCoordinate(
        latitude,
        longitude,
        formatCoordinateAddress(latitude, longitude),
      );
    } finally {
      setLocationSearchLoading(false);
      setFormScrollEnabled(true);
    }
  }

  function handleMapPress(event: MapPressEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void handleMapPointSelect(latitude, longitude);
  }

  function handleMarkerDragEnd(event: MarkerDragStartEndEvent) {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    void handleMapPointSelect(latitude, longitude);
  }

  async function handleAttachCurrentLocation() {
    setLocationLoading(true);

    try {
      let permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (!permission.granted) {
        throw new Error(
          localizeText(
            language,
            'Разреши доступ к геолокации, чтобы прикрепить точку.',
            'Allow location access to attach a map point.',
          ),
        );
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const latitude = position.coords.latitude;
      const longitude = position.coords.longitude;

      await commitLocationCoordinate(
        latitude,
        longitude,
        localizeText(language, 'Текущая геолокация', 'Current location'),
      );
    } catch (error) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        error instanceof Error
          ? error.message
          : localizeText(
              language,
              'Не удалось определить геолокацию.',
              'Unable to determine the location.',
            ),
      );
    } finally {
      setLocationLoading(false);
    }
  }

  function handleScheduleDateChange(
    event: DateTimePickerEvent,
    pickedDate?: Date,
  ) {
    if (event.type === 'dismissed' || !pickedDate) {
      return;
    }

    setScheduledAt((current) => {
      const next = new Date(current);
      next.setFullYear(
        pickedDate.getFullYear(),
        pickedDate.getMonth(),
        pickedDate.getDate(),
      );
      return next;
    });
  }

  function handleScheduleTimeChange(
    event: DateTimePickerEvent,
    pickedTime?: Date,
  ) {
    if (event.type === 'dismissed' || !pickedTime) {
      return;
    }

    setScheduledAt((current) => {
      const next = new Date(current);
      next.setHours(pickedTime.getHours(), pickedTime.getMinutes(), 0, 0);
      return next;
    });
  }

  function openScheduleDatePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        minimumDate: new Date(),
        mode: 'date',
        onChange: handleScheduleDateChange,
        value: scheduledAt,
      });
    }
  }

  function openScheduleTimePicker() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        is24Hour: true,
        mode: 'time',
        onChange: handleScheduleTimeChange,
        value: scheduledAt,
      });
    }
  }

  async function handleSubmit() {
    if (!title.trim()) {
      Alert.alert('Error', t('manager.createNewsTitleRequired'));
      return;
    }

    if (!body.trim()) {
      Alert.alert('Error', t('manager.createNewsBodyRequired'));
      return;
    }

    if (
      limitParticipants &&
      selectedGroupIds.length === 0 &&
      selectedEmployeeIds.length === 0
    ) {
      Alert.alert(
        t('common.error'),
        t('manager.createNewsSelectParticipantsError'),
      );
      return;
    }

    if (scheduleEnabled && scheduledAt.getTime() <= Date.now()) {
      Alert.alert(
        localizeText(language, 'Ошибка', 'Error'),
        localizeText(
          language,
          'Запланированное время должно быть в будущем.',
          'Scheduled time must be in the future.',
        ),
      );
      return;
    }

    setSubmitting(true);

    try {
      await createManagerAnnouncement({
        audience: !limitParticipants
          ? 'ALL'
          : selectedGroups.length > 0
            ? 'GROUP'
            : 'EMPLOYEE',
        title: title.trim(),
        body: body.trim(),
        ...(limitParticipants && selectedGroups.length > 0
          ? { groupIds: selectedGroups.flatMap((group) => group.apiGroupIds) }
          : {}),
        ...(limitParticipants && selectedEmployeeIds.length > 0
          ? { targetEmployeeIds: selectedEmployeeIds }
          : {}),
        ...(imageDraft
          ? {
              imageAspectRatio: imageDraft.aspectRatio,
              imageDataUrl: imageDraft.dataUrl,
            }
          : {}),
        ...(normalizeAnnouncementLink(linkUrl)
          ? {
              linkUrl: normalizeAnnouncementLink(linkUrl) ?? undefined,
            }
          : {}),
        ...(attachments.length
          ? {
              attachments: attachments.map((attachment) => ({
                dataUrl: attachment.dataUrl,
                fileName: attachment.fileName,
              })),
            }
          : {}),
        ...(locationAttachment
          ? {
              attachmentLocation: {
                address: locationAttachment.address,
                latitude: locationAttachment.latitude,
                longitude: locationAttachment.longitude,
              },
            }
          : {}),
        ...(scheduleEnabled
          ? {
              scheduledFor: scheduledAt.toISOString(),
            }
          : {}),
      });

      hapticSuccess();
      await Promise.all([
        clearScreenCache(getNewsScreenCacheKey(true)),
        clearScreenCache(getNewsScreenCacheKey(false)),
      ]);
      router.replace('/?tab=news' as never);
    } catch (error) {
      Alert.alert(
        t('common.error'),
        error instanceof Error ? error.message : t('manager.createNewsError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-[#41e4f6]">
      <AppGradientBackground />
      <StatusBar backgroundColor="transparent" style="dark" translucent />
      <View className="flex-1">
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerClassName="gap-4 px-5 pt-0"
          contentContainerStyle={{ paddingBottom: submitButtonContentPadding }}
          scrollEnabled={formScrollEnabled}
        >
          <View className="flex-row items-center gap-3">
            <PressableScale
              className="h-8 w-8 items-center justify-center"
              haptic="selection"
              onPress={() => router.back()}
            >
              <Ionicons color="#1f2937" name="arrow-back" size={22} style={directionalIconStyle} />
            </PressableScale>
            <Text className="flex-1 text-[24px] font-extrabold text-foreground">
              {t('manager.createNewsTitle')}
            </Text>
          </View>

          <Text className="text-[14px] leading-6 text-muted-foreground">
            {t('manager.createNewsHint')}
          </Text>

          <TextInput
            autoCorrect={false}
            className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            onChangeText={setTitle}
            placeholder={t('manager.createNewsTitlePlaceholder')}
            style={[textDirectionStyle, { paddingHorizontal: 18, paddingVertical: 16 }]}
            value={title}
          />

          <TextInput
            autoCorrect={false}
            className="min-h-[180px] w-full rounded-2xl border-2 border-border bg-white px-4 py-4 text-[16px] text-foreground"
            keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
            multiline
            numberOfLines={8}
            onChangeText={setBody}
            placeholder={t('manager.createNewsBodyPlaceholder')}
            style={textDirectionStyle}
            textAlignVertical="top"
            value={body}
          />

          {imageDraft ? (
            <View className="gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
              <View className="overflow-hidden rounded-[26px] border border-black/10 bg-[#edf4ff]">
                <Image
                  resizeMode="cover"
                  source={{ uri: imageDraft.previewUri }}
                  style={{
                    aspectRatio: imageAspectRatio,
                    width: '100%',
                  }}
                />
              </View>

              <View className="flex-row flex-wrap items-center gap-3">
                <PressableScale
                  className="rounded-full border border-[#f4b8b8] px-3 py-2"
                  haptic="selection"
                  onPress={() => setImageDraft(null)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons color="#dc2626" name="trash-outline" size={16} />
                    <Text className="text-[13px] font-medium text-[#dc2626]">
                      {t('manager.createNewsPhotoRemove')}
                    </Text>
                  </View>
                </PressableScale>

                <PressableScale
                  className="rounded-full border border-black/10 px-3 py-2"
                  haptic="selection"
                  onPress={() => openCropper(imageDraft.source)}
                >
                  <View className="flex-row items-center gap-2">
                    <Ionicons color="#111827" name="create-outline" size={16} />
                    <Text className="text-[13px] font-medium text-foreground">
                      {t('manager.createNewsEditImage')}
                    </Text>
                  </View>
                </PressableScale>
              </View>
            </View>
          ) : (
            <PressableScale
              className="rounded-[22px] border border-dashed border-black/12 bg-[#f8fbff] px-4 py-5"
              haptic="selection"
              onPress={openImageSourcePicker}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef3ff]">
                  <Ionicons color="#334155" name="image-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">
                    {t('manager.createNewsPhotoAdd')}
                  </Text>
                </View>
              </View>
            </PressableScale>
          )}

          <View className="gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center gap-2">
              <Ionicons color="#334155" name="link-outline" size={18} />
              <Text className="text-[14px] font-semibold text-foreground">
                {localizeText(language, 'Ссылка', 'Link')}
              </Text>
            </View>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="w-full rounded-2xl border-2 border-border bg-white text-[16px] text-foreground"
              keyboardType={Platform.OS === 'android' ? 'visible-password' : 'url'}
              onChangeText={setLinkUrl}
              placeholder={localizeText(
                language,
                'https://example.com или домен без https',
                'https://example.com or a domain without https',
              )}
              style={[textDirectionStyle, { paddingHorizontal: 18, paddingVertical: 16 }]}
              value={linkUrl}
            />
          </View>

          <View className="gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center gap-2">
              <Ionicons color="#334155" name="document-attach-outline" size={18} />
              <Text className="text-[14px] font-semibold text-foreground">
                {localizeText(language, 'Документы', 'Documents')}
              </Text>
            </View>
            <PressableScale
              className="rounded-[22px] border border-dashed border-black/12 bg-[#f8fbff] px-4 py-4"
              haptic="selection"
              onPress={() => void handlePickDocuments()}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-11 w-11 items-center justify-center rounded-full bg-[#eef3ff]">
                  <Ionicons color="#334155" name="attach-outline" size={20} />
                </View>
                <View className="flex-1">
                  <Text className="text-[14px] font-semibold text-foreground">
                    {localizeText(language, 'Добавить файлы', 'Add files')}
                  </Text>
                  <Text className="mt-1 text-[13px] text-muted-foreground">
                    {localizeText(
                      language,
                      'PDF, Excel, Word, CSV, TXT и архивы.',
                      'PDF, Excel, Word, CSV, TXT, and archives.',
                    )}
                  </Text>
                </View>
              </View>
            </PressableScale>

            {attachments.length ? (
              <View className="gap-2">
                {attachments.map((attachment, index) => (
                  <View
                    className="flex-row items-center justify-between gap-3 rounded-[18px] border border-[#e7ecf5] bg-[#f8fbff] px-3 py-3"
                    key={`${attachment.fileName}-${index}`}
                  >
                    <View className="flex-1">
                      <Text className="text-[14px] font-semibold text-foreground">
                        {attachment.fileName}
                      </Text>
                      <Text className="mt-1 text-[12px] text-muted-foreground">
                        {formatAttachmentSize(attachment.sizeBytes, language)}
                      </Text>
                    </View>
                    <PressableScale
                      className="rounded-full border border-[#f4b8b8] px-3 py-2"
                      haptic="selection"
                      onPress={() =>
                        setAttachments((current) =>
                          current.filter((_, attachmentIndex) => attachmentIndex !== index),
                        )
                      }
                    >
                      <Text className="text-[12px] font-semibold text-[#dc2626]">
                        {localizeText(language, 'Убрать', 'Remove')}
                      </Text>
                    </PressableScale>
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          <View className="gap-3 rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center justify-between gap-3">
              <View className="flex-row items-center gap-2">
                <Ionicons color="#334155" name="location-outline" size={18} />
                <Text className="text-[14px] font-semibold text-foreground">
                  {localizeText(language, 'Геолокация', 'Geolocation')}
                </Text>
              </View>
              {locationAttachment ? (
                <PressableScale
                  className="rounded-full border border-[#f4b8b8] px-3 py-2"
                  haptic="selection"
                  onPress={() => {
                    setLocationAttachment(null);
                    setLocationAddressQuery('');
                    resetLocationSuggestions(false);
                  }}
                >
                  <Text className="text-[12px] font-semibold text-[#dc2626]">
                    {localizeText(language, 'Очистить', 'Clear')}
                  </Text>
                </PressableScale>
              ) : null}
            </View>

            <Text className="text-[13px] leading-5 text-muted-foreground">
              {localizeText(
                language,
                'Напиши адрес или поставь точку на карте. Адрес подтянется автоматически.',
                'Type an address or place a point on the map. The address will update automatically.',
              )}
            </Text>

            <View className="flex-row items-center gap-2 rounded-[22px] border border-[#d8e2f0] bg-[#f8fbff] px-3 py-2">
              <Ionicons color="#64748b" name="search-outline" size={18} />
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                className="min-h-10 flex-1 text-[15px] text-foreground"
                keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
                onChangeText={handleLocationAddressQueryChange}
                onSubmitEditing={() => void handleSearchLocationAddress()}
                placeholder={localizeText(
                  language,
                  'Например, Красный проспект 25',
                  'For example, 1600 Amphitheatre Parkway',
                )}
                returnKeyType="search"
                style={textDirectionStyle}
                value={locationAddressQuery}
              />
              <PressableScale
                className="h-10 min-w-[64px] items-center justify-center rounded-full bg-[#6d73ff] px-3"
                disabled={locationSearchLoading}
                haptic="selection"
                onPress={() => void handleSearchLocationAddress()}
              >
                <Text className="text-[12px] font-bold text-white">
                  {locationSearchLoading
                    ? localizeText(language, '...', '...')
                    : localizeText(language, 'Найти', 'Find')}
                </Text>
              </PressableScale>
            </View>

            {shouldShowLocationSuggestions ? (
              <View className="overflow-hidden rounded-[20px] border border-[#e7ecf5] bg-white">
                {locationSuggestionsLoading ? (
                  <View className="min-h-12 flex-row items-center gap-3 px-4 py-3">
                    <Ionicons color="#64748b" name="search-outline" size={17} />
                    <Text className="text-[13px] font-medium text-muted-foreground">
                      {localizeText(language, 'Ищем адреса...', 'Searching addresses...')}
                    </Text>
                  </View>
                ) : locationSuggestions.length > 0 ? (
                  locationSuggestions.map((suggestion, index) => (
                    <PressableScale
                      key={suggestion.id}
                      className={`min-h-12 flex-row items-center gap-3 px-4 py-3 ${
                        index > 0 ? 'border-t border-[#edf2f7]' : ''
                      }`}
                      haptic="selection"
                      onPress={() => handleSelectLocationSuggestion(suggestion)}
                    >
                      <View className="h-8 w-8 items-center justify-center rounded-full bg-[#eef2ff]">
                        <Ionicons color="#6d73ff" name="location-outline" size={16} />
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-[13px] font-semibold text-foreground"
                          numberOfLines={2}
                          style={textDirectionStyle}
                        >
                          {suggestion.address}
                        </Text>
                        <Text className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatCoordinateAddress(
                            suggestion.latitude,
                            suggestion.longitude,
                          )}
                        </Text>
                      </View>
                    </PressableScale>
                  ))
                ) : (
                  <View className="min-h-12 justify-center px-4 py-3">
                    <Text className="text-center text-[13px] font-medium text-muted-foreground">
                      {localizeText(
                        language,
                        'Адреса не найдены. Попробуй уточнить запрос.',
                        'No address suggestions. Try a more specific query.',
                      )}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            <View className="flex-row gap-2">
              <PressableScale
                className="min-h-11 flex-1 items-center justify-center rounded-[18px] border border-[#d8e2f0] bg-white px-3"
                disabled={locationLoading}
                haptic="selection"
                onPress={() => void handleAttachCurrentLocation()}
              >
                <View className="flex-row items-center gap-2">
                  <Ionicons
                    color="#334155"
                    name={locationLoading ? 'radio-outline' : 'navigate-outline'}
                    size={17}
                  />
                  <Text className="text-[13px] font-semibold text-foreground">
                    {locationLoading
                      ? localizeText(language, 'Определяем...', 'Locating...')
                      : localizeText(language, 'Моя точка', 'My location')}
                  </Text>
                </View>
              </PressableScale>
              {locationAttachment ? (
                <View className="min-h-11 flex-1 justify-center rounded-[18px] bg-[#eefdf4] px-3">
                  <Text className="text-[12px] font-bold text-[#128452]" numberOfLines={1}>
                    {localizeText(language, 'Точка выбрана', 'Point selected')}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#299467]" numberOfLines={1}>
                    {formatCoordinateAddress(locationAttachment.latitude, locationAttachment.longitude)}
                  </Text>
                </View>
              ) : (
                <View className="min-h-11 flex-1 justify-center rounded-[18px] bg-[#f1f5f9] px-3">
                  <Text className="text-[12px] font-bold text-[#64748b]" numberOfLines={1}>
                    {localizeText(language, 'Точка не выбрана', 'No point selected')}
                  </Text>
                </View>
              )}
            </View>

            <View className="overflow-hidden rounded-[22px] border border-[#e7ecf5] bg-[#f8fbff]">
              {locationAttachment ? (
                <View className="px-4 py-3">
                  <Text className="text-[14px] font-semibold text-foreground">
                    {locationAttachment.address}
                  </Text>
                </View>
              ) : null}
              <MapView
                initialRegion={locationMapRegion}
                onPress={handleMapPress}
                onRegionChangeComplete={setLocationMapRegion}
                onTouchCancel={() => setFormScrollEnabled(true)}
                onTouchEnd={() => setFormScrollEnabled(true)}
                onTouchStart={() => setFormScrollEnabled(false)}
                pitchEnabled={false}
                region={locationMapRegion}
                rotateEnabled={false}
                style={{ height: 240, width: '100%' }}
              >
                <Marker
                  coordinate={locationCoordinate}
                  draggable
                  onDragEnd={handleMarkerDragEnd}
                />
              </MapView>
              <View className="border-t border-[#e7ecf5] px-4 py-3">
                <Text className="text-[12px] leading-5 text-muted-foreground">
                  {localizeText(
                    language,
                    'Нажми на карту или перетащи маркер, чтобы выбрать точку вручную.',
                    'Tap the map or drag the marker to choose the point manually.',
                  )}
                </Text>
              </View>
            </View>
          </View>

          <View className="gap-3 px-1 py-1">
            <NewsOptionCheckbox
              checked={scheduleEnabled}
              label={localizeText(
                language,
                'Запланировать публикацию',
                'Schedule publication',
              )}
              onPress={() => setScheduleEnabled((current) => !current)}
            />

            {scheduleEnabled ? (
              <View className="gap-2 rounded-[24px] border border-white/40 bg-white/70 px-3 py-3 shadow-sm shadow-[#1f2687]/10">
                <View className="rounded-[18px] bg-[#f8fbff] px-4 py-3">
                  <Text className="text-[11px] font-bold uppercase tracking-[1px] text-muted-foreground">
                    {localizeText(language, 'Публикация', 'Publish at')}
                  </Text>
                  <Text className="mt-1 text-[15px] font-semibold leading-5 text-foreground">
                    {`${formatDateLabel(scheduledAt, language)}, ${formatTimeLabel(scheduledAt)}`}
                  </Text>
                </View>

                <View className="gap-2">
                  {Platform.OS === 'ios' ? (
                    <>
                      <View className="min-h-[58px] flex-row items-center justify-between gap-3 rounded-[18px] border border-[#d8e2f0] bg-white px-4 py-3">
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                            {localizeText(language, 'Дата', 'Date')}
                          </Text>
                          <Text className="mt-0.5 text-[14px] font-semibold text-foreground" numberOfLines={1}>
                            {formatDateLabel(scheduledAt, language)}
                          </Text>
                        </View>
                        <DateTimePicker
                          accentColor="#6d73ff"
                          display="compact"
                          locale={language === 'ru' ? 'ru-RU' : 'en-US'}
                          minimumDate={new Date()}
                          mode="date"
                          onChange={handleScheduleDateChange}
                          value={scheduledAt}
                        />
                      </View>
                      <View className="min-h-[58px] flex-row items-center justify-between gap-3 rounded-[18px] border border-[#d8e2f0] bg-white px-4 py-3">
                        <View className="flex-1">
                          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                            {localizeText(language, 'Время', 'Time')}
                          </Text>
                          <Text className="mt-0.5 text-[14px] font-semibold text-foreground">
                            {formatTimeLabel(scheduledAt)}
                          </Text>
                        </View>
                        <DateTimePicker
                          accentColor="#6d73ff"
                          display="compact"
                          locale={language === 'ru' ? 'ru-RU' : 'en-US'}
                          mode="time"
                          onChange={handleScheduleTimeChange}
                          value={scheduledAt}
                        />
                      </View>
                    </>
                  ) : (
                    <>
                      <PressableScale
                        className="min-h-[58px] flex-row items-center justify-between rounded-[18px] border border-[#d8e2f0] bg-white px-4 py-3"
                        contentStyle={styles.fullWidth}
                        haptic="selection"
                        onPress={openScheduleDatePicker}
                        style={styles.fullWidth}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                            {localizeText(language, 'Дата', 'Date')}
                          </Text>
                          <Text className="mt-0.5 text-[14px] font-semibold text-foreground" numberOfLines={1}>
                            {formatDateLabel(scheduledAt, language)}
                          </Text>
                        </View>
                        <Ionicons color="#94a3b8" name="calendar-outline" size={18} />
                      </PressableScale>
                      <PressableScale
                        className="min-h-[58px] flex-row items-center justify-between rounded-[18px] border border-[#d8e2f0] bg-white px-4 py-3"
                        contentStyle={styles.fullWidth}
                        haptic="selection"
                        onPress={openScheduleTimePicker}
                        style={styles.fullWidth}
                      >
                        <View className="flex-1 pr-3">
                          <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground">
                            {localizeText(language, 'Время', 'Time')}
                          </Text>
                          <Text className="mt-0.5 text-[14px] font-semibold text-foreground">
                            {formatTimeLabel(scheduledAt)}
                          </Text>
                        </View>
                        <Ionicons color="#94a3b8" name="time-outline" size={18} />
                      </PressableScale>
                    </>
                  )}
                </View>
              </View>
            ) : null}
          </View>

          <NewsOptionCheckbox
            checked={limitParticipants}
            label={t('manager.createNewsSelectedAudienceOnly')}
            onPress={() => setLimitParticipants((current) => !current)}
          />

          {limitParticipants ? (
            <View className="rounded-[24px] border border-white/30 bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
              <View className="flex-row items-center justify-between">
                <Text className="text-[14px] font-bold text-foreground">
                  {t('manager.meetingParticipants')}
                </Text>
                <PressableScale
                  className="min-h-10 min-w-[92px] items-center justify-center rounded-full border border-[#d8e2f0] bg-white px-4"
                  haptic="selection"
                  onPress={() => setParticipantSheetOpen(true)}
                >
                  <Text className="text-[14px] font-semibold text-foreground">{`+ ${t('common.add')}`}</Text>
                </PressableScale>
              </View>

              {participantsLoading ? (
                <Text className="mt-4 text-[14px] text-muted-foreground">
                  {t('manager.meetingLoadingParticipants')}
                </Text>
              ) : selectedGroups.length > 0 || selectedParticipants.length > 0 ? (
                <View className="mt-4 gap-2">
                  <ParticipantAvatarStrip participants={selectedParticipants} />

                  {selectedGroups.map((group) => (
                    <View key={group.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">{group.name}</Text>
                        <Text className="text-[12px] text-muted-foreground">
                          {t('manager.groupMembersCount', { count: group.memberIds.length })}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {individuallySelectedEmployees.map((employee) => (
                    <View key={employee.id} className="flex-row items-center gap-3 rounded-[18px] bg-[#f8fafc] px-3 py-2">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-[#eef2ff]">
                        {employee.avatar ? (
                          <Image source={employee.avatar} className="h-10 w-10 rounded-full" resizeMode="cover" />
                        ) : (
                          <Text className="text-[12px] font-extrabold text-foreground">
                            {getEmployeeInitials(employee.firstName, employee.lastName)}
                          </Text>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-[14px] font-semibold text-foreground">
                          {employee.firstName} {employee.lastName}
                        </Text>
                        <Text className="text-[12px] text-muted-foreground">
                          {getEmployeeSubtitle(employee)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text className="mt-4 text-[14px] leading-6 text-muted-foreground">
                  {t('manager.createNewsChooseAudience')}
                </Text>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View
          pointerEvents="box-none"
          style={[
            styles.submitButtonOverlay,
            {
              bottom: submitButtonBottom,
              paddingHorizontal: CREATE_NEWS_SUBMIT_BUTTON_SIDE_PADDING,
              transform: [{ translateY: CREATE_NEWS_SUBMIT_BUTTON_OFFSET }],
            },
          ]}
        >
          <CreateNewsSubmitButton
            disabled={submitting}
            label={t('manager.createNewsSubmit')}
            loadingLabel={t('manager.createNewsCreating')}
            onPress={() => void handleSubmit()}
            submitting={submitting}
          />
        </View>
      </View>

      <NewsImageCropperModal
        onApply={(draft) => setImageDraft(draft)}
        onClose={() => setCropVisible(false)}
        source={cropSource}
        visible={cropVisible}
      />

      <BottomSheetModal
        onClose={() => setParticipantSheetOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pb-7 pt-5 shadow-2xl shadow-[#1f2687]/15"
        visible={participantSheetOpen}
      >
        <View className="mb-4 flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[24px] font-bold text-foreground">
              {t('manager.meetingParticipantPickerTitle')}
            </Text>
          </View>
          <PressableScale
            className="h-10 min-w-[72px] items-center justify-center rounded-full px-3"
            haptic="selection"
            onPress={() => setParticipantSheetOpen(false)}
          >
            <Text className="text-[15px] font-semibold text-foreground">{t('common.done')}</Text>
          </PressableScale>
        </View>

        {participantsLoading ? (
          <Text className="text-[14px] text-muted-foreground">
            {t('manager.meetingLoadingParticipants')}
          </Text>
        ) : (
          <View className={shouldScrollParticipantSheet ? 'max-h-[440px]' : ''}>
            {shouldScrollParticipantSheet ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View className="gap-4">
                  {groups.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                        {t('manager.meetingGroups')}
                      </Text>
                      {groups.map((group) => renderGroupBlock(group))}
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">
                      {t('manager.meetingNoGroups')}
                    </Text>
                  )}

                  {orderedEmployees.length ? (
                    <View className="gap-3">
                      <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                        {t('manager.meetingEmployees')}
                      </Text>
                      <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                        {orderedEmployees.map((employee, index) =>
                          renderEmployeeRow(employee, {
                            isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                            onPress: () => toggleEmployee(employee.id),
                            showDivider: index < orderedEmployees.length - 1,
                          }),
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text className="text-[14px] text-muted-foreground">
                      {t('manager.meetingNoEmployees')}
                    </Text>
                  )}
                </View>
              </ScrollView>
            ) : (
              <View className="gap-4">
                {groups.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                      {t('manager.meetingGroups')}
                    </Text>
                    {groups.map((group) => renderGroupBlock(group))}
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">
                    {t('manager.meetingNoGroups')}
                  </Text>
                )}

                {orderedEmployees.length ? (
                  <View className="gap-3">
                    <Text className="text-[12px] font-bold uppercase tracking-[1.2px] text-muted-foreground">
                      {t('manager.meetingEmployees')}
                    </Text>
                    <View className="rounded-[24px] border border-white/30 bg-white px-4 py-2 shadow-sm shadow-[#1f2687]/10">
                      {orderedEmployees.map((employee, index) =>
                        renderEmployeeRow(employee, {
                          isSelected: selectedEmployeeIds.includes(employee.id) || selectedGroupMemberIdSet.has(employee.id),
                          onPress: () => toggleEmployee(employee.id),
                          showDivider: index < orderedEmployees.length - 1,
                        }),
                      )}
                    </View>
                  </View>
                ) : (
                  <Text className="text-[14px] text-muted-foreground">
                    {t('manager.meetingNoEmployees')}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  optionBox: {
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  optionBoxChecked: {
    backgroundColor: '#6d73ff',
    borderColor: '#6d73ff',
  },
  optionBoxUnchecked: {
    backgroundColor: '#ffffff',
    borderColor: '#bcc8da',
  },
  optionLabel: {
    color: '#243042',
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  optionPressable: {
    justifyContent: 'center',
    minHeight: 40,
  },
  optionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  submitButtonOverlay: {
    left: 0,
    position: 'absolute',
    right: 0,
  },
});

