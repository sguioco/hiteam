import type {
  AttendanceStatusResponse,
  TaskItem,
  TaskPhotoProofItem,
} from '@smart/types';
import { loadMyProfile, loadMyShifts, loadMyTasks } from './api';

type WorkspaceProfile = Awaited<ReturnType<typeof loadMyProfile>>;
type ShiftItem = Awaited<ReturnType<typeof loadMyShifts>>[number];
type TodayTasks = Awaited<ReturnType<typeof loadMyTasks>>;

export const DEMO_OWNER_EMAIL = 'owner@demo.smart';
export const DEMO_OWNER_DISPLAY_NAME = {
  firstName: 'Alex',
  lastName: 'Petrov',
} as const;

const DEMO_OWNER_TIMEZONE = 'Asia/Novosibirsk';
const DEMO_OWNER_TIMEZONE_OFFSET = '+07:00';
const DEMO_OWNER_LOCATION_FALLBACK = {
  name: 'Central Studio',
  radiusMeters: 120,
  latitude: 55.0302,
  longitude: 82.9204,
} as const;

function getDemoOwnerDateParts(dayOffset = 0) {
  const target = new Date(Date.now() + dayOffset * 24 * 60 * 60 * 1000);
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEMO_OWNER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(target);
  const year = parts.find((part) => part.type === 'year')?.value ?? '2026';
  const month = parts.find((part) => part.type === 'month')?.value ?? '01';
  const day = parts.find((part) => part.type === 'day')?.value ?? '01';

  return { year, month, day };
}

function buildDemoOwnerIso(dayOffset: number, hour: number, minute: number) {
  const { year, month, day } = getDemoOwnerDateParts(dayOffset);
  return `${year}-${month}-${day}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00${DEMO_OWNER_TIMEZONE_OFFSET}`;
}

function buildDemoOwnerShiftDate(dayOffset: number) {
  const { year, month, day } = getDemoOwnerDateParts(dayOffset);
  return `${year}-${month}-${day}T00:00:00${DEMO_OWNER_TIMEZONE_OFFSET}`;
}

function buildDemoOwnerAssignee(profile: WorkspaceProfile) {
  return {
    id: profile.id,
    firstName: DEMO_OWNER_DISPLAY_NAME.firstName,
    lastName: DEMO_OWNER_DISPLAY_NAME.lastName,
    employeeNumber: profile.employeeNumber,
    department: profile.department,
    primaryLocation: profile.primaryLocation,
  };
}

function buildDemoOwnerTask(
  profile: WorkspaceProfile,
  options: {
    id: string;
    title: string;
    description: string;
    dueAt: string;
    requiresPhoto?: boolean;
    priority?: TaskItem['priority'];
    status?: TaskItem['status'];
    completedAt?: string | null;
    updatedAt?: string;
    photoProofs?: TaskPhotoProofItem[];
  },
): TaskItem {
  return {
    id: options.id,
    title: options.title,
    description: options.description,
    status: options.status ?? 'TODO',
    priority: options.priority ?? 'MEDIUM',
    requiresPhoto: options.requiresPhoto ?? false,
    isRecurring: false,
    taskTemplateId: null,
    occurrenceDate: null,
    dueAt: options.dueAt,
    completedAt: options.completedAt ?? null,
    createdAt: buildDemoOwnerIso(0, 8, 5),
    updatedAt: options.updatedAt ?? options.completedAt ?? buildDemoOwnerIso(0, 8, 5),
    groupId: null,
    assigneeEmployeeId: profile.id,
    managerEmployee: {
      id: profile.id,
      firstName: DEMO_OWNER_DISPLAY_NAME.firstName,
      lastName: DEMO_OWNER_DISPLAY_NAME.lastName,
    },
    assigneeEmployee: buildDemoOwnerAssignee(profile),
    group: null,
    checklistItems: [],
    activities: [],
    photoProofs: options.photoProofs ?? [],
  };
}

