"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Pencil,
  Plus,
  Save,
  Users,
} from "lucide-react";
import { AdminShell } from "../../components/admin-shell";
import { EmployeeDropdown } from "../../components/employee-dropdown";
import { AltegioPilotConnect } from "../../components/altegio-pilot-connect";
import { ImageAdjustField } from "../../components/image-adjust-field";
import { Swirling } from "../../components/ui/swirling";
import {
  LocationAddressDetails,
  LocationMapPicker,
  LocationSelection,
} from "../../components/location-map-picker";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectOptionContent,
  SelectOptionDescription,
  SelectOptionText,
  SelectOptionTitle,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { apiRequest } from "../../lib/api";
import { toAdminHref } from "../../lib/admin-routes";
import { getSession } from "../../lib/auth";
import {
  buildAltegioMarketplaceConnectUrl,
  peekAltegioMarketplaceParams,
} from "../../lib/altegio-marketplace";
import { writeBrowserStorageItem } from "../../lib/browser-storage";
import { useI18n } from "../../lib/i18n";

type Company = {
  id: string;
  googlePlaceId?: string | null;
  logoUrl?: string | null;
  name: string;
  archivedAt?: string | null;
  _count?: {
    employees: number;
    locations: number;
  };
};

type Location = {
  id: string;
  companyId: string;
  name: string;
  code: string;
  address: string;
  country?: string | null;
  geofenceRadiusMeters?: number;
  latitude?: number;
  longitude?: number;
  timezone: string;
};
type EmployeeOption = {
  avatarUrl?: string | null;
  employeeNumber?: string | null;
  id: string;
  firstName: string;
  lastName: string;
  primaryLocation?: {
    id: string;
    name: string;
  } | null;
};
type WorkGroupOption = {
  id: string;
  name: string;
  memberships: Array<{
    employeeId: string;
  }>;
};
type AltegioBootstrapStatus = {
  activatedAt?: string | null;
  applicationId?: string | null;
  connected: boolean;
  locationId?: string | null;
};

type OrganizationSetupResponse = {
  attendanceTrackingEnabled: boolean;
  company: Company | null;
  configured: boolean;
  defaultGeofenceRadiusMeters: number;
  location: Location | null;
  organizationId?: string | null;
};

type SetupDraft = {
  address: string;
  companyLogoUrl: string;
  companyName: string;
  details: LocationAddressDetails | null;
  geofenceRadiusMeters: number;
  googlePlaceId: string;
  attendanceTrackingEnabled: boolean;
  latitude: string;
  locationName: string;
  longitude: string;
  timezone: string;
};

type SetupMode = "create" | "update" | "create-location";
type TimeZonePreset = {
  address: string;
  latitude: string;
  longitude: string;
};

const MIN_GEOFENCE_RADIUS_METERS = 50;
const DEFAULT_GEOFENCE_RADIUS_METERS = 100;
const MAX_GEOFENCE_RADIUS_METERS = 1000;
const GEOFENCE_STEP_METERS = 25;
const PREFERRED_TIME_ZONES = [
  "UTC", "Europe/London", "Europe/Berlin", "Europe/Moscow", "Asia/Dubai",
  "Asia/Tashkent", "Asia/Almaty", "Asia/Bangkok", "Asia/Novosibirsk", "Asia/Tokyo",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
];

const TIME_ZONE_LABEL_OVERRIDES: Record<string, string> = {
  "Asia/Bangkok": "Bangkok, Thailand",
};

const TIME_ZONE_OFFSET_LABEL_OVERRIDES: Record<string, string> = {
  "UTC+07:00": "Bangkok, Thailand",
};

const EMPTY_SETUP: OrganizationSetupResponse = {
  attendanceTrackingEnabled: true,
  company: null,
  configured: false,
  defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
  location: null,
  organizationId: null,
};
const ORGANIZATION_UPDATED_EVENT = "smart:organization-updated";
const ADD_LOCATION_SELECT_VALUE = "__add_location__";
const ADD_EMPLOYEE_PROMPT_STORAGE_PREFIX = "smart:add-employee-prompt";
const ADD_EMPLOYEE_PROMPT_PENDING = "pending";
const STREET_ADDRESS_MARKERS =
  /(?:^|[\s.])(street|st\.?|road|rd\.?|avenue|ave\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|highway|hwy\.?|улица|ул\.?|проспект|пр-т|переулок|пер\.?|шоссе|набережная|площадь|проезд|ถนน)(?:[\s.]|$)/iu;

const TIME_ZONE_PRESETS: Record<string, TimeZonePreset> = {
  "UTC-08:00": { address: "Downtown Anchorage, Alaska, United States", latitude: "61.217381", longitude: "-149.863129" },
  "UTC-07:00": { address: "Denver, Colorado, United States", latitude: "39.739236", longitude: "-104.990251" },
  "UTC-06:00": { address: "Chicago, Illinois, United States", latitude: "41.878113", longitude: "-87.629799" },
  "UTC-05:00": { address: "Manhattan, New York, United States", latitude: "40.758000", longitude: "-73.985500" },
  "UTC+00:00": { address: "Westminster, London, United Kingdom", latitude: "51.500729", longitude: "-0.124625" },
  "UTC+01:00": { address: "Alexanderplatz, Berlin, Germany", latitude: "52.521918", longitude: "13.413215" },
  "UTC+03:00": { address: "Moscow City, Moscow, Russia", latitude: "55.749447", longitude: "37.537087" },
  "UTC+04:00": { address: "Burj Khalifa, Downtown Dubai, Dubai, United Arab Emirates", latitude: "25.197197", longitude: "55.274376" },
  "UTC+05:00": { address: "Tashkent City, Tashkent, Uzbekistan", latitude: "41.299496", longitude: "69.240074" },
  "UTC+06:00": { address: "Almaty, Kazakhstan", latitude: "43.238949", longitude: "76.889709" },
  "UTC+07:00": { address: "Bangkok, Thailand", latitude: "13.756331", longitude: "100.501762" },
  "UTC+09:00": { address: "Shinjuku, Tokyo, Japan", latitude: "35.693840", longitude: "139.703549" },
};

function getTimeZoneOffsetLabel(timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" });
    const parts = formatter.formatToParts(new Date());
    const zoneName = parts.find((part) => part.type === "timeZoneName")?.value ?? "GMT+0";
    const normalized = zoneName.replace("GMT", "UTC");
    if (normalized === "UTC") return "UTC+00:00";
    const match = normalized.match(/^UTC([+-])(\d{1,2})(?::?(\d{2}))?$/);
    if (!match) return normalized;
    const [, sign, hours, minutes] = match;
    return `UTC${sign}${hours.padStart(2, "0")}:${(minutes ?? "00").padStart(2, "0")}`;
  } catch {
    return "UTC+00:00";
  }
}

