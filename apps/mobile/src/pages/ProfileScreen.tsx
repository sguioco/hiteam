import { Ionicons } from "@expo/vector-icons";
import { BottomSheet } from "heroui-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { Image, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadMyProfile } from "../../lib/api";
import { resolveEmployeeAvatarSource } from "../../lib/employee-avatar";
import { getLanguageLabel, useI18n } from "../../lib/i18n";
import { signOutLocally } from "../../lib/auth-flow";
import { hapticSuccess } from "../../lib/haptics";
import { PressableScale } from "../../components/ui/pressable-scale";

const ProfileScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { language, t } = useI18n();
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [profile, setProfile] = useState<Awaited<
    ReturnType<typeof loadMyProfile>
  > | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setLoading(true);
      setError(null);

      try {
        const nextProfile = await loadMyProfile();

        if (!cancelled) {
          setProfile(nextProfile);
          setAvatarLoadFailed(false);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : t("today.loadError"),
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

  const fullName = useMemo(() => {
    if (!profile) {
      return "...";
    }

    return [profile.firstName, profile.lastName].filter(Boolean).join(" ");
  }, [profile]);

  const profileAvatar = useMemo(() => {
    if (!profile) {
      return null;
    }

    return resolveEmployeeAvatarSource({
      avatarUrl: profile.avatarUrl,
      email: profile.user.email,
      employeeNumber: profile.employeeNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      id: profile.id,
    });
  }, [profile]);

  const profileAvatarFallback = useMemo(() => {
    if (!profile) {
      return null;
    }

    return resolveEmployeeAvatarSource({
      email: profile.user.email,
      employeeNumber: profile.employeeNumber,
      firstName: profile.firstName,
      lastName: profile.lastName,
      gender: profile.gender,
      id: profile.id,
    });
  }, [profile]);

  const profileItems = useMemo(
    () =>
      [
        {
          icon: "mail-outline" as const,
          label: "Email",
          value: profile?.user.email ?? "—",
        },
        {
          icon: "business-outline" as const,
          label: t("profile.tenantId"),
          value: profile?.company?.name ?? "—",
        },
        {
          icon: "briefcase-outline" as const,
          label: "Position",
          value: profile?.position?.name ?? "—",
        },
        {
          icon: "layers-outline" as const,
          label: "Department",
          value: profile?.department?.name ?? "—",
        },
        {
          icon: "call-outline" as const,
          label: "Phone",
          value: profile?.phone?.trim() ?? "",
        },
      ].filter((item) => {
        if (item.label !== "Phone") {
          return true;
        }

        return item.value !== "" && item.value !== "—";
      }),
    [profile, t],
  );

  function handleSignOut() {
    setSignOutConfirmOpen(true);
  }

  const sheetActionLabelStyle = {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 17,
    includeFontPadding: false,
    lineHeight: 22,
    textAlign: "center",
  } as const;

  return (
    <>
      <View className="flex-1 bg-transparent">
        <StatusBar backgroundColor="transparent" style="dark" translucent />
        <ScrollView
          className="flex-1 bg-transparent"
          contentContainerStyle={{
            paddingBottom: 136,
            paddingHorizontal: 16,
            paddingTop: insets.top + 20,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View className="gap-6">
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
                <Text className="text-lg">
                  {language === "ru" ? "🇷🇺" : "🇺🇸"}
                </Text>
                <View className="flex-1">
                  <Text className="font-body text-xs text-muted-foreground">
                    {t("profile.language")}
                  </Text>
                  <Text className="font-body text-[15px] text-foreground">
                    {getLanguageLabel(language)}
                  </Text>
                </View>
                <Ionicons color="#6b7a90" name="chevron-forward" size={18} />
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
                <Ionicons color="#6b7a90" name="chevron-forward" size={18} />
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
          </View>
        </ScrollView>
      </View>

      <BottomSheet
        isOpen={signOutConfirmOpen}
        onOpenChange={setSignOutConfirmOpen}
      >
        <BottomSheet.Portal disableFullWindowOverlay={__DEV__}>
          <BottomSheet.Overlay
            style={{ backgroundColor: "rgba(6, 14, 28, 0.42)" }}
          />
          <BottomSheet.Content
            backgroundClassName="rounded-t-[34px] bg-[#f7faff]"
            enableDynamicSizing={false}
            snapPoints={["22%"]}
            className="px-5 pb-7 pt-5"
            contentContainerClassName="pb-2"
          >
            <View className="mb-12 items-center">
              <BottomSheet.Title
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
              </BottomSheet.Title>
            </View>

            <View className="flex-row gap-3">
              <PressableScale
                className="min-h-[56px] flex-1 items-center justify-center rounded-[24px] bg-[#eef5ff] px-4 py-4"
                containerClassName="flex-1"
                haptic="selection"
                onPress={() => setSignOutConfirmOpen(false)}
              >
                <Text style={[sheetActionLabelStyle, { color: "#234067" }]}>
                  {t("profile.cancel")}
                </Text>
              </PressableScale>
              <PressableScale
                className="min-h-[56px] flex-1 items-center justify-center rounded-[24px] bg-[#f25555] px-4 py-4"
                containerClassName="flex-1"
                haptic="success"
                onPress={() => {
                  hapticSuccess();
                  setSignOutConfirmOpen(false);
                  signOutLocally();
                  router.replace("/");
                }}
              >
                <Text style={[sheetActionLabelStyle, { color: "#ffffff" }]}>
                  {t("profile.signOut")}
                </Text>
              </PressableScale>
            </View>
          </BottomSheet.Content>
        </BottomSheet.Portal>
      </BottomSheet>
    </>
  );
};

export default ProfileScreen;
