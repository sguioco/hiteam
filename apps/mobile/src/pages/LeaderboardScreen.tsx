import { Fragment, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { Image, Pressable, ScrollView, View } from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  FadeOutLeft,
  FadeOutRight,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LeaderboardOverviewResponse } from "@smart/types";
import { Screen } from "../../components/ui/screen";
import { Text } from "../../components/ui/text";
import { PressableScale } from "../../components/ui/pressable-scale";
import { loadLeaderboardOverview } from "../../lib/api";
import { resolveEmployeeAvatarSource } from "../../lib/employee-avatar";
import { getDirectionalIconStyle, useI18n } from "../../lib/i18n";
import { hapticSelection } from "../../lib/haptics";
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from "../../lib/screen-cache";
import { getLeaderboardScreenCacheKey, LEADERBOARD_SCREEN_CACHE_TTL_MS } from "../../lib/workspace-cache";

type LeaderboardScreenProps = {
  active?: boolean;
  standalone?: boolean;
};

type LeaderboardTab = "table" | "progress";

const RANK_AWARDS = {
  1: require("../../assets/1st.webp"),
  2: require("../../assets/2nd.webp"),
  3: require("../../assets/3rd.webp"),
} as const;
const STREAK_FLAG_IMAGE = require("../../flag.webp");

function formatMonthKey(date = new Date()) {
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

function parseMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, (month || 1) - 1, 1);
}

function shiftMonthKey(monthKey: string, offset: number) {
  const date = parseMonthKey(monthKey);
  return formatMonthKey(new Date(date.getFullYear(), date.getMonth() + offset, 1));
}