function parseOffsetToMinutes(offsetLabel: string) {
  const match = offsetLabel.match(/^UTC([+-])(\d{2}):(\d{2})$/);
  if (!match) return 0;
  const [, sign, hours, minutes] = match;
  const total = Number(hours) * 60 + Number(minutes);
  return sign === "-" ? -total : total;
}

function buildTimeZoneOptions(selectedTimeZone?: string) {
  const source = (() => {
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        const values = Intl.supportedValuesOf("timeZone");
        if (values.length) return values;
      }
    } catch {}
    return PREFERRED_TIME_ZONES;
  })();

  const uniqueByOffset = new Map<string, string>();
  for (const timeZone of [selectedTimeZone, ...PREFERRED_TIME_ZONES, ...source]) {
    if (!timeZone) continue;
    const offset = getTimeZoneOffsetLabel(timeZone);
    if (!uniqueByOffset.has(offset)) uniqueByOffset.set(offset, timeZone);
  }

  return Array.from(uniqueByOffset.entries())
    .sort(([leftOffset], [rightOffset]) => parseOffsetToMinutes(leftOffset) - parseOffsetToMinutes(rightOffset))
    .map(([offset, timeZone]) => ({
      label: `${offset} · ${TIME_ZONE_OFFSET_LABEL_OVERRIDES[offset] ?? TIME_ZONE_LABEL_OVERRIDES[timeZone] ?? timeZone}`,
      timeZone,
    }));
}

function normalizeRadius(value?: number | null) {
  if (typeof value !== "number" || Number.isNaN(value)) return DEFAULT_GEOFENCE_RADIUS_METERS;
  return Math.min(MAX_GEOFENCE_RADIUS_METERS, Math.max(MIN_GEOFENCE_RADIUS_METERS, value));
}

function getLocationAddressLabel(location: Pick<Location, "address" | "name">) {
  const address = location.address.trim();
  if (!address) return location.name;

  const addressParts = address
    .split(/\s*(?:,|;|·|\s+-\s+)\s*/u)
    .map((part) => part.trim())
    .filter(Boolean);
  const streetPart = addressParts.find((part) =>
    STREET_ADDRESS_MARKERS.test(part),
  );
  const numberedPart = addressParts.find(
    (part) => /\d/u.test(part) && !/^\d{4,6}$/u.test(part),
  );

  return streetPart ?? numberedPart ?? addressParts[0] ?? location.name;
}

function createEmptyDraft(): SetupDraft {
  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return {
    address: "", companyLogoUrl: "", companyName: "", details: null,
    geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS, googlePlaceId: "",
    attendanceTrackingEnabled: true,
    latitude: "", locationName: "", longitude: "", timezone: detectedTimeZone,
  };
}