function buildDemoOwnerPhotoProof(
  profile: WorkspaceProfile,
  proofId: string,
  createdAt: string,
): TaskPhotoProofItem {
  const svg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#d7f0ff"/>
          <stop offset="100%" stop-color="#8ec5ff"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="1200" fill="url(#g)"/>
      <rect x="110" y="150" width="980" height="820" rx="52" fill="#ffffff" fill-opacity="0.74"/>
      <rect x="185" y="250" width="830" height="80" rx="22" fill="#2f6fed" fill-opacity="0.15"/>
      <rect x="185" y="380" width="430" height="310" rx="30" fill="#2f6fed" fill-opacity="0.16"/>
      <rect x="655" y="380" width="360" height="140" rx="24" fill="#0f172a" fill-opacity="0.08"/>
      <rect x="655" y="550" width="360" height="140" rx="24" fill="#0f172a" fill-opacity="0.08"/>
      <rect x="185" y="740" width="830" height="110" rx="24" fill="#16a34a" fill-opacity="0.12"/>
      <circle cx="320" cy="520" r="86" fill="#2f6fed" fill-opacity="0.22"/>
      <circle cx="345" cy="495" r="24" fill="#2f6fed" fill-opacity="0.42"/>
      <path d="M250 620l110-120 88 90 88-118 110 148H250z" fill="#2f6fed" fill-opacity="0.34"/>
      <text x="185" y="220" font-family="Arial" font-size="44" font-weight="700" fill="#1e3a8a">Lobby photo check</text>
      <text x="185" y="815" font-family="Arial" font-size="38" font-weight="700" fill="#166534">Approved by Alex Petrov</text>
    </svg>`,
  );

  return {
    id: proofId,
    fileName: 'demo-lobby-photo.svg',
    storageKey: `demo/${proofId}.svg`,
    url: `data:image/svg+xml;utf8,${svg}`,
    deletedAt: null,
    supersededByProofId: null,
    createdAt,
    uploadedByEmployee: {
      id: profile.id,
      firstName: DEMO_OWNER_DISPLAY_NAME.firstName,
      lastName: DEMO_OWNER_DISPLAY_NAME.lastName,
    },
  };
}

export function isDemoOwnerEmail(email?: string | null) {
  return email?.trim().toLowerCase() === DEMO_OWNER_EMAIL;
}

export function isDemoOwnerTaskId(taskId: string) {
  return taskId.startsWith('demo-owner-task-');
}

export function isDemoOwnerProfile(
  profile?: WorkspaceProfile | null,
) {
  return isDemoOwnerEmail(profile?.user?.email);
}

export function normalizeDemoOwnerProfile(
  profile?: WorkspaceProfile | null,
): WorkspaceProfile | null {
  if (!profile || !isDemoOwnerProfile(profile)) {
    return profile ?? null;
  }

  if (
    profile.firstName === DEMO_OWNER_DISPLAY_NAME.firstName &&
    profile.lastName === DEMO_OWNER_DISPLAY_NAME.lastName
  ) {
    return profile;
  }

  return {
    ...profile,
    firstName: DEMO_OWNER_DISPLAY_NAME.firstName,
    lastName: DEMO_OWNER_DISPLAY_NAME.lastName,
  };
}

export function buildDemoOwnerTodayShifts(
  profile: WorkspaceProfile,
): ShiftItem[] {
  return [
    {
      id: 'demo-owner-shift-today',
      shiftDate: buildDemoOwnerShiftDate(0),
      startsAt: buildDemoOwnerIso(0, 8, 0),
      endsAt: buildDemoOwnerIso(0, 18, 0),
      location: {
        id: profile.primaryLocation?.id ?? 'demo-owner-location',
        name:
          profile.primaryLocation?.name ??
          DEMO_OWNER_LOCATION_FALLBACK.name,
      },
      position: {
        id: profile.position?.id ?? 'demo-owner-position',
        name: profile.position?.name ?? 'Administrator',
      },
      template: {
        id: 'demo-owner-shift-template',
        name: 'Owner Day Shift',
      },
    },
  ];
}

export function buildDemoOwnerTodayTasks(
  profile: WorkspaceProfile,
): TodayTasks {
  const firstCompletedAt = buildDemoOwnerIso(0, 8, 42);
  const secondCompletedAt = buildDemoOwnerIso(0, 9, 18);
  const photoCompletedAt = buildDemoOwnerIso(0, 10, 6);

  return [
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-1',
      title: 'Review opening checklist',
      description: 'Walk through the studio opening checklist and confirm the first client block is ready.',
      dueAt: buildDemoOwnerIso(0, 9, 45),
      priority: 'HIGH',
      status: 'DONE',
      completedAt: firstCompletedAt,
    }),
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-2',
      title: 'Approve reception handoff',
      description: 'Confirm the front desk handoff notes and update anything missing for the day shift.',
      dueAt: buildDemoOwnerIso(0, 11, 15),
      priority: 'MEDIUM',
      status: 'DONE',
      completedAt: secondCompletedAt,
    }),
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-3',
      title: 'Check supply cabinet',
      description: 'Verify gloves, towels and disinfectants are stocked for the second half of the day.',
      dueAt: buildDemoOwnerIso(0, 12, 40),
      priority: 'MEDIUM',
    }),
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-4',
      title: 'Send staffing confirmation',
      description: 'Confirm today coverage with the evening staff and close any open gaps before 15:00.',
      dueAt: buildDemoOwnerIso(0, 14, 55),
      priority: 'HIGH',
    }),
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-5',
      title: 'Upload lobby photo check',
      description: 'Take and attach a clean photo of the lobby and promo stand after the midday walkthrough.',
      dueAt: buildDemoOwnerIso(0, 15, 35),
      requiresPhoto: true,
      priority: 'HIGH',
      status: 'DONE',
      completedAt: photoCompletedAt,
      photoProofs: [
        buildDemoOwnerPhotoProof(
          profile,
          'demo-owner-proof-1',
          buildDemoOwnerIso(0, 9, 58),
        ),
      ],
    }),
    buildDemoOwnerTask(profile, {
      id: 'demo-owner-task-6',
      title: 'Capture stock room confirmation',
      description: 'Attach two confirming photos after checking the stock room layout and consumables shelf.',
      dueAt: buildDemoOwnerIso(0, 17, 10),
      requiresPhoto: true,
      priority: 'HIGH',
    }),
  ];
}

export function buildDemoOwnerAttendanceStatus(
  profile: WorkspaceProfile,
  currentStatus: AttendanceStatusResponse | null,
  shifts: ShiftItem[],
): AttendanceStatusResponse {
  const currentShift = shifts[0] ?? null;
  const locationName =
    currentShift?.location.name ??
    profile.primaryLocation?.name ??
    currentStatus?.location.name ??
    DEMO_OWNER_LOCATION_FALLBACK.name;

  return {
    employeeId: profile.id,
    attendanceState: currentStatus?.attendanceState ?? 'not_checked_in',
    allowedActions:
      currentStatus?.allowedActions.length
        ? currentStatus.allowedActions
        : ['check_in'],
    location: currentStatus?.location ?? {
      id: profile.primaryLocation?.id ?? 'demo-owner-location',
      name: locationName,
      radiusMeters: DEMO_OWNER_LOCATION_FALLBACK.radiusMeters,
      latitude: DEMO_OWNER_LOCATION_FALLBACK.latitude,
      longitude: DEMO_OWNER_LOCATION_FALLBACK.longitude,
    },
    shift: currentShift
      ? {
          id: currentShift.id,
          label: currentShift.template.name,
          startsAt: currentShift.startsAt,
          endsAt: currentShift.endsAt,
          locationName,
        }
      : null,
    nextShift: null,
    verification: currentStatus?.verification ?? {
      locationRequired: true,
      selfieRequired: true,
      deviceMustBePrimary: true,
    },
    breakPolicy: currentStatus?.breakPolicy ?? {
      enabled: false,
      companyEnabled: false,
      employeeEnabled: false,
      defaultBreakIsPaid: false,
      maxBreakMinutes: 60,
      mandatoryBreakThresholdMinutes: 360,
      mandatoryBreakDurationMinutes: 30,
      mandatoryBreakDue: false,
    },
    activeSession: currentStatus?.activeSession ?? null,
  };
}

export function resolveDemoOwnerTodayScreenData(input: {
  attendanceStatus: AttendanceStatusResponse | null;
  profile: WorkspaceProfile | null;
  shifts: ShiftItem[];
  tasks: TodayTasks;
}) {
  const profile = normalizeDemoOwnerProfile(input.profile);

  if (!profile || !isDemoOwnerProfile(profile)) {
    return {
      attendanceStatus: input.attendanceStatus,
      profile,
      shifts: input.shifts,
      tasks: input.tasks,
    };
  }

  const shifts = buildDemoOwnerTodayShifts(profile);
  const tasks = buildDemoOwnerTodayTasks(profile);
  const attendanceStatus = buildDemoOwnerAttendanceStatus(
    profile,
    input.attendanceStatus,
    shifts,
  );

  return {
    attendanceStatus,
    profile,
    shifts,
    tasks,
  };
}
