import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { LeaderboardOverviewResponse } from "@smart/types";
import { Screen } from "../../components/ui/screen";
import { Text } from "../../components/ui/text";
import { PressableScale } from "../../components/ui/pressable-scale";
import { loadLeaderboardOverview } from "../../lib/api";
import { getDirectionalIconStyle, useI18n } from "../../lib/i18n";
import { peekScreenCache, readScreenCache, subscribeScreenCache, writeScreenCache } from "../../lib/screen-cache";
import { LEADERBOARD_SCREEN_CACHE_KEY, LEADERBOARD_SCREEN_CACHE_TTL_MS } from "../../lib/workspace-cache";

type LeaderboardScreenProps = {
  active?: boolean;
  standalone?: boolean;
};

type LeaderboardTab = "table" | "progress";

export default function LeaderboardScreen({
  active = true,
  standalone = false,
}: LeaderboardScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { language, t } = useI18n();
  const directionalIconStyle = getDirectionalIconStyle(language);
  const initialSnapshot = useMemo(
    () =>
      peekScreenCache<LeaderboardOverviewResponse>(
        LEADERBOARD_SCREEN_CACHE_KEY,
        LEADERBOARD_SCREEN_CACHE_TTL_MS,
      ),
    [],
  );
  const [tab, setTab] = useState<LeaderboardTab>("table");
  const [loading, setLoading] = useState(!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<LeaderboardOverviewResponse | null>(
    initialSnapshot?.value ?? null,
  );

  useEffect(() => {
    return subscribeScreenCache<LeaderboardOverviewResponse>(
      LEADERBOARD_SCREEN_CACHE_KEY,
      (entry) => {
        if (!entry) {
          return;
        }

        setOverview(entry.value);
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      const cached = await readScreenCache<LeaderboardOverviewResponse>(
        LEADERBOARD_SCREEN_CACHE_KEY,
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
        const nextOverview = await loadLeaderboardOverview();
        if (!cancelled) {
          setOverview(nextOverview);
          setError(null);
          setLoading(false);
          await writeScreenCache(LEADERBOARD_SCREEN_CACHE_KEY, nextOverview);
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
  }, [t]);

  function formatMetricPoints(earnedPoints: number, maxPoints: number) {
    return `+${earnedPoints} / +${maxPoints}`;
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

  const content = (
    <View className="gap-5">
      <View className="overflow-hidden rounded-[30px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="font-display text-[30px] font-bold text-foreground">
              {t("leaderboard.title")}
            </Text>
            <Text className="mt-1 text-[14px] leading-6 text-muted-foreground">
              {t("leaderboard.monthReset")}
            </Text>
          </View>
          {overview ? (
            <View className="rounded-full bg-[#ecfdf5] px-3 py-1.5">
              <Text className="text-[12px] font-semibold text-[#0f766e]">
                {overview.month.key}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-5 flex-row gap-2">
          <PressableScale
            className={`flex-1 rounded-full px-4 py-3 ${
              tab === "table" ? "bg-[#111827]" : "bg-[#eff4fb]"
            }`}
            haptic="selection"
            onPress={() => setTab("table")}
          >
            <Text
              className={`text-center text-[14px] font-semibold ${
                tab === "table" ? "text-white" : "text-foreground"
              }`}
            >
              {t("leaderboard.tableTab")}
            </Text>
          </PressableScale>
          <PressableScale
            className={`flex-1 rounded-full px-4 py-3 ${
              tab === "progress" ? "bg-[#111827]" : "bg-[#eff4fb]"
            }`}
            haptic="selection"
            onPress={() => setTab("progress")}
          >
            <Text
              className={`text-center text-[14px] font-semibold ${
                tab === "progress" ? "text-white" : "text-foreground"
              }`}
            >
              {t("leaderboard.progressTab")}
            </Text>
          </PressableScale>
        </View>
      </View>

      {error ? (
        <View className="rounded-[26px] border border-danger/20 bg-danger/10 px-5 py-4">
          <Text className="text-[14px] leading-6 text-danger">{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View className="rounded-[26px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
          <Text className="text-[15px] leading-6 text-muted-foreground">
            {t("common.loading")}
          </Text>
        </View>
      ) : !overview ? (
        <View className="rounded-[26px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
          <Text className="text-[15px] leading-6 text-muted-foreground">
            {t("leaderboard.empty")}
          </Text>
        </View>
      ) : tab === "table" ? (
        <>
          <View className="rounded-[30px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center justify-between gap-4">
              <View>
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.you")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-foreground">
                  {overview.me.rank}/{overview.summary.participants}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.monthPoints")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-foreground">
                  {overview.me.points}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.streak")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-foreground">
                  {overview.me.streak}
                </Text>
              </View>
            </View>
          </View>

          <View className="overflow-hidden rounded-[30px] border border-white/30 bg-white/76 shadow-sm shadow-[#1f2687]/10">
            {overview.leaderboard.map((entry, index) => {
              const isMe = entry.employee.id === overview.me.employeeId;
              const isLast = index === overview.leaderboard.length - 1;

              return (
                <View
                  className={`px-5 py-4 ${isMe ? "bg-[#eef6ff]" : "bg-transparent"}`}
                  key={entry.employee.id}
                >
                  <View className="flex-row items-center gap-4">
                    <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#111827]">
                      <Text className="font-display text-[16px] font-bold text-white">
                        {entry.rank}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-display text-[18px] font-bold text-foreground">
                        {entry.employee.firstName} {entry.employee.lastName}
                      </Text>
                      <Text className="mt-1 text-[13px] text-muted-foreground">
                        {entry.employee.position?.name ??
                          entry.employee.department?.name ??
                          entry.employee.employeeNumber}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text className="font-display text-[20px] font-bold text-foreground">
                        {entry.points}
                      </Text>
                      <Text className="text-[12px] font-semibold text-[#64748b]">
                        {t("leaderboard.points")}
                      </Text>
                    </View>
                    <View className="min-w-[58px] items-end">
                      <Text className="font-display text-[18px] font-bold text-[#0f766e]">
                        {entry.streak}
                      </Text>
                      <Text className="text-[12px] font-semibold text-[#64748b]">
                        {t("leaderboard.streak")}
                      </Text>
                    </View>
                  </View>
                  {!isLast ? <View className="mt-4 h-px bg-[#e7edf6]" /> : null}
                </View>
              );
            })}
          </View>
        </>
      ) : (
        <>
          <View className="rounded-[30px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
            <View className="flex-row items-center justify-between gap-4">
              <View>
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.rank")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-foreground">
                  {overview.me.rank}/{overview.summary.participants}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.points")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-foreground">
                  {overview.me.points}
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-[12px] font-semibold uppercase tracking-[1.4px] text-[#64748b]">
                  {t("leaderboard.streak")}
                </Text>
                <Text className="mt-2 font-display text-[24px] font-bold text-[#0f766e]">
                  {overview.me.streak}
                </Text>
              </View>
            </View>
          </View>

          <View className="rounded-[30px] border border-white/30 bg-white/76 px-5 py-5 shadow-sm shadow-[#1f2687]/10">
            <Text className="font-display text-[22px] font-bold text-foreground">
              {t("leaderboard.todayProgress")}
            </Text>
            <View className="mt-4 gap-3">
              {overview.me.progress.map((metric) => (
                <View
                  className={`rounded-[24px] border px-4 py-4 ${
                    metric.completed
                      ? "border-[#d7f6e7] bg-[#effcf4]"
                      : "border-[#e3eaf5] bg-white"
                  }`}
                  key={metric.key}
                >
                  <View className="flex-row items-center justify-between gap-4">
                    <View className="flex-1">
                      <Text className="text-[16px] font-semibold text-foreground">
                        {getMetricTitle(metric.key)}
                      </Text>
                      <Text className="mt-1 text-[13px] leading-5 text-muted-foreground">
                        {getMetricHint(metric)}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-3 py-2 ${
                        metric.completed ? "bg-[#dcfce7]" : "bg-[#eef3fb]"
                      }`}
                    >
                      <Text
                        className={`text-[12px] font-semibold ${
                          metric.completed ? "text-[#0f766e]" : "text-[#334155]"
                        }`}
                      >
                        {formatMetricPoints(metric.earnedPoints, metric.maxPoints)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-[24px] bg-[#111827] px-4 py-4">
              <Text className="font-display text-[18px] font-bold text-white">
                {t("leaderboard.todayTotal")}
              </Text>
              <Text className="font-display text-[20px] font-bold text-white">
                {overview.me.todayPoints}/{overview.me.todayMaxPoints}
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );

  if (standalone) {
    return (
      <Screen
        contentClassName="pb-10 pt-3"
        showsVerticalScrollIndicator={false}
        withGradient
      >
        {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
        <View className="flex-row items-center justify-between gap-4 px-1">
          <PressableScale
            className="h-11 w-11 items-center justify-center rounded-full bg-white/75"
            haptic="selection"
            onPress={() => router.back()}
          >
            <Ionicons
              color="#27364b"
              name="chevron-back"
              size={20}
              style={directionalIconStyle}
            />
          </PressableScale>
          <Text className="font-display text-[22px] font-bold text-foreground">
            {t("leaderboard.title")}
          </Text>
          <View className="h-11 w-11" />
        </View>
        {content}
      </Screen>
    );
  }

  return (
    <View className="flex-1 bg-transparent">
      {active ? <StatusBar backgroundColor="transparent" style="dark" translucent /> : null}
      <ScrollView
        className="flex-1 bg-transparent"
        contentContainerStyle={{
          paddingBottom: 116,
          paddingHorizontal: 16,
          paddingTop: insets.top + 12,
        }}
        showsVerticalScrollIndicator={false}
      >
        {content}
      </ScrollView>
    </View>
  );
}
