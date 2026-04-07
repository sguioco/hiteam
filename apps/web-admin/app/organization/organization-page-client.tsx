"use client";

import { FormEvent, useMemo, useEffect, useRef, useState } from "react";
import { Check, ImagePlus, Users, Save } from "lucide-react";
import { AdminShell } from "../../components/admin-shell";
import { ImageAdjustField } from "../../components/image-adjust-field";
import {
  LocationAddressDetails,
  LocationMapPicker,
  LocationSelection,
} from "../../components/location-map-picker";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { apiRequest } from "../../lib/api";
import { getSession } from "../../lib/auth";
import { useI18n } from "../../lib/i18n";

type Company = {
  code?: string;
  id: string;
  googlePlaceId?: string | null;
  logoUrl?: string | null;
  name: string;
};

type Location = {
  address: string;
  geofenceRadiusMeters?: number;
  latitude?: number;
  longitude?: number;
  timezone: string;
};

type OrganizationSetupResponse = {
  company: Company | null;
  configured: boolean;
  defaultGeofenceRadiusMeters: number;
  location: Location | null;
};

type SetupDraft = {
  address: string;
  companyLogoUrl: string;
  companyName: string;
  details: LocationAddressDetails | null;
  geofenceRadiusMeters: number;
  googlePlaceId: string;
  latitude: string;
  longitude: string;
  timezone: string;
};

type SetupMode = "create" | "update";
type TimeZonePreset = {
  address: string;
  latitude: string;
  longitude: string;
};

const MIN_GEOFENCE_RADIUS_METERS = 100;
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
  company: null,
  configured: false,
  defaultGeofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS,
  location: null,
};
const ORGANIZATION_UPDATED_EVENT = "smart:organization-updated";

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