export default function LeaderboardScreen({
  active = true,
  standalone = false,
}: LeaderboardScreenProps) {
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const currentMonthKey = useMemo(() => formatMonthKey(), []);
  const [selectedMonthKey, setSelectedMonthKey] = useState(currentMonthKey);
  const leaderboardCacheKey = useMemo(
    () => getLeaderboardScreenCacheKey(selectedMonthKey),
    [selectedMonthKey],
  );
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<LeaderboardOverviewResponse>(
        leaderboardCacheKey,
        LEADERBOARD_SCREEN_CACHE_TTL_MS,
      ),
    [leaderboardCacheKey],
  );
  const [monthAnimationDirection, setMonthAnimationDirection] = useState<
    "next" | "prev"
  >("next");
  const [tab, setTab] = useState<LeaderboardTab>("progress");
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<LeaderboardOverviewResponse | null>(
    initialSnapshot?.value ?? null,
  );

  useEffect(() => {
    return subscribeScreenCache<LeaderboardOverviewResponse>(
      leaderboardCacheKey,
      (entry) => {
        if (!entry) {
          return;
        }

        setOverview(entry.value);
        setLoading(false);
      },
    );
  }, [leaderboardCacheKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      const cached = await readScreenCache<LeaderboardOverviewResponse>(
        leaderboardCacheKey,
        LEADERBOARD_SCREEN_CACHE_TTL_MS,
      );

      if (cached && !cancelled) {
        setOverview(cached.value);
        setLoading(false);
        if (!cached.isStale) {
          return;
        }
      }

      try {
        const nextOverview = await loadLeaderboardOverview(selectedMonthKey);
        if (!cancelled) {
          setOverview(nextOverview);
          setError(null);
          setLoading(false);
          await writeScreenCache(leaderboardCacheKey, nextOverview);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : t("leaderboard.loadError"),
          );
          setLoading(false);
        }
      }
    }

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [leaderboardCacheKey, selectedMonthKey, t]);

  function formatMetricPoints(earnedPoints: number, maxPoints: number) {
    return `+${earnedPoints} / +${maxPoints}`;
  }

  function copy(ru: string, en: string) {
    return language === "ru" ? ru : en;
  }

  function getMetricTitle(key: LeaderboardOverviewResponse["me"]["progress"][number]["key"]) {
    if (key === "on_time_arrival") {
      return t("leaderboard.metricArrival");
    }

    if (key === "on_time_departure") {
      return t("leaderboard.metricDeparture");
    }

    return t("leaderboard.metricTasks");
  }

  function getMetricHint(metric: LeaderboardOverviewResponse["me"]["progress"][number]) {
    if (metric.key === "on_time_arrival") {
      return metric.completed
        ? t("leaderboard.metricArrivalDone")
        : t("leaderboard.metricArrivalPending");
    }

    if (metric.key === "on_time_departure") {
      return metric.completed
        ? t("leaderboard.metricDepartureDone")
        : t("leaderboard.metricDeparturePending");
    }

    return t("leaderboard.metricTasksHint", {
      completed: metric.details.completedDueTaskCount,
      due: metric.details.dueTaskCount,
      overdue: metric.details.overdueCount,
    });
  }

  const selectedMonthDate = useMemo(
    () => parseMonthKey(selectedMonthKey),
    [selectedMonthKey],
  );
  const monthLabel = selectedMonthDate.toLocaleDateString(
    language === "ru" ? "ru-RU" : "en-US",
    {
      month: "long",
      year: "numeric",
    },
  );
  const canGoForward = selectedMonthKey < currentMonthKey;

  function changeMonth(offset: number) {
    if (offset > 0 && !canGoForward) {
      return;
    }

    hapticSelection();
    setMonthAnimationDirection(offset > 0 ? "next" : "prev");
    setSelectedMonthKey((current) => shiftMonthKey(current, offset));
  }

  function renderRankBadge(rank: number) {
    const award = RANK_AWARDS[rank as keyof typeof RANK_AWARDS];

    if (award) {
      return (
        <View className="h-12 w-12 items-center justify-center">
          <Image
            accessibilityIgnoresInvertColors
            resizeMode="contain"
            source={award}
            style={{ height: 46, width: 46 }}
          />
        </View>
      );
    }

    return (
      <View className="h-12 w-12 items-center justify-center">
        <Text className="font-display text-[18px] font-bold text-[#27364b]">
          {rank}
        </Text>
      </View>
    );
  }

  function renderProgressRing(earnedPoints: number, maxPoints: number) {
    const size = 86;
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(1, Math.max(0, earnedPoints / Math.max(maxPoints, 1)));
    const offset = circumference * (1 - progress);

    return (
      <View className="h-[92px] w-[92px] items-center justify-center">
        <Svg height={size} width={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke="#edf2ff"
            strokeWidth={stroke}
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke="#2559ff"
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            strokeWidth={stroke}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View className="absolute inset-0 items-center justify-center">
          <Text className="font-display text-[20px] font-bold text-[#1f2a44]">
            {earnedPoints}/{maxPoints}
          </Text>
          <Text className="-mt-0.5 text-[10px] font-semibold text-[#77839a]">
            {copy("готово", "done")}
          </Text>
        </View>
      </View>
    );
  }

  function renderProgressDots(earnedPoints: number, maxPoints: number) {
    const dotCount = Math.max(0, Math.round(maxPoints));
    const completedDots = Math.min(dotCount, Math.max(0, Math.round(earnedPoints)));

    return (
      <View className="mt-3 flex-row items-center gap-1">
        {Array.from({ length: dotCount }).map((_, index) => {
          const isDone = index < completedDots;

          return (
            <View
              className={`h-3.5 w-3.5 items-center justify-center rounded-full ${
                isDone ? "bg-[#2559ff]" : "border border-[#dbe4f3] bg-white"
              }`}
              key={index}
            >
              {isDone ? <Ionicons color="#ffffff" name="checkmark" size={9} /> : null}
            </View>
          );
        })}
      </View>
    );
  }

  function getMetricIconName(
    key: LeaderboardOverviewResponse["me"]["progress"][number]["key"],
  ) {
    if (key === "on_time_arrival") return "log-in-outline";
    if (key === "on_time_departure") return "log-out-outline";
    return "checkbox-outline";
  }

  const meEntry = overview?.leaderboard.find(
    (entry) => entry.employee.id === overview.me.employeeId,
  );
  const dailyMaxPoints = overview?.me.todayMaxPoints ?? overview?.summary.maxDailyPoints ?? 15;
  const todayPoints = overview?.me.todayPoints ?? 0;
  const todayTotalCaption = copy(
    "Ты на шаг ближе\nк финишу",
    "You are one step\ncloser to the end",
  );

  const content = (
    <View className="gap-3">
      <View className="px-1">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[30px] font-bold leading-9 text-[#1f2430]">
              {t("leaderboard.title")}
            </Text>
            <Text className="mt-0.5 text-[12px] leading-4 text-[#8b95a7]">
              {t("leaderboard.monthReset")}
            </Text>
          </View>
          {meEntry ? (
            <Image
              accessibilityIgnoresInvertColors
              className="h-11 w-11 rounded-full border-2 border-white"
              resizeMode="cover"
              source={resolveEmployeeAvatarSource({
                avatarUrl: meEntry.employee.avatarUrl,
                employeeNumber: meEntry.employee.employeeNumber,
                firstName: meEntry.employee.firstName,
                id: meEntry.employee.id,
                lastName: meEntry.employee.lastName,
              })}
            />
          ) : null}
        </View>

        <View className="mt-4 flex-row items-center justify-between rounded-full border border-[#e5ebf5] bg-white px-1.5 py-1.5 shadow-sm shadow-[#1f2687]/10">
          <PressableScale
            className="h-8 w-8 items-center justify-center rounded-full bg-white"
            haptic="selection"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons color="#9aa5b5" name="chevron-back" size={16} style={directionalIconStyle} />
          </PressableScale>
          <View className="min-w-[164px] flex-1 overflow-hidden px-2">
            <Animated.Text
              entering={
                monthAnimationDirection === "next"
                  ? FadeInRight.duration(190).withInitialValues({
                      opacity: 0,
                      transform: [{ translateX: 10 }],
                    })
                  : FadeInLeft.duration(190).withInitialValues({
                      opacity: 0,
                      transform: [{ translateX: -10 }],
                    })
              }
              exiting={
                monthAnimationDirection === "next"
                  ? FadeOutLeft.duration(170)
                  : FadeOutRight.duration(170)
              }
              key={selectedMonthKey}
              className="text-center text-[12px] font-semibold capitalize text-[#303847]"
            >
              {monthLabel}
            </Animated.Text>
          </View>
          <PressableScale
            className={`h-8 w-8 items-center justify-center rounded-full ${
              canGoForward ? "bg-white" : "bg-white opacity-40"
            }`}
            disabled={!canGoForward}
            haptic="selection"
            onPress={() => changeMonth(1)}
          >
            <Ionicons color="#9aa5b5" name="chevron-forward" size={16} style={directionalIconStyle} />
          </PressableScale>
        </View>

        <View className="mt-3 h-10 flex-row items-center rounded-full border border-[#e5ebf5] bg-white p-1 shadow-sm shadow-[#1f2687]/10">
          <Pressable
            className={`h-8 flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-3 ${
              tab === "table" ? "bg-[#2559ff]" : "bg-transparent"
            }`}
            onPress={() => {
              hapticSelection();
              setTab("table");
            }}
          >
            <Ionicons color={tab === "table" ? "#ffffff" : "#98a3b5"} name="trophy-outline" size={13} />
            <Text className={`text-[12px] font-medium ${tab === "table" ? "text-white" : "text-[#77839a]"}`}>
              {t("leaderboard.tableTab")}
            </Text>
          </Pressable>
          <Pressable
            className={`h-8 flex-1 flex-row items-center justify-center gap-1.5 rounded-full px-3 ${
              tab === "progress" ? "bg-[#2559ff]" : "bg-transparent"
            }`}
            onPress={() => {
              hapticSelection();
              setTab("progress");
            }}
          >
            <Ionicons color={tab === "progress" ? "#ffffff" : "#98a3b5"} name="trending-up" size={13} />
            <Text className={`text-[12px] font-medium ${tab === "progress" ? "text-white" : "text-[#77839a]"}`}>
              {t("leaderboard.progressTab")}
            </Text>
          </Pressable>
        </View>
      </View>

      {error ? (
        <View className="rounded-[18px] border border-danger/20 bg-danger/10 px-4 py-3">
          <Text className="text-[13px] leading-5 text-danger">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4">
          <Text className="text-[14px] leading-5 text-[#77839a]">
            {t("common.loading")}
          </Text>
        </View>
      ) : !overview ? (
        <View className="rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4">
          <Text className="text-[14px] leading-5 text-[#77839a]">
            {t("leaderboard.empty")}
          </Text>
        </View>
      ) : tab === "table" ? (
        <View className="overflow-hidden rounded-[18px] border border-[#e5ebf5] bg-white shadow-sm shadow-[#1f2687]/10">
          {overview.leaderboard.map((entry, index) => {
            const isMe = entry.employee.id === overview.me.employeeId;

            return (
              <Fragment key={entry.employee.id}>
                {index > 0 ? <View className="mx-4 h-px bg-[#edf1f7]" /> : null}
                <View className={`px-4 py-3 ${isMe ? "bg-[#eef4ff]" : "bg-transparent"}`}>
                  <View className="flex-row items-center gap-3">
                    {renderRankBadge(entry.rank)}
                    <Image
                      accessibilityIgnoresInvertColors
                      className="h-9 w-9 rounded-full"
                      resizeMode="cover"
                      source={resolveEmployeeAvatarSource({
                        avatarUrl: entry.employee.avatarUrl,
                        employeeNumber: entry.employee.employeeNumber,
                        firstName: entry.employee.firstName,
                        id: entry.employee.id,
                        lastName: entry.employee.lastName,
                      })}
                    />
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-[#1f2430]">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </Text>
                      <Text className="text-[11px] text-[#8b95a7]">
                        {entry.employee.position?.name ?? entry.employee.department?.name ?? t("leaderboard.points")}
                      </Text>
                    </View>
                    <Text className="font-display text-[18px] font-bold text-[#2559ff]">
                      {entry.points}
                    </Text>
                  </View>
                </View>
              </Fragment>
            );
          })}
        </View>
      ) : (
        <>
          <View className="rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 items-center">
                <Text className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#8b95a7]">
                  {t("leaderboard.rank")}
                </Text>
                <Text className="mt-1 font-display text-[25px] font-bold text-[#1f2430]">
                  {overview.me.rank}/{overview.summary.participants}
                </Text>
              </View>
              <View className="h-10 w-px bg-[#edf1f7]" />
              <View className="flex-1 items-center">
                <Text className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#8b95a7]">
                  {t("leaderboard.streak")}
                </Text>
                <Text className="mt-1 font-display text-[25px] font-bold text-[#16a085]">
                  {overview.me.streak}
                </Text>
              </View>
              <View className="h-10 w-px bg-[#edf1f7]" />
              <View className="flex-1 items-center">
                <Text className="text-[9px] font-semibold uppercase tracking-[1.2px] text-[#8b95a7]">
                  {t("leaderboard.points")}
                </Text>
                <Text className="mt-1 font-display text-[25px] font-bold text-[#2559ff]">
                  {overview.me.points}
                </Text>
              </View>
            </View>
          </View>

          <LinearGradient
            className="overflow-hidden rounded-[20px] px-4 py-4 shadow-sm shadow-[#1f2687]/20"
            colors={["#1f73ff", "#1458f4"]}
            end={{ x: 1, y: 1 }}
            start={{ x: 0, y: 0 }}
          >
            <View className="flex-row items-center">
              <View
                className="min-w-0 flex-row items-center gap-3 pr-3"
                style={{ flex: 2 }}
              >
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/16">
                  <Ionicons color="#ffffff" name="trophy-outline" size={30} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-display text-[17px] font-bold text-white">
                    {t("leaderboard.todayTotal")}
                  </Text>
                  <Text className="mt-0.5 text-[11px] leading-[14px] text-white">
                    {todayTotalCaption}
                  </Text>
                </View>
              </View>
              <View
                className="h-12 w-px"
                style={{ backgroundColor: "rgba(255,255,255,0.34)" }}
              />
              <View className="items-center justify-center pl-3" style={{ flex: 1 }}>
                <Text className="font-display font-bold text-white">
                  <Text className="text-[34px]">{todayPoints}</Text>
                  <Text className="text-[23px]">/{dailyMaxPoints}</Text>
                </Text>
                <Text className="text-[11px] font-semibold text-white">
                  {copy("готово сегодня", "done today")}
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View className="rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <Text className="text-[13px] font-bold text-[#303847]">
              {copy("Прогресс сегодня", "Today progress")}
            </Text>
            <View className="mt-3 flex-row items-center gap-4">
              {renderProgressRing(todayPoints, dailyMaxPoints)}
              <View className="min-w-0 flex-1">
                <Text className="text-[13px] font-bold text-[#1f2430]">
                  {copy("Отличный темп", "Great pace")}
                </Text>
                <Text className="mt-1 text-[11px] leading-4 text-[#77839a]">
                  {copy(
                    "Ты на пути к победе. Заверши ещё действия, чтобы дойти до дневного максимума.",
                    "You're on track to win. Complete more actions to reach today's maximum.",
                  )}
                </Text>
                {renderProgressDots(todayPoints, dailyMaxPoints)}
              </View>
            </View>
          </View>

          <View className="rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <Text className="text-[13px] font-bold text-[#303847]">
              {copy("Как заработать points", "How to earn points")}
            </Text>
            <View className="mt-3 gap-2">
              {overview.me.progress.map((metric) => (
                <View
                  className="flex-row items-center gap-3 rounded-[14px] border border-[#edf1f7] bg-[#fbfcff] px-3 py-2.5"
                  key={metric.key}
                >
                  <View
                    className={`h-9 w-9 items-center justify-center rounded-xl ${
                      metric.completed ? "bg-[#17b26a]" : "bg-[#f1f5f9]"
                    }`}
                  >
                    <Ionicons
                      color={metric.completed ? "#ffffff" : "#64748b"}
                      name={getMetricIconName(metric.key)}
                      size={18}
                    />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-[12px] font-bold text-[#303847]">
                      {getMetricTitle(metric.key)}
                    </Text>
                    <Text className="mt-0.5 text-[10px] leading-3 text-[#8b95a7]" numberOfLines={1}>
                      {getMetricHint(metric)}
                    </Text>
                  </View>
                  <View className={`rounded-full px-2.5 py-1 ${metric.completed ? "bg-[#dcfce7]" : "bg-[#f1f5f9]"}`}>
                    <Text className={`text-[10px] font-bold ${metric.completed ? "text-[#12a15f]" : "text-[#64748b]"}`}>
                      {formatMetricPoints(metric.earnedPoints, metric.maxPoints)}
                    </Text>
                  </View>
                  <Ionicons
                    color={metric.completed ? "#17b26a" : "#cbd5e1"}
                    name={metric.completed ? "checkmark-circle-outline" : "ellipse-outline"}
                    size={19}
                  />
                </View>
              ))}
            </View>
          </View>

          <View className="relative overflow-hidden rounded-[18px] border border-[#e5ebf5] bg-white px-4 py-4 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center justify-between gap-4">
              <View className="min-w-0 flex-1 flex-row items-center gap-2.5 pr-20">
                <Ionicons color="#ff6b35" name="flame-outline" size={24} />
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-[13px] font-bold text-[#303847]">
                      {copy("Твой streak", "Your streak")}
                    </Text>
                    <Text className="text-[13px] font-bold text-[#ff6b35]">
                      {overview.me.streak} {copy("дней", "days")}
                    </Text>
                  </View>
                  <Text className="mt-1 text-[11px] leading-4 text-[#77839a]">
                    {copy(
                      "Сохраняй серию и зарабатывай дополнительные бонусы.",
                      "Keep your streak and earn extra bonuses.",
                    )}
                  </Text>
                </View>
              </View>
            </View>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={STREAK_FLAG_IMAGE}
              style={{
                bottom: 0,
                height: 58,
                position: "absolute",
                right: 24,
                width: 58,
              }}
            />
          </View>
        </>
      )}
    </View>
  );

  if (standalone) {
    return (
      <Screen
        contentClassName="gap-3 px-6 pb-10 pt-4"
        safeAreaClassName="bg-[#f7f9fd]"
        showsVerticalScrollIndicator={false}
      >
        {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
        {content}
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-[#f7f9fd]">
      {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{
          paddingBottom: 116,
          paddingHorizontal: 24,
          paddingTop: insets.top + 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}
