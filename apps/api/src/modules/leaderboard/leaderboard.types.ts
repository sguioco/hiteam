export type LeaderboardProgressMetricKey =
  | "on_time_arrival"
  | "on_time_departure"
  | "tasks_and_checklists";

export type LeaderboardProgressMetric = {
  key: LeaderboardProgressMetricKey;
  earnedPoints: number;
  maxPoints: number;
  completed: boolean;
  details: {
    checkedAt: string | null;
    shiftBoundaryAt: string | null;
    dueTaskCount: number;
    completedDueTaskCount: number;
    dueChecklistItemCount: number;
    completedDueChecklistItemCount: number;
    overdueCount: number;
  };
};

export type LeaderboardDailyActivity = {
  dayKey: string;
  earnedPoints: number;
  maxPoints: number;
  completed: boolean;
  onTimeArrival: boolean;
  hadShift: boolean;
};

export type LeaderboardEntry = {
  rank: number;
  isPrivate?: boolean;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    avatarUrl: string | null;
    department: {
      id: string;
      name: string;
    } | null;
    position: {
      id: string;
      name: string;
    } | null;
  };
  points: number;
  todayPoints: number;
  streak: number;
};

export type LeaderboardOverviewResponse = {
  month: {
    key: string;
    startsAt: string;
    endsAt: string;
    todayKey: string;
  };
  summary: {
    participants: number;
    maxDailyPoints: number;
  };
  me: {
    employeeId: string;
    rank: number;
    points: number;
    todayPoints: number;
    todayMaxPoints: number;
    streak: number;
    progress: LeaderboardProgressMetric[];
    dailyActivity: LeaderboardDailyActivity[];
  };
  leaderboard: LeaderboardEntry[];
  visibility: {
    hidePeersFromEmployees: boolean;
    canManage: boolean;
    peersHiddenForViewer: boolean;
  };
};

export type LeaderboardCelebration = {
  kind: "ARRIVAL_STREAK_BONUS";
  streakDays: 5 | 10 | 20;
  bonusPoints: number;
  monthPoints: number;
};