function createEmptyDraft(): SetupDraft {
  const detectedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  return {
    address: "", companyLogoUrl: "", companyName: "", details: null,
    geofenceRadiusMeters: DEFAULT_GEOFENCE_RADIUS_METERS, googlePlaceId: "",
    latitude: "", longitude: "", timezone: detectedTimeZone,
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
    latitude: typeof setup.location?.latitude === "number" ? String(setup.location.latitude) : "",
    longitude: typeof setup.location?.longitude === "number" ? String(setup.location.longitude) : "",
    timezone: setup.location?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

function hasDraftCoordinates(draft: SetupDraft) {
  return draft.latitude.trim() !== "" && draft.longitude.trim() !== "";
}

export type OrganizationPageInitialData = {
  employeeCount: number;
  setup: OrganizationSetupResponse;
};

export default function OrganizationPageClient({
  initialData,
}: {
  initialData?: OrganizationPageInitialData | null;
}) {
  const { locale } = useI18n();
  const [setup, setSetup] = useState<OrganizationSetupResponse>(
    initialData?.setup ?? EMPTY_SETUP,
  );
  const [employeeCount, setEmployeeCount] = useState(initialData?.employeeCount ?? 0);
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
  const [setupMode, setSetupMode] = useState<SetupMode>(
    initialData?.setup.configured ? "update" : "create",
  );
  const successTimeoutRef = useRef<number | null>(null);
  const didUseInitialData = useRef(Boolean(initialData));

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const timeZoneOptions = useMemo(() => buildTimeZoneOptions(draft.timezone), [draft.timezone]);
  const timeZonePreset = useMemo(() => TIME_ZONE_PRESETS[getTimeZoneOffsetLabel(draft.timezone)] ?? null, [draft.timezone]);

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
      setEmployeeCount(snapshot.employeeCount);
      setDraft(buildDraftFromSetup(snapshot.setup));
      setRadiusInput(String(normalizeRadius(snapshot.setup.location?.geofenceRadiusMeters ?? snapshot.setup.defaultGeofenceRadiusMeters)));
      setError(null);
      setSaveSuccess(false);
      setSetupMode(snapshot.setup.configured ? "update" : "create");
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

    try {
      setIsSaving(true); setError(null); setSaveSuccess(false);
      const nextSetup = await apiRequest<OrganizationSetupResponse>("/org/setup", {
        method: "POST", token: session.accessToken,
        body: JSON.stringify({
          mode: setupMode, address: draft.address.trim(), companyLogoUrl: draft.companyLogoUrl || undefined,
          companyName: draft.companyName.trim(), geofenceRadiusMeters: normalizeRadius(draft.geofenceRadiusMeters),
          googlePlaceId: draft.googlePlaceId || undefined, latitude: Number(draft.latitude), longitude: Number(draft.longitude),
          timezone: draft.timezone.trim() || "UTC",
        }),
      });
      setSetup(nextSetup);
      setDraft(buildDraftFromSetup(nextSetup));
      setRadiusInput(String(normalizeRadius(nextSetup.location?.geofenceRadiusMeters ?? nextSetup.defaultGeofenceRadiusMeters)));
      setSetupMode(nextSetup.configured ? "update" : "create");
      window.dispatchEvent(
        new CustomEvent(ORGANIZATION_UPDATED_EVENT, {
          detail: {
            company: nextSetup.company,
            configured: nextSetup.configured,
          },
        }),
      );
      setSaveSuccess(true);
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
      <div className="organization-studio-page mx-auto w-full max-w-6xl px-6 py-10 md:px-10 md:py-12 animate-in fade-in duration-500">
        <form className="organization-studio" onSubmit={(event) => void handleSetupSubmit(event)}>
          {error ? (
            <div className="organization-studio-feedback organization-studio-feedback--error">
              {error}
            </div>
          ) : null}

          <div className="organization-studio-identity">
            <label className="organization-studio-name-field">
              <span className="organization-studio-label">
                {locale === "ru" ? "Название организации" : "Organization name"}
              </span>
              <Input
                className="organization-studio-name-input"
                onChange={(e) => updateDraft("companyName", e.target.value)}
                placeholder={locale === "ru" ? "Название организации" : "Organization name"}
                required
                value={draft.companyName}
              />
              <div className="organization-studio-meta-stack">
                <span className="organization-studio-meta">
                  <Users className="h-4 w-4" />
                  {employeeCount} {locale === "ru" ? "сотрудников" : "employees"}
                </span>
                {setup.company?.code ? (
                  <span className="organization-studio-code">
                    {locale === "ru" ? "Код компании:" : "Company code:"} <strong>{setup.company.code}</strong>
                  </span>
                ) : null}
              </div>
            </label>
          </div>

          <div className="organization-studio-grid">
            <div className="organization-studio-sidebar">
              <section className="organization-studio-fieldset organization-studio-logo-field">
                <span className="organization-studio-label">{locale === "ru" ? "Логотип" : "Logo"}</span>
                <ImageAdjustField
                  dialogDescription={locale === "ru"
                    ? "Подгони логотип: можно изменить масштаб и сдвиг по X/Y перед сохранением."
                    : "Adjust the logo: you can change scale and X/Y offset before saving."}
                  dialogTitle={locale === "ru" ? "Редактировать логотип" : "Edit logo"}
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
              </section>
            </div>

            <div className="organization-studio-main">
              <div className="organization-studio-map-copy">
                <span className="organization-studio-label">
                  {locale === "ru" ? "Адрес организации" : "Organization address"}
                </span>
              </div>
              <div className="organization-studio-map-shell">
                <LocationMapPicker
                  address={draft.address}
                  apiKey={apiKey}
                  geofenceRadiusMeters={draft.geofenceRadiusMeters}
                  latitude={draft.latitude}
                  longitude={draft.longitude}
                  mode="setup"
                  searchLabel=""
                  searchPlaceholder={locale === "ru"
                    ? "Красный проспект, 24, Новосибирск"
                    : "1600 Amphitheatre Parkway, Mountain View"}
                  showCopy={false}
                  onSelect={handleMapSelect}
                />
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
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground/20" />
                {locale === "ru" ? "Сохраняем организацию" : "Saving organization"}
              </span>
            ) : saveSuccess ? (
              <span className="flex items-center gap-2">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/20 animate-in zoom-in-50 duration-300">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {setupMode === "create"
                  ? locale === "ru" ? "Организация добавлена" : "Organization added"
                  : locale === "ru" ? "Организация сохранена" : "Organization saved"}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {setupMode === "create"
                  ? locale === "ru" ? "Добавить организацию" : "Add organization"
                  : locale === "ru" ? "Сохранить организацию" : "Save organization"}
              </span>
            )}
          </Button>
        </form>
      </div>
    </AdminShell>
  );
}
