import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../../components/ui/text';
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { deleteMyAccount, loadMyProfile } from "../../lib/api";
import { resolveEmployeeAvatarSource } from "../../lib/employee-avatar";
import { getDirectionalIconStyle, getLanguageLabel, languageOptions, useI18n } from "../../lib/i18n";
import { clearScreenCache, peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from "../../lib/screen-cache";
import { signOutLocally } from "../../lib/auth-flow";
import { hapticSuccess } from "../../lib/haptics";
import { PressableScale } from "../../components/ui/pressable-scale";
import { PROFILE_SCREEN_CACHE_KEY, PROFILE_SCREEN_CACHE_TTL_MS } from "../../lib/workspace-cache";
import BottomSheetModal from "../components/BottomSheetModal";
import {
  BottomSheetActionDock,
  BOTTOM_SHEET_ACTION_BUTTON_CLASS,
  BOTTOM_SHEET_ACTION_ROW_CLASS,
  BOTTOM_SHEET_ACTION_TEXT_CLASS,
  getBottomSheetActionBottomOffset,
} from "../components/bottom-sheet-actions";

type ProfileScreenProps = {
  active?: boolean;
};

const ProfileScreen = ({ active = true }: ProfileScreenProps) => {
  const insets = useSafeAreaInsets();
  const bottomSheetActionBottomOffset = getBottomSheetActionBottomOffset(insets.bottom);
  const signOutConfirmSheetHeight = bottomSheetActionBottomOffset + 180;
  const router = useRouter();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInFlight, setDeleteInFlight] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteConfirmSheetHeight = bottomSheetActionBottomOffset + (deleteError ? 320 : 220);
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<Awaited<ReturnType<typeof loadMyProfile>>>(
        PROFILE_SCREEN_CACHE_KEY,
        PROFILE_SCREEN_CACHE_TTL_MS,
      ),
    [],
  );
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof loadMyProfile>
  > | null>(initialSnapshot?.value ?? null);
  const [loading, setLoading] = useState(!initialSnapshot);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  const normalizedProfile = profile;

  useEffect(() => {
    return subscribeScreenCache<Awaited<ReturnType<typeof loadMyProfile>>>(
      PROFILE_SCREEN_CACHE_KEY,
      (entry) => {
        if (!entry) {
          return;
        }

        setProfile(entry.value);
        setAvatarLoadFailed(false);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const cached = await readScreenCache<Awaited<ReturnType<typeof loadMyProfile>>>(
        PROFILE_SCREEN_CACHE_KEY,
        PROFILE_SCREEN_CACHE_TTL_MS,
      );
      const hasCachedProfile = Boolean(cached?.value);

      if (cached && !cancelled) {
        setProfile(cached.value);
        setAvatarLoadFailed(false);
        setLoading(false);
        if (!cached.isStale) {
          return;
        }
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const nextProfile = await loadMyProfile();

        if (!cancelled) {
          setProfile(nextProfile);
          setAvatarLoadFailed(false);
          void writeScreenCache(PROFILE_SCREEN_CACHE_KEY, nextProfile);
        }
      } catch (nextError) {
        if (!cancelled) {
          const nextMessage =
            nextError instanceof Error
              ? nextError.message
              : t("today.loadError");

          setError(
            hasCachedProfile &&
              /Unable to reach the API server/i.test(nextMessage)
              ? null
              : nextMessage,
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, [t]);

  async function refreshProfile() {
    setRefreshing(true);
    setError(null);

    try {
      const nextProfile = await loadMyProfile();
      setProfile(nextProfile);
      setAvatarLoadFailed(false);
      void writeScreenCache(PROFILE_SCREEN_CACHE_KEY, nextProfile);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : t("today.loadError"),
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }

  const fullName = useMemo(() => {
    if (!normalizedProfile) {
      return "...";
    }

    return [normalizedProfile.firstName, normalizedProfile.lastName]
      .filter(Boolean)
      .join(" ");
  }, [normalizedProfile]);

  const profileAvatar = useMemo(() => {
    if (!normalizedProfile) {
      return null;
    }

    return resolveEmployeeAvatarSource({
      avatarUrl: normalizedProfile.avatarUrl,
      email: normalizedProfile.user.email,
      employeeNumber: normalizedProfile.employeeNumber,
      firstName: normalizedProfile.firstName,
      lastName: normalizedProfile.lastName,
      gender: normalizedProfile.gender,
      id: normalizedProfile.id,
    });
  }, [normalizedProfile]);

  const profileAvatarFallback = useMemo(() => {
    if (!normalizedProfile) {
      return null;
    }

    return resolveEmployeeAvatarSource({
      email: normalizedProfile.user.email,
      employeeNumber: normalizedProfile.employeeNumber,
      firstName: normalizedProfile.firstName,
      lastName: normalizedProfile.lastName,
      gender: normalizedProfile.gender,
      id: normalizedProfile.id,
    });
  }, [normalizedProfile]);

  const profileItems = useMemo(
    () =>
      [
        {
          icon: "mail-outline" as const,
          label: t("profile.emailLabel"),
          value: profile?.user.email ?? "—",
        },
        {
          icon: "business-outline" as const,
          label: t("profile.tenantId"),
          value: profile?.company?.name ?? "—",
        },
        {
          icon: "briefcase-outline" as const,
          label: t("profile.positionLabel"),
          value: profile?.position?.name ?? "—",
        },
        {
          icon: "layers-outline" as const,
          label: t("profile.departmentLabel"),
          value: profile?.department?.name ?? "—",
        },
        {
          icon: "call-outline" as const,
          label: t("profile.phoneLabel"),
          value: profile?.phone?.trim() ?? "",
        },
      ].filter((item) => {
        if (item.label !== t("profile.phoneLabel")) {
          return true;
        }

        return item.value !== "" && item.value !== "—";
      }),
    [profile, t],
  );

  function handleSignOut() {
    setSignOutConfirmOpen(true);
  }

  async function handleDeleteAccount() {
    setDeleteInFlight(true);
    setDeleteError(null);

    try {
      await deleteMyAccount();
      await clearScreenCache(PROFILE_SCREEN_CACHE_KEY);
      hapticSuccess();
      setDeleteConfirmOpen(false);
      signOutLocally();
      router.replace("/");
    } catch (nextError) {
      setDeleteError(
        nextError instanceof Error
          ? nextError.message
          : t("profile.deleteAccountError"),
      );
    } finally {
      setDeleteInFlight(false);
    }
  }

  const sheetActionLabelStyle = {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 15,
    includeFontPadding: false,
    lineHeight: 20,
    textAlign: "center",
  } as const;

  return (
    <>
      <View className="flex-1 bg-transparent">
        {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{
            paddingBottom: 136,
            paddingHorizontal: 16,
            paddingTop: insets.top + 20,
          }}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                void refreshProfile();
              }}
              refreshing={refreshing}
              tintColor="#315cf6"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
            {loading && !profile ? (
              <View className="items-center justify-center rounded-3xl border border-white/35 bg-white/72 px-6 py-10 shadow-sm shadow-[#1f2687]/10">
                <ActivityIndicator color="#546cf2" size="large" />
                <Text className="mt-4 font-body text-[14px] text-muted-foreground">
                  {t("common.loading")}
                </Text>
              </View>
            ) : null}

            <Animated.View
              entering={FadeInDown.duration(180).withInitialValues({
                opacity: 0,
                transform: [{ translateY: 8 }],
              })}
              className="items-center"
            >
              {profileAvatar ? (
                <Image
                  className="mb-3 h-20 w-20 rounded-full"
                  onError={() => setAvatarLoadFailed(true)}
                  resizeMode="cover"
                  source={
                    avatarLoadFailed && profileAvatarFallback
                      ? profileAvatarFallback
                      : profileAvatar
                  }
                />
              ) : (
                <View className="mb-3 h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Ionicons color="#6d73ff" name="person-outline" size={40} />
                </View>
              )}
              <Text className="font-display text-xl font-bold text-foreground">
                {fullName}
              </Text>
              <Text className="font-body text-sm text-muted-foreground">
                {profile?.position?.name ??
                  (loading ? t("common.loading") : "—")}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(30)
                .duration(180)
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
              className="overflow-hidden rounded-3xl border border-white/35 bg-white/72 shadow-sm shadow-[#1f2687]/10"
            >
              {profileItems.map((item, index) => (
                <View
                  key={item.label}
                  className={`flex-row items-center gap-3 px-4 py-4 ${index < profileItems.length - 1 ? "border-b border-border" : ""}`}
                >
                  <Ionicons color="#6b7a90" name={item.icon} size={20} />
                  <View className="flex-1">
                    <Text className="font-body text-xs text-muted-foreground">
                      {item.label}
                    </Text>
                    <Text className="font-body text-[15px] text-foreground">
                      {item.value}
                    </Text>
                  </View>
                </View>
              ))}
            </Animated.View>

            {error ? (
              <Animated.View
                entering={FadeInDown.delay(35)
                  .duration(180)
                  .withInitialValues({
                    opacity: 0,
                    transform: [{ translateY: 8 }],
                  })}
              >
                <View className="rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4">
                  <Text className="font-body text-[14px] leading-6 text-danger">
                    {error}
                  </Text>
                </View>
              </Animated.View>
            ) : null}

            <Animated.View
              entering={FadeInDown.delay(45)
                .duration(180)
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
            >
              <PressableScale
                className="flex-row items-center gap-3 rounded-2xl border border-white/35 bg-white/72 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                haptic="selection"
                onPress={() => router.push("/auth/language")}
              >
                <View className="w-6 items-center">
                  <Text className="text-lg">
                    {languageOptions.find((option) => option.value === language)?.flag ?? "🇺🇸"}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="font-body text-xs text-muted-foreground">
                    {t("profile.language")}
                  </Text>
                  <Text className="font-body text-[15px] text-foreground">
                    {getLanguageLabel(language)}
                  </Text>
                </View>
                <Ionicons color="#6b7a90" name="chevron-forward" size={18} style={directionalIconStyle} />
              </PressableScale>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(75)
                .duration(180)
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
            >
              <PressableScale
                className="flex-row items-center gap-3 rounded-2xl border border-white/35 bg-white/72 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                haptic="selection"
                onPress={() => router.push("/notifications")}
              >
                <Ionicons
                  color="#6b7a90"
                  name="notifications-outline"
                  size={20}
                />
                <Text className="flex-1 font-body text-[15px] text-foreground">
                  {t("profile.notifications")}
                </Text>
                <Ionicons color="#6b7a90" name="chevron-forward" size={18} style={directionalIconStyle} />
              </PressableScale>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(105)
                .duration(180)
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
            >
              <PressableScale
                className="flex-row items-center gap-3 rounded-2xl border border-white/35 bg-white/72 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                haptic="warning"
                onPress={handleSignOut}
              >
                <Ionicons color="#f25555" name="log-out-outline" size={20} />
                <Text className="font-body text-[15px] font-medium text-destructive">
                  {t("profile.signOutButton")}
                </Text>
              </PressableScale>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(125)
                .duration(180)
                .withInitialValues({
                  opacity: 0,
                  transform: [{ translateY: 8 }],
                })}
            >
              <PressableScale
                className="flex-row items-center gap-3 rounded-2xl border border-danger/20 bg-danger/10 px-4 py-4 shadow-sm shadow-[#1f2687]/10"
                haptic="warning"
                onPress={() => {
                  setDeleteError(null);
                  setDeleteConfirmOpen(true);
                }}
              >
                <Ionicons color="#f25555" name="trash-outline" size={20} />
                <Text className="font-body text-[15px] font-medium text-destructive">
                  {t("profile.deleteAccountButton")}
                </Text>
              </PressableScale>
            </Animated.View>
          </View>
        </ScrollView>
      </View>

      <BottomSheetModal
        backdropOpacity={0.42}
        onClose={() => setSignOutConfirmOpen(false)}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-8 shadow-2xl shadow-[#1f2687]/15"
        sheetStyle={{ height: signOutConfirmSheetHeight }}
        solidBackground
        visible={signOutConfirmOpen}
      >
        <View className="flex-1">
          <View className="items-center">
            <Text
              style={{
                color: "#111827",
                fontFamily: "Manrope_700Bold",
                fontSize: 24,
                includeFontPadding: false,
                lineHeight: 30,
                textAlign: "center",
              }}
            >
              {t("profile.signOutTitle")}
            </Text>
          </View>

          <BottomSheetActionDock className={BOTTOM_SHEET_ACTION_ROW_CLASS}>
            <PressableScale
              className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} flex-1 bg-[#eef5ff]`}
              containerClassName="flex-1"
              haptic="selection"
              onPress={() => setSignOutConfirmOpen(false)}
            >
              <Text
                className={BOTTOM_SHEET_ACTION_TEXT_CLASS}
                style={[sheetActionLabelStyle, { color: "#234067" }]}
              >
                {t("profile.cancel")}
              </Text>
            </PressableScale>
            <PressableScale
              className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} flex-1 bg-[#f25555]`}
              containerClassName="flex-1"
              haptic="success"
              onPress={() => {
                hapticSuccess();
                setSignOutConfirmOpen(false);
                signOutLocally();
                router.replace("/");
              }}
            >
              <Text
                className={BOTTOM_SHEET_ACTION_TEXT_CLASS}
                style={[sheetActionLabelStyle, { color: "#ffffff" }]}
              >
                {t("profile.signOut")}
              </Text>
            </PressableScale>
          </BottomSheetActionDock>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        backdropOpacity={0.42}
        onClose={() => {
          if (!deleteInFlight) {
            setDeleteConfirmOpen(false);
            setDeleteError(null);
          }
        }}
        sheetClassName="rounded-t-[34px] border border-white bg-[#f7faff] px-5 pt-8 shadow-2xl shadow-[#1f2687]/15"
        sheetStyle={{ height: deleteConfirmSheetHeight }}
        solidBackground
        visible={deleteConfirmOpen}
      >
        <View className="flex-1">
          <View className="items-center gap-3">
            <Text
              style={{
                color: "#111827",
                fontFamily: "Manrope_700Bold",
                fontSize: 24,
                includeFontPadding: false,
                lineHeight: 30,
                textAlign: "center",
              }}
            >
              {t("profile.deleteAccountTitle")}
            </Text>
            <Text className="px-3 text-center font-body text-[14px] leading-6 text-muted-foreground">
              {t("profile.deleteAccountBody")}
            </Text>
            {deleteError ? (
              <View className="w-full rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3">
                <Text className="text-center font-body text-[13px] leading-5 text-danger">
                  {deleteError}
                </Text>
              </View>
            ) : null}
          </View>

          <BottomSheetActionDock className={BOTTOM_SHEET_ACTION_ROW_CLASS}>
            <PressableScale
              className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} flex-1 bg-[#eef5ff]`}
              containerClassName="flex-1"
              disabled={deleteInFlight}
              haptic="selection"
              onPress={() => {
                setDeleteConfirmOpen(false);
                setDeleteError(null);
              }}
            >
              <Text
                className={BOTTOM_SHEET_ACTION_TEXT_CLASS}
                style={[sheetActionLabelStyle, { color: "#234067" }]}
              >
                {t("profile.cancel")}
              </Text>
            </PressableScale>
            <PressableScale
              className={`${BOTTOM_SHEET_ACTION_BUTTON_CLASS} flex-1 bg-[#f25555]`}
              containerClassName="flex-1"
              disabled={deleteInFlight}
              haptic="warning"
              onPress={() => void handleDeleteAccount()}
            >
              {deleteInFlight ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text
                  className={BOTTOM_SHEET_ACTION_TEXT_CLASS}
                  style={[sheetActionLabelStyle, { color: "#ffffff" }]}
                >
                  {t("profile.deleteAccountConfirm")}
                </Text>
              )}
            </PressableScale>
          </BottomSheetActionDock>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default ProfileScreen;