function buildDraftFromSetup(setup: OrganizationSetupResponse): SetupDraft {
  return {
    address: setup.location?.address ?? "",
    companyLogoUrl: setup.company?.logoUrl ?? "",
    companyName: setup.company?.name ?? "",
    details: null,
    geofenceRadiusMeters: normalizeRadius(setup.location?.geofenceRadiusMeters ?? setup.defaultGeofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS),
    googlePlaceId: setup.company?.googlePlaceId ?? "",
    attendanceTrackingEnabled: setup.attendanceTrackingEnabled ?? true,
    latitude: typeof setup.location?.latitude === "number" ? String(setup.location.latitude) : "",
    locationName: setup.location?.name ?? "",
    longitude: typeof setup.location?.longitude === "number" ? String(setup.location.longitude) : "",
    timezone: setup.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

function resolveSetupMode(setup: OrganizationSetupResponse): SetupMode {
  if (setup.location) return "update";
  if (setup.company) return "create-location";
  return "create";
}

function hasDraftCoordinates(draft: SetupDraft) {
  return draft.latitude.trim() !== "" && draft.longitude.trim() !== "";
}

function buildAddEmployeePromptStorageKey(
  session: NonNullable<ReturnType<typeof getSession>>,
) {
  return `${ADD_EMPLOYEE_PROMPT_STORAGE_PREFIX}:${session.user.tenantId}:${session.user.id}`;
}

export type OrganizationPageInitialData = {
  altegio?: AltegioBootstrapStatus;
  companies?: Company[];
  employeeCount: number;
  employees?: EmployeeOption[];
  groups?: WorkGroupOption[];
  locations?: Location[];
  setup: OrganizationSetupResponse;
};

export default function OrganizationPageClient({
  initialData,
}: {
  initialData?: OrganizationPageInitialData | null;
}) {
  const router = useRouter();
  const { locale } = useI18n();
  const [setup, setSetup] = useState<OrganizationSetupResponse>(
    initialData?.setup ?? EMPTY_SETUP,
  );
  const [employeeCount, setEmployeeCount] = useState(initialData?.employeeCount ?? 0);
  const [companies, setCompanies] = useState<Company[]>(
    initialData?.companies ??
      (initialData?.setup.company ? [initialData.setup.company] : []),
  );
  const [locations, setLocations] = useState<Location[]>(
    initialData?.locations ??
      (initialData?.setup.location ? [initialData.setup.location] : []),
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState(
    initialData?.setup.company?.id ?? "",
  );
  const [selectedLocationId, setSelectedLocationId] = useState(
    initialData?.setup.location?.id ?? "",
  );
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [isCreatingCompany, setIsCreatingCompany] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<
    EmployeeOption[]
  >(initialData?.employees ?? []);
  const [availableGroups, setAvailableGroups] = useState<WorkGroupOption[]>(
    initialData?.groups ?? [],
  );
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [draft, setDraft] = useState<SetupDraft>(() =>
    buildDraftFromSetup(initialData?.setup ?? EMPTY_SETUP),
  );
  const [radiusInput, setRadiusInput] = useState(() =>
    String(
      normalizeRadius(
        initialData?.setup.location?.geofenceRadiusMeters ??
          initialData?.setup.defaultGeofenceRadiusMeters ??
          DEFAULT_GEOFENCE_RADIUS_METERS,
      ),
    ),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [lastSavedMode, setLastSavedMode] = useState<SetupMode | null>(null);
  const [altegioConnectedLocationId, setAltegioConnectedLocationId] =
    useState<string | null>(() =>
      initialData?.altegio?.connected
        ? initialData.altegio.locationId ?? null
        : null,
    );
  const [altegioConnectionLoaded, setAltegioConnectionLoaded] = useState(
    Boolean(initialData?.altegio),
  );
  const [locationConfirmationPending, setLocationConfirmationPending] =
    useState(false);
  const [setupMode, setSetupMode] = useState<SetupMode>(
    resolveSetupMode(initialData?.setup ?? EMPTY_SETUP),
  );
  const successTimeoutRef = useRef<number | null>(null);
  const employeesRedirectTimeoutRef = useRef<number | null>(null);
  const didUseInitialData = useRef(Boolean(initialData));
  const companyNameInputRef = useRef<HTMLInputElement | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const timeZoneOptions = useMemo(() => buildTimeZoneOptions(draft.timezone), [draft.timezone]);
  const timeZonePreset = useMemo(() => TIME_ZONE_PRESETS[getTimeZoneOffsetLabel(draft.timezone)] ?? null, [draft.timezone]);
  const companyLocations = useMemo(
    () =>
      locations.filter(({ companyId }) => companyId === selectedCompanyId),
    [locations, selectedCompanyId],
  );
  const selectedHeaderLocation = useMemo(
    () => companyLocations.find(({ id }) => id === selectedLocationId) ?? null,
    [companyLocations, selectedLocationId],
  );
  const groupByEmployeeId = useMemo(() => {
    const groupsByEmployee = new Map<string, { id: string; name: string }>();

    availableGroups.forEach((group) => {
      group.memberships.forEach(({ employeeId }) => {
        if (!groupsByEmployee.has(employeeId)) {
          groupsByEmployee.set(employeeId, { id: group.id, name: group.name });
        }
      });
    });

    return groupsByEmployee;
  }, [availableGroups]);

  function applyAltegioStatus(status?: AltegioBootstrapStatus) {
    if (!status) return;
    setAltegioConnectedLocationId(
      status.connected ? status.locationId ?? null : null,
    );
    setAltegioConnectionLoaded(true);
  }

  function applyScope(company: Company, location?: Location | null) {
    const nextSetup: OrganizationSetupResponse = {
      ...setup,
      company,
      location: location ?? null,
      configured: Boolean(location),
    };
    setSelectedCompanyId(company.id);
    setSelectedLocationId(location?.id ?? "");
    setEmployeeCount(company._count?.employees ?? 0);
    setSetup(nextSetup);
    setDraft(buildDraftFromSetup(nextSetup));
    setRadiusInput(
      String(
        normalizeRadius(
          location?.geofenceRadiusMeters ??
            nextSetup.defaultGeofenceRadiusMeters,
        ),
      ),
    );
    setSetupMode(location ? "update" : "create-location");
    setError(null);
    setSaveSuccess(false);
  }

  async function loadStructure() {
    const session = getSession();
    if (!session) return;

    const snapshot = await apiRequest<OrganizationPageInitialData>(
      "/bootstrap/organization",
      { token: session.accessToken },
    );
    const nextCompanies = snapshot.companies ?? [];
    const nextLocations = snapshot.locations ?? [];
    const nextEmployees = snapshot.employees ?? [];
    const nextGroups = snapshot.groups ?? [];
    setCompanies(nextCompanies);
    setLocations(nextLocations);
    setAvailableEmployees(nextEmployees);
    setAvailableGroups(nextGroups);
    applyAltegioStatus(snapshot.altegio);

    const currentCompany =
      nextCompanies.find(({ id }) => id === selectedCompanyId) ??
      nextCompanies.find(({ id }) => id === snapshot.setup.company?.id) ??
      nextCompanies[0];
    if (!currentCompany) return;
    const currentLocation =
      nextLocations.find(({ id }) => id === selectedLocationId) ??
      nextLocations.find(({ id }) => id === snapshot.setup.location?.id) ??
      nextLocations.find(({ companyId }) => companyId === currentCompany.id) ??
      null;
    const nextSetup = {
      ...snapshot.setup,
      company: currentCompany,
      location: currentLocation,
      configured: Boolean(currentLocation),
    };
    setSelectedCompanyId(currentCompany.id);
    setSelectedLocationId(currentLocation?.id ?? "");
    setEmployeeCount(currentCompany._count?.employees ?? snapshot.employeeCount);
    setSetup(nextSetup);
    setDraft(buildDraftFromSetup(nextSetup));
    setRadiusInput(
      String(
        normalizeRadius(
          currentLocation?.geofenceRadiusMeters ??
            nextSetup.defaultGeofenceRadiusMeters,
        ),
      ),
    );
    setSetupMode(currentLocation ? "update" : "create-location");
  }

  function handleCompanySelect(companyId: string) {
    const company = companies.find(({ id }) => id === companyId);
    if (!company) return;
    const location =
      locations.find(({ companyId: ownerId }) => ownerId === company.id) ??
      null;
    applyScope(company, location);
  }

  function handleLocationSelect(locationId: string) {
    if (locationId === ADD_LOCATION_SELECT_VALUE) {
      startAddLocation();
      return;
    }
    const location = locations.find(({ id }) => id === locationId);
    const company = companies.find(({ id }) => id === location?.companyId);
    if (!location || !company) return;
    applyScope(company, location);
  }

  function startAddLocation() {
    const company = companies.find(({ id }) => id === selectedCompanyId);
    if (!company) return;
    const empty = createEmptyDraft();
    setSelectedLocationId("");
    setSetup((current) => ({
      ...current,
      company,
      configured: false,
      location: null,
    }));
    setDraft({
      ...empty,
      companyLogoUrl: company.logoUrl ?? "",
      companyName: company.name,
      googlePlaceId: company.googlePlaceId ?? "",
    });
    setRadiusInput(String(DEFAULT_GEOFENCE_RADIUS_METERS));
    setSetupMode("create-location");
    setSelectedEmployeeIds([]);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCreateCompany() {
    const session = getSession();
    const name = newCompanyName.trim();
    if (!session || !name) return;
    setIsCreatingCompany(true);
    setError(null);
    setCreateCompanyOpen(false);
    setNewCompanyName("");
    try {
      const company = await apiRequest<Company>("/org/companies", {
        method: "POST",
        token: session.accessToken,
        body: JSON.stringify({ name }),
      });
      setCompanies((current) => [company, ...current]);
      applyScope(company, null);
    } catch (nextError) {
      setNewCompanyName(name);
      setCreateCompanyOpen(true);
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "ru"
            ? "Не удалось создать организацию."
            : "Failed to create organization.",
      );
    } finally {
      setIsCreatingCompany(false);
    }
  }

  async function loadData() {
    const session = getSession();
    if (!session) {
      setSetup(EMPTY_SETUP);
      setEmployeeCount(0);
      setDraft(buildDraftFromSetup(EMPTY_SETUP));
      setError(
        locale === "ru"
          ? "Сессия истекла или токен недействителен. Войди заново."
          : "Session expired or token is invalid. Sign in again.",
      );
      return;
    }

    try {
      const snapshot = await apiRequest<OrganizationPageInitialData>("/bootstrap/organization", {
        token: session.accessToken,
      });

      setSetup(snapshot.setup);
      applyAltegioStatus(snapshot.altegio);
      setEmployeeCount(snapshot.employeeCount);
      setDraft(buildDraftFromSetup(snapshot.setup));
      setRadiusInput(String(normalizeRadius(snapshot.setup.location?.geofenceRadiusMeters ?? snapshot.setup.defaultGeofenceRadiusMeters)));
      setError(null);
      setSaveSuccess(false);
      setSetupMode(resolveSetupMode(snapshot.setup));
    } catch (loadError) {
      setSetup(EMPTY_SETUP);
      setEmployeeCount(0);
      setDraft(buildDraftFromSetup(EMPTY_SETUP));
      setError(
        loadError instanceof Error
          ? loadError.message
          : locale === "ru"
            ? "Не удалось загрузить организацию."
            : "Failed to load organization.",
      );
    }
  }

  useEffect(() => {
    if (didUseInitialData.current && initialData) {
      didUseInitialData.current = false;
      return;
    }

    void loadData();
  }, []);

  useEffect(() => {
    const pending = peekAltegioMarketplaceParams();
    if (pending?.locationId) {
      const params = new URLSearchParams({
        from: "altegio",
        salon_id: pending.locationId,
      });
      if (pending.applicationId) {
        params.set("app_id", pending.applicationId);
      }
      router.replace(toAdminHref(`/billing?${params.toString()}`));
      return;
    }

  }, [router]);

  useEffect(() => {
    if (
      initialData?.companies &&
      initialData.locations &&
      initialData.employees
    ) {
      return;
    }

    void loadStructure().catch((nextError) => {
      setError(
        nextError instanceof Error
          ? nextError.message
          : locale === "ru"
            ? "Не удалось загрузить организации и локации."
            : "Failed to load organizations and locations.",
      );
    });
  }, []);

  useEffect(() => {
    if (!saveSuccess) {
      return;
    }

    successTimeoutRef.current = window.setTimeout(() => {
      setSaveSuccess(false);
      successTimeoutRef.current = null;
    }, 2200);

    return () => {
      if (successTimeoutRef.current !== null) {
        window.clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = null;
      }
    };
  }, [saveSuccess]);

  useEffect(() => {
    return () => {
      if (employeesRedirectTimeoutRef.current !== null) {
        window.clearTimeout(employeesRedirectTimeoutRef.current);
        employeesRedirectTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!timeZonePreset || draft.address.trim() || hasDraftCoordinates(draft)) return;
    setDraft((current) => ({
      ...current, address: timeZonePreset.address, latitude: timeZonePreset.latitude, longitude: timeZonePreset.longitude,
    }));
  }, [draft, timeZonePreset]);

  function updateDraft<K extends keyof SetupDraft>(key: K, value: SetupDraft[K]) {
    if (saveSuccess) {
      setSaveSuccess(false);
    }
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function copyOrganizationId() {
    const organizationId = setup.organizationId?.trim();
    if (!organizationId) return;

    try {
      await navigator.clipboard.writeText(organizationId);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = organizationId;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
  }

  function handleMapSelect(next: LocationSelection) {
    if (saveSuccess) {
      setSaveSuccess(false);
    }
    setDraft((current) => ({
      ...current,
      address: next.address ?? current.address,
      companyName: current.companyName || next.suggestedCompanyName || current.companyName,
      details: next.details ?? current.details,
      googlePlaceId: next.googlePlaceId ?? current.googlePlaceId,
      latitude: next.latitude,
      longitude: next.longitude,
    }));
  }

  async function persistConfirmedLocation(next: LocationSelection) {
    if (!selectedCompanyId) {
      return;
    }

    if (setupMode === "update" && !selectedLocationId) return;
    if (setupMode !== "update" && setupMode !== "create-location") return;

    const session = getSession();
    if (!session) {
      const message =
        locale === "ru"
          ? "Сессия истекла. Войди заново, чтобы сохранить точку."
          : "Session expired. Sign in again to save this point.";
      setError(message);
      throw new Error(message);
    }

    try {
      setError(null);
      const company = companies.find(({ id }) => id === selectedCompanyId);
      if (!company) {
        throw new Error(
          locale === "ru" ? "Организация не найдена." : "Organization was not found.",
        );
      }

      const locationName =
        draft.locationName.trim() ||
        getLocationAddressLabel({
          address: next.address?.trim() || draft.address.trim(),
          name: draft.companyName.trim(),
        });
      const locationPayload = {
        address: next.address?.trim() || draft.address.trim(),
        country:
          next.details?.country ||
          draft.details?.country ||
          setup.location?.country ||
          null,
        geofenceRadiusMeters: normalizeRadius(draft.geofenceRadiusMeters),
        latitude: Number(next.latitude),
        longitude: Number(next.longitude),
        name: locationName,
        timezone: draft.timezone.trim() || "UTC",
      };
      const location =
        setupMode === "create-location"
          ? await apiRequest<Location>("/org/locations", {
              method: "POST",
              token: session.accessToken,
              body: JSON.stringify({
                ...locationPayload,
                code: `LOC-${Date.now().toString(36).toUpperCase()}`,
                companyId: company.id,
                employeeIds: selectedEmployeeIds,
              }),
            })
          : await apiRequest<Location>(`/org/locations/${selectedLocationId}`, {
              method: "PATCH",
              token: session.accessToken,
              body: JSON.stringify(locationPayload),
            });

      setSetup((current) => ({
        ...current,
        company,
        configured: true,
        location,
      }));
      setDraft((current) => ({
        ...current,
        address: location.address,
        latitude: String(location.latitude),
        locationName: location.name,
        longitude: String(location.longitude),
      }));
      setSelectedLocationId(location.id);
      setLocations((current) => {
        const exists = current.some(({ id }) => id === location.id);
        return exists
          ? current.map((item) => (item.id === location.id ? location : item))
          : [location, ...current];
      });
      setSetupMode("update");
      setLastSavedMode(
        setupMode === "create-location" ? "create-location" : "update",
      );
      setSaveSuccess(true);
    } catch (nextError) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : locale === "ru"
            ? "Не удалось сохранить подтверждённую точку."
            : "Failed to save the confirmed point.";
      setError(message);
      throw nextError instanceof Error ? nextError : new Error(message);
    }
  }

  function shiftRadius(delta: number) {
    const nextValue = normalizeRadius(draft.geofenceRadiusMeters + delta);
    updateDraft("geofenceRadiusMeters", nextValue);
    setRadiusInput(String(nextValue));
  }

  function handleRadiusInputChange(value: string) {
    setRadiusInput(value);
    const trimmed = value.trim();
    if (!trimmed) return;
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) return;
    updateDraft("geofenceRadiusMeters", normalizeRadius(parsed));
  }

  function handleRadiusInputBlur() {
    const parsed = Number(radiusInput);
    const normalized = normalizeRadius(parsed);
    updateDraft("geofenceRadiusMeters", normalized);
    setRadiusInput(String(normalized));
  }

  async function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      setError(
        locale === "ru"
          ? "Сессия истекла или токен недействителен. Войди заново."
          : "Session expired or token is invalid. Sign in again.",
      );
      return;
    }
    if (!draft.companyName.trim()) {
      setError(locale === "ru" ? "Укажи название организации." : "Enter the organization name.");
      return;
    }
    if (setupMode === "create-location" && !draft.locationName.trim()) {
      setError(locale === "ru" ? "Укажи название локации." : "Enter the location name.");
      return;
    }
    if (locationConfirmationPending) {
      setError(
        locale === "ru"
          ? "Подтверди выбранную точку на карте перед сохранением."
          : "Confirm the selected map point before saving.",
      );
      return;
    }
    if (!draft.address.trim()) {
      setError(locale === "ru" ? "Укажи адрес организации." : "Enter the organization address.");
      return;
    }
    if (!draft.latitude || !draft.longitude) {
      setError(
        locale === "ru"
          ? "Поставь точку на карте или выбери адрес из подсказок."
          : "Place a point on the map or choose an address from suggestions.",
      );
      return;
    }
    const shouldRedirectToEmployees =
      setupMode === "create" && !setup.configured;
    const shouldUpdateAttendanceSettings =
      setupMode !== "create" &&
      draft.attendanceTrackingEnabled !== setup.attendanceTrackingEnabled;

    try {
      setIsSaving(true); setError(null); setSaveSuccess(false); setLastSavedMode(setupMode);
      let nextSetup: OrganizationSetupResponse;

      if (setupMode === "create-location" && selectedCompanyId) {
        const company = companies.find(({ id }) => id === selectedCompanyId);
        if (!company) {
          throw new Error(
            locale === "ru"
              ? "Организация не найдена."
              : "Organization was not found.",
          );
        }
        const location = await apiRequest<Location>("/org/locations", {
          method: "POST",
          token: session.accessToken,
          body: JSON.stringify({
            companyId: company.id,
            name: draft.locationName.trim(),
            code: `LOC-${Date.now().toString(36).toUpperCase()}`,
            address: draft.address.trim(),
            country:
              draft.details?.country || setup.location?.country || undefined,
            geofenceRadiusMeters: normalizeRadius(
              draft.geofenceRadiusMeters,
            ),
            latitude: Number(draft.latitude),
            longitude: Number(draft.longitude),
            timezone: draft.timezone.trim() || "UTC",
            employeeIds: selectedEmployeeIds,
          }),
        });
        nextSetup = {
          ...setup,
          company,
          configured: true,
          location,
        };
      } else if (
        setupMode === "update" &&
        selectedCompanyId &&
        selectedLocationId
      ) {
        const [company, location] = await Promise.all([
          apiRequest<Company>(`/org/companies/${selectedCompanyId}`, {
            method: "PATCH",
            token: session.accessToken,
            body: JSON.stringify({
              name: draft.companyName.trim(),
              logoUrl: draft.companyLogoUrl || null,
              googlePlaceId: draft.googlePlaceId || null,
            }),
          }),
          apiRequest<Location>(`/org/locations/${selectedLocationId}`, {
            method: "PATCH",
            token: session.accessToken,
            body: JSON.stringify({
              name: draft.locationName.trim() || draft.companyName.trim(),
              address: draft.address.trim(),
              country:
                draft.details?.country || setup.location?.country || null,
              geofenceRadiusMeters: normalizeRadius(
                draft.geofenceRadiusMeters,
              ),
              latitude: Number(draft.latitude),
              longitude: Number(draft.longitude),
              timezone: draft.timezone.trim() || "UTC",
            }),
          }),
        ]);
        nextSetup = {
          ...setup,
          company,
          configured: true,
          location,
        };
      } else {
        nextSetup = await apiRequest<OrganizationSetupResponse>("/org/setup", {
          method: "POST", token: session.accessToken,
          body: JSON.stringify({
            mode: setupMode, address: draft.address.trim(), companyLogoUrl: draft.companyLogoUrl || undefined,
            country: draft.details?.country || setup.location?.country || undefined,
            companyName: draft.companyName.trim(), geofenceRadiusMeters: normalizeRadius(draft.geofenceRadiusMeters),
            googlePlaceId: draft.googlePlaceId || undefined, latitude: Number(draft.latitude), longitude: Number(draft.longitude),
            attendanceTrackingEnabled: draft.attendanceTrackingEnabled,
            timezone: draft.timezone.trim() || "UTC",
          }),
        });
      }
      if (shouldUpdateAttendanceSettings) {
        await apiRequest("/org/settings", {
          method: "PATCH",
          token: session.accessToken,
          body: JSON.stringify({
            attendanceTrackingEnabled: draft.attendanceTrackingEnabled,
          }),
        });
        nextSetup = {
          ...nextSetup,
          attendanceTrackingEnabled: draft.attendanceTrackingEnabled,
        };
      }
      setSetup(nextSetup);
      setDraft(buildDraftFromSetup(nextSetup));
      setRadiusInput(String(normalizeRadius(nextSetup.location?.geofenceRadiusMeters ?? nextSetup.defaultGeofenceRadiusMeters)));
      setSetupMode(resolveSetupMode(nextSetup));
      if (nextSetup.company) {
        setSelectedCompanyId(nextSetup.company.id);
        setCompanies((current) => {
          const exists = current.some(({ id }) => id === nextSetup.company?.id);
          return exists
            ? current.map((company) =>
                company.id === nextSetup.company?.id
                  ? { ...company, ...nextSetup.company }
                  : company,
              )
            : [nextSetup.company as Company, ...current];
        });
      }
      if (nextSetup.location) {
        setSelectedLocationId(nextSetup.location.id);
        setLocations((current) => {
          const exists = current.some(({ id }) => id === nextSetup.location?.id);
          return exists
            ? current.map((location) =>
                location.id === nextSetup.location?.id
                  ? { ...location, ...nextSetup.location }
                  : location,
              )
            : [nextSetup.location as Location, ...current];
        });
      }
      void loadStructure().catch(() => undefined);
      window.dispatchEvent(
        new CustomEvent(ORGANIZATION_UPDATED_EVENT, {
          detail: {
            company: nextSetup.company,
            attendanceTrackingEnabled: nextSetup.attendanceTrackingEnabled,
            configured: nextSetup.configured,
            organizationId: nextSetup.organizationId,
          },
        }),
      );
      setSaveSuccess(true);
      if (shouldRedirectToEmployees && nextSetup.configured) {
        writeBrowserStorageItem(
          buildAddEmployeePromptStorageKey(session),
          ADD_EMPLOYEE_PROMPT_PENDING,
          { includeSessionFallback: true },
        );
        if (employeesRedirectTimeoutRef.current !== null) {
          window.clearTimeout(employeesRedirectTimeoutRef.current);
        }
        employeesRedirectTimeoutRef.current = window.setTimeout(() => {
          employeesRedirectTimeoutRef.current = null;
          router.replace(toAdminHref("/employees?focusAddEmployee=1"));
        }, 650);
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : locale === "ru"
            ? "Не удалось сохранить организацию."
            : "Failed to save organization.",
      );
    } finally { setIsSaving(false); }
  }

  return (
    <AdminShell showTopbar={false}>
      <div className="organization-studio-page mx-auto w-full max-w-6xl px-6 pt-10 pb-6 md:px-10 md:pt-12 md:pb-6 animate-in fade-in duration-500">
        <form className="organization-studio" onSubmit={(event) => void handleSetupSubmit(event)}>
          <div className="organization-studio-body">
            {error ? (
              <div className="organization-studio-feedback organization-studio-feedback--error">
                {error}
              </div>
            ) : null}

            {altegioConnectionLoaded ? (
              altegioConnectedLocationId ? (
                <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,#f4fff9_0%,#ffffff_100%)] px-5 py-4 shadow-[0_12px_36px_rgba(16,185,129,0.08)] sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-[15px] shadow-[0_8px_20px_rgba(236,193,23,0.22)]">
                      <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {locale === "ru"
                          ? `Altegio подключён · salon ${altegioConnectedLocationId}`
                          : `Altegio connected · salon ${altegioConnectedLocationId}`}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {locale === "ru"
                          ? "Сотрудники и расписание синхронизируются с HiTeam."
                          : "Staff and schedules are connected to HiTeam."}
                      </p>
                    </div>
                  </div>
                  <button
                    className="shrink-0 text-sm font-semibold text-[color:var(--accent)]"
                    onClick={() => router.push(toAdminHref("/billing"))}
                    type="button"
                  >
                    {locale === "ru" ? "Управлять интеграцией" : "Manage integration"}
                  </button>
                </div>
              ) : (
                <div className="mb-6 font-heading">
                  <div className="flex flex-col gap-4 rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white px-5 py-4 shadow-[0_14px_38px_rgba(15,23,42,0.07)] sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl shadow-sm">
                        <img alt="Altegio" className="h-full w-full object-cover" src="/altegio-logo.png" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">Altegio</span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Marketplace</span>
                        </div>
                        <p className="mt-0.5 max-w-lg text-sm text-muted-foreground">
                          {locale === "ru"
                            ? "Синхронизация HiTeam с вашим салоном"
                            : "Sync HiTeam with your location"}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <a
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#22262c] px-4 text-sm font-semibold !text-white transition hover:bg-[#111418] [&_svg]:stroke-white"
                        href={buildAltegioMarketplaceConnectUrl() || "#"}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {locale === "ru" ? "Открыть в Altegio" : "Open in Altegio"}
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <AltegioPilotConnect />
                    </div>
                  </div>
                </div>
              )
            ) : null}

            <div className="organization-studio-identity">
              <div className="organization-studio-name-field">
                <div className="organization-studio-name-row">
                  <span
                    className="organization-studio-name-input-shell"
                    data-value={
                      draft.companyName ||
                      (locale === "ru" ? "Название организации" : "Organization name")
                    }
                  >
                    <Input
                      aria-label={locale === "ru" ? "Название организации" : "Organization name"}
                      className="organization-studio-name-input"
                      onChange={(e) => updateDraft("companyName", e.target.value)}
                      placeholder={locale === "ru" ? "Название организации" : "Organization name"}
                      readOnly={setupMode === "create-location"}
                      ref={companyNameInputRef}
                      required
                      size={1}
                      value={draft.companyName}
                    />
                  </span>
                  {setupMode !== "create-location" ? (
                    <button
                      aria-label={locale === "ru" ? "Редактировать название организации" : "Edit organization name"}
                      className="organization-studio-inline-icon"
                      onClick={() => companyNameInputRef.current?.focus()}
                      type="button"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
                <div className="organization-studio-meta-stack">
                  <span className="organization-studio-meta">
                    <Users className="h-4 w-4" />
                    {employeeCount} {locale === "ru" ? "сотрудников" : "employees"}
                  </span>
                  {setup.organizationId ? (
                    <button
                      aria-label={locale === "ru" ? "Скопировать ID организации" : "Copy organization ID"}
                      className="organization-studio-code"
                      onClick={() => void copyOrganizationId()}
                      type="button"
                    >
                      ID: <strong>{setup.organizationId}</strong>
                      <Copy className="organization-studio-code-icon h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="organization-studio-scope-actions">
                {companies.length > 1 ? (
                  <Select
                    onValueChange={handleCompanySelect}
                    value={selectedCompanyId}
                  >
                    <SelectTrigger className="organization-studio-scope-control">
                      <SelectValue
                        placeholder={
                          locale === "ru"
                            ? "Выберите организацию"
                            : "Select organization"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : companies[0] ? (
                  <div className="organization-studio-scope-control organization-studio-scope-control--static">
                    <span>{companies[0].name}</span>
                  </div>
                ) : null}

                <Button
                  className="organization-studio-header-action"
                  disabled={isCreatingCompany}
                  onClick={() => setCreateCompanyOpen(true)}
                  type="button"
                  variant="outline"
                >
                  {isCreatingCompany ? (
                    <>
                      <Swirling className="size-4" />
                      {locale === "ru" ? "Создаём…" : "Creating…"}
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      {locale === "ru" ? "Организация" : "Organization"}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="organization-studio-grid">
              <div className="organization-studio-sidebar">
                <section className="organization-studio-fieldset organization-studio-logo-field">
                  <span className="organization-studio-label">{locale === "ru" ? "Логотип" : "Logo"}</span>
                  <ImageAdjustField
                    applyLabel={locale === "ru" ? "Применить" : "Apply"}
                    cancelLabel={locale === "ru" ? "Отмена" : "Cancel"}
                    dialogDescription={locale === "ru"
                      ? "Подгони логотип: можно изменить масштаб и сдвиг по X/Y перед сохранением."
                      : "Adjust the logo: you can change scale and X/Y offset before saving."}
                    dialogTitle={locale === "ru" ? "Редактировать логотип" : "Edit logo"}
                    offsetXLabel={locale === "ru" ? "Сдвиг по X" : "Offset X"}
                    offsetYLabel={locale === "ru" ? "Сдвиг по Y" : "Offset Y"}
                    onChange={(nextLogoDataUrl) => {
                      updateDraft("companyLogoUrl", nextLogoDataUrl ?? "");
                      setError(null);
                    }}
                    onError={setError}
                    previewAlt={draft.companyName || "Logo"}
                    renderTrigger={({ chooseFile, fileName, openEditor, previewSrc }) => (
                      <div className="organization-studio-logo-trigger">
                        <button
                          className="org-logo-preview organization-studio-logo-preview"
                          onClick={openEditor}
                          type="button"
                        >
                          {previewSrc ? (
                            <img
                              alt={draft.companyName || "Logo"}
                              src={previewSrc}
                            />
                          ) : (
                            <ImagePlus className="h-8 w-8 text-muted-foreground/60" />
                          )}
                        </button>

                        <Button
                          className="organization-studio-logo-action"
                          onClick={chooseFile}
                          title={fileName || (locale === "ru" ? "Выбрать логотип" : "Choose logo")}
                          type="button"
                          variant="outline"
                        >
                          {locale === "ru" ? "Выбрать логотип" : "Choose logo"}
                        </Button>
                      </div>
                    )}
                    value={draft.companyLogoUrl || null}
                    zoomLabel={locale === "ru" ? "Масштаб" : "Scale"}
                  />
                </section>

                <section className="organization-studio-fieldset">
                  <div className="organization-studio-label-row">
                    <span className="organization-studio-label">
                      {locale === "ru" ? "Радиус геозоны, метры" : "Geofence radius, meters"}
                    </span>
                  </div>
                  <Input
                    className="organization-studio-radius-value"
                    onBlur={handleRadiusInputBlur}
                    onChange={(e) => handleRadiusInputChange(e.target.value)}
                    type="number"
                    value={radiusInput}
                  />
                  <div className="organization-studio-radius-row">
                    <Button
                      className="organization-studio-radius-button"
                      onClick={() => shiftRadius(-GEOFENCE_STEP_METERS)}
                      type="button"
                      variant="outline"
                    >
                      -{GEOFENCE_STEP_METERS}
                    </Button>
                    <input
                      className="organization-studio-range"
                      max={MAX_GEOFENCE_RADIUS_METERS}
                      min={MIN_GEOFENCE_RADIUS_METERS}
                      onChange={(event) => handleRadiusInputChange(event.target.value)}
                      step={GEOFENCE_STEP_METERS}
                      type="range"
                      value={draft.geofenceRadiusMeters}
                    />
                    <Button
                      className="organization-studio-radius-button"
                      onClick={() => shiftRadius(GEOFENCE_STEP_METERS)}
                      type="button"
                      variant="outline"
                    >
                      +{GEOFENCE_STEP_METERS}
                    </Button>
                  </div>
                  <div className="organization-studio-radius-caption">
                    <span>
                      {locale === "ru" ? "Минимум" : "Minimum"} {MIN_GEOFENCE_RADIUS_METERS} {locale === "ru" ? "м" : "m"}
                    </span>
                  </div>
                </section>

                <section className="organization-studio-fieldset">
                  <div className="organization-studio-label-row">
                    <span className="organization-studio-label">
                      {locale === "ru" ? "Часовой пояс" : "Time zone"}
                    </span>
                  </div>
                  <Select
                    onValueChange={(value) => updateDraft("timezone", value)}
                    value={draft.timezone}
                  >
                    <SelectTrigger className="org-timezone-trigger organization-studio-timezone-trigger">
                      <SelectValue placeholder="Select a time zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeZoneOptions.map((option) => (
                        <SelectItem key={option.timeZone} value={option.timeZone}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    className={`mt-4 w-full rounded-[22px] border px-4 py-3 text-left transition ${
                      draft.attendanceTrackingEnabled
                        ? "border-[color:var(--border)] bg-[color:var(--panel)]"
                        : "border-[#a7f3d0] bg-[#ecfdf5]"
                    }`}
                    onClick={() =>
                      updateDraft(
                        "attendanceTrackingEnabled",
                        !draft.attendanceTrackingEnabled,
                      )
                    }
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span className="font-heading text-sm font-semibold text-[color:var(--foreground)]">
                        {locale === "ru"
                          ? "Только задачи и чек-листы"
                          : "Tasks and checklists only"}
                      </span>
                      <span
                        className={`relative h-6 w-11 rounded-full transition ${
                          draft.attendanceTrackingEnabled
                            ? "bg-[color:var(--muted)]"
                            : "bg-emerald-500"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${
                            draft.attendanceTrackingEnabled
                              ? "left-1"
                              : "left-6"
                          }`}
                        />
                      </span>
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-[color:var(--muted-foreground)]">
                      {locale === "ru"
                        ? "Если включено, сотрудники работают без check in/out, смен, биометрии и рейтинга."
                        : "When enabled, employees work without check-in/out, shifts, biometrics, and leaderboard."}
                    </span>
                  </button>
                </section>

                {setupMode === "create-location" &&
                availableEmployees.length ? (
                  <section className="organization-studio-fieldset">
                    <div className="organization-studio-label-row">
                      <span className="organization-studio-label">
                        {locale === "ru"
                          ? "Сотрудники на этом адресе"
                          : "Employees at this address"}
                      </span>
                      <span
                        aria-label={
                          locale === "ru"
                            ? `Выбрано сотрудников: ${selectedEmployeeIds.length}`
                            : `Selected employees: ${selectedEmployeeIds.length}`
                        }
                        className="organization-studio-count-badge"
                      >
                        {selectedEmployeeIds.length}
                      </span>
                    </div>
                    <EmployeeDropdown
                      allEmployeesLabel={
                        locale === "ru" ? "Все сотрудники" : "All employees"
                      }
                      buttonClassName="organization-studio-employee-trigger"
                      employeeLabel={
                        locale === "ru" ? "Сотрудник" : "Employee"
                      }
                      employees={availableEmployees.map((employee) => ({
                        ...employee,
                        group: groupByEmployeeId.get(employee.id) ?? null,
                        roleLabel:
                          employee.primaryLocation?.name ??
                          (locale === "ru" ? "Без адреса" : "No address"),
                      }))}
                      groupBy="group"
                      groupFallbackLabel={
                        locale === "ru" ? "Без группы" : "Without group"
                      }
                      loadingLabel={
                        locale === "ru"
                          ? "Загружаем сотрудников"
                          : "Loading employees"
                      }
                      mode="multiple"
                      noEmployeesLabel={
                        locale === "ru"
                          ? "Сотрудники не найдены."
                          : "No employees found."
                      }
                      onSelectedEmployeeIdsChange={setSelectedEmployeeIds}
                      placeholder={
                        locale === "ru"
                          ? "Выберите сотрудников"
                          : "Select employees"
                      }
                      searchPlaceholder={
                        locale === "ru"
                          ? "Поиск сотрудника"
                          : "Search employee"
                      }
                      selectedEmployeeIds={selectedEmployeeIds}
                      selectedEmployeesLabel={(count) =>
                        locale === "ru"
                          ? `${count} сотрудников выбрано`
                          : `${count} employees selected`
                      }
                    />
                  </section>
                ) : null}
              </div>

              <div className="organization-studio-main">
                {setupMode !== "create" ? (
                  <label className="organization-studio-fieldset">
                    <span className="organization-studio-label">
                      {locale === "ru" ? "Название локации" : "Location name"}
                    </span>
                    <Input
                      className="h-11 rounded-2xl bg-[color:var(--panel)]"
                      onChange={(event) =>
                        updateDraft("locationName", event.target.value)
                      }
                      placeholder={
                        locale === "ru" ? "Например, Центральный офис" : "For example, Central office"
                      }
                      value={draft.locationName}
                    />
                  </label>
                ) : null}
                <div className="organization-studio-map-shell">
                  <LocationMapPicker
                    address={draft.address}
                    apiKey={apiKey}
                    geofenceRadiusMeters={draft.geofenceRadiusMeters}
                    latitude={draft.latitude}
                    locale={locale}
                    longitude={draft.longitude}
                    mode="setup"
                    onConfirmationRequiredChange={setLocationConfirmationPending}
                    onConfirmedSelect={persistConfirmedLocation}
                    searchPlaceholder={locale === "ru"
                      ? "Красный проспект, 24, Новосибирск"
                      : "1600 Amphitheatre Parkway, Mountain View"}
                    searchTrailingContent={selectedCompanyId ? (
                      <Select
                        onValueChange={handleLocationSelect}
                        value={selectedLocationId}
                      >
                        <SelectTrigger
                          aria-label={
                            locale === "ru"
                              ? "Выбрать сохранённый адрес"
                              : "Select saved address"
                          }
                          className="organization-studio-address-switcher-trigger"
                          title={
                            selectedHeaderLocation?.address ||
                            (locale === "ru"
                              ? "Выбрать сохранённый адрес"
                              : "Select saved address")
                          }
                        >
                          <span className="sr-only">
                            {locale === "ru"
                              ? "Выбрать сохранённый адрес"
                              : "Select saved address"}
                          </span>
                        </SelectTrigger>
                        <SelectContent
                          align="end"
                          className="organization-studio-location-menu"
                        >
                          {companyLocations.length > 0 ? (
                            companyLocations.map((location) => (
                              <SelectItem
                                className="organization-studio-location-option"
                                key={location.id}
                                value={location.id}
                              >
                                <SelectOptionContent className="items-start">
                                  <SelectOptionText className="gap-1">
                                    <SelectOptionTitle>
                                      {getLocationAddressLabel(location)}
                                    </SelectOptionTitle>
                                    <SelectOptionDescription>
                                      {location.address || location.name}
                                    </SelectOptionDescription>
                                  </SelectOptionText>
                                </SelectOptionContent>
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem disabled value="__no_saved_locations__">
                              {locale === "ru"
                                ? "Сохранённых адресов пока нет"
                                : "No saved addresses yet"}
                            </SelectItem>
                          )}
                          <SelectItem value={ADD_LOCATION_SELECT_VALUE}>
                            <span className="inline-flex items-center gap-2 font-semibold text-[color:var(--accent)]">
                              <Plus className="size-4" />
                              {locale === "ru" ? "Добавить локацию" : "Add location"}
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : null}
                    searchLabel={
                      locale === "ru" ? "Адрес организации" : "Organization address"
                    }
                    showCopy={false}
                    onSelect={handleMapSelect}
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            className={`organization-studio-submit transition-all duration-300 ${
              saveSuccess
                ? "bg-emerald-600 text-white hover:bg-emerald-600"
                : ""
            }`}
            disabled={isSaving}
            size="lg"
            type="submit"
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Swirling className="h-4 w-4" />
                {setupMode === "create-location"
                  ? locale === "ru" ? "Добавляем локацию" : "Adding location"
                  : locale === "ru" ? "Сохраняем организацию" : "Saving organization"}
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 animate-in zoom-in-50 duration-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {lastSavedMode === "create"
                  ? locale === "ru" ? "Организация добавлена" : "Organization added"
                  : lastSavedMode === "create-location"
                    ? locale === "ru" ? "Локация добавлена" : "Location added"
                  : locale === "ru" ? "Организация сохранена" : "Organization saved"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {setupMode === "create"
                  ? locale === "ru" ? "Добавить организацию" : "Add organization"
                  : setupMode === "create-location"
                    ? locale === "ru" ? "Добавить локацию" : "Add location"
                  : locale === "ru" ? "Сохранить организацию" : "Save organization"}
              </span>
            )}
          </Button>
        </form>
        <Dialog open={createCompanyOpen} onOpenChange={setCreateCompanyOpen}>
          <DialogContent className="max-w-[520px]">
            <DialogHeader>
              <DialogTitle>
                {locale === "ru"
                  ? "Добавить организацию"
                  : "Add organization"}
              </DialogTitle>
              <DialogDescription>
                {locale === "ru"
                  ? "Создайте организацию, затем добавьте её первый рабочий адрес."
                  : "Create the organization, then add its first work address."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-2 py-2">
              <label
                className="text-sm font-semibold text-[color:var(--foreground)]"
                htmlFor="new-company-name"
              >
                {locale === "ru" ? "Название" : "Name"}
              </label>
              <Input
                autoFocus
                id="new-company-name"
                onChange={(event) => setNewCompanyName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void submitCreateCompany();
                  }
                }}
                placeholder={
                  locale === "ru"
                    ? "Название организации"
                    : "Organization name"
                }
                value={newCompanyName}
              />
            </div>
            <DialogFooter>
              <Button
                disabled={isCreatingCompany || !newCompanyName.trim()}
                onClick={() => void submitCreateCompany()}
                type="button"
              >
                {isCreatingCompany
                  ? locale === "ru"
                    ? "Создаём…"
                    : "Creating…"
                  : locale === "ru"
                    ? "Создать"
                    : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminShell>
  );
}
