"use client";

import { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Check, ChevronDown, Globe, Loader2, Mail, ShieldCheck, ZoomIn } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toAdminHref } from "@/lib/admin-routes";
import { AuthSession, persistSession, saveTenantSlug } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AppSelectField } from "@/components/ui/select";
import { Locale, useI18n } from "@/lib/i18n";
import { getRuntimeLocale } from "@/lib/runtime-locale";
import type { PublicInvitationPayload } from "../../invitation-types";

type CountryCodeOption = {
  id: string;
  code: string;
  label: string;
  searchText: string;
};

const LANGUAGE_OPTIONS: Array<{ code: Locale; label: string }> = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
];

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { id: "ru-kz", code: "+7", label: "Russia / Kazakhstan", searchText: "russia kazakhstan ru kz" },
  { id: "us-ca", code: "+1", label: "United States / Canada", searchText: "united states canada us ca" },
  { id: "uk", code: "+44", label: "United Kingdom", searchText: "united kingdom uk britain england" },
  { id: "de", code: "+49", label: "Germany", searchText: "germany deutschland de" },
  { id: "es", code: "+34", label: "Spain", searchText: "spain espana es" },
  { id: "fr", code: "+33", label: "France", searchText: "france fr" },
  { id: "it", code: "+39", label: "Italy", searchText: "italy it italia" },
  { id: "pl", code: "+48", label: "Poland", searchText: "poland polska pl" },
  { id: "pt", code: "+351", label: "Portugal", searchText: "portugal pt" },
  { id: "tr", code: "+90", label: "Turkey", searchText: "turkey turkiye tr" },
  { id: "th", code: "+66", label: "Thailand", searchText: "thailand th" },
  { id: "vn", code: "+84", label: "Vietnam", searchText: "vietnam vn" },
  { id: "ae", code: "+971", label: "United Arab Emirates", searchText: "united arab emirates uae ae dubai abu dhabi" },
  { id: "sa", code: "+966", label: "Saudi Arabia", searchText: "saudi arabia sa" },
  { id: "qa", code: "+974", label: "Qatar", searchText: "qatar qa" },
  { id: "eg", code: "+20", label: "Egypt", searchText: "egypt eg" },
  { id: "uz", code: "+998", label: "Uzbekistan", searchText: "uzbekistan uz" },
];

function splitPhoneNumber(rawPhone?: string | null) {
  const normalized = (rawPhone ?? "").trim();
  if (!normalized) {
    return { countryOptionId: "ru-kz", countryCode: "+7", nationalNumber: "" };
  }

  const match = COUNTRY_CODE_OPTIONS
    .slice()
    .sort((left, right) => right.code.length - left.code.length)
    .find((option) => normalized.startsWith(option.code));

  if (!match) {
    return {
      countryOptionId: "",
      countryCode: normalized.match(/^\+\d{1,4}/)?.[0] ?? "+7",
      nationalNumber: normalized.replace(/^\+\d{1,4}\s*/, ""),
    };
  }

  return {
    countryOptionId: match.id,
    countryCode: match.code,
    nationalNumber: normalized.slice(match.code.length).trim(),
  };
}

function normalizeCountryCode(rawValue: string) {
  const digits = rawValue.replace(/[^\d]/g, "").slice(0, 4);
  return digits ? `+${digits}` : "+";
}

function findCountryOptionIdByCode(countryCode: string) {
  return COUNTRY_CODE_OPTIONS.find((option) => option.code === countryCode)?.id ?? "";
}

function isExistingManagerAccountError(message: string) {
  return /already used|already registered|уже использован|уже зарегистрирован/i.test(message);
}

async function compressImageToDataUrl(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<string> {
  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(new Error(getRuntimeLocale() === "ru" ? "Не удалось прочитать файл." : "Failed to read the file."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () =>
      reject(new Error(getRuntimeLocale() === "ru" ? "Не удалось обработать изображение." : "Failed to process the image."));
    nextImage.src = sourceDataUrl;
  });

  const maxSide = options?.maxSide ?? 960;
  const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(getRuntimeLocale() === "ru" ? "Не удалось подготовить изображение." : "Failed to prepare the image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", options?.quality ?? 0.82);
  if (compressed.length > 7_000_000) {
    throw new Error(getRuntimeLocale() === "ru" ? "Фото слишком большое. Выбери изображение поменьше." : "The photo is too large. Choose a smaller image.");
  }

  return compressed;
}

async function resizeDataUrl(
  sourceDataUrl: string,
  options: { maxSide: number; quality?: number },
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () =>
      reject(new Error(getRuntimeLocale() === "ru" ? "Не удалось обработать изображение." : "Failed to process the image."));
    nextImage.src = sourceDataUrl;
  });

  const scale = Math.min(1, options.maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(getRuntimeLocale() === "ru" ? "Не удалось подготовить изображение." : "Failed to prepare the image.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return canvas.toDataURL("image/jpeg", options.quality ?? 0.8);
}

async function renderAvatarPreviewDataUrl(
  sourceDataUrl: string,
  options: { zoom: number; offsetX: number; offsetY: number; canvasSize?: number; quality?: number },
): Promise<string> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () =>
      reject(new Error(getRuntimeLocale() === "ru" ? "Не удалось обработать изображение." : "Failed to process the image."));
    nextImage.src = sourceDataUrl;
  });

  const canvasSize = options.canvasSize ?? 300;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error(getRuntimeLocale() === "ru" ? "Не удалось подготовить превью." : "Failed to prepare the preview.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvasSize, canvasSize);

  const coverScale = Math.max(canvasSize / image.width, canvasSize / image.height) * options.zoom;
  const drawWidth = image.width * coverScale;
  const drawHeight = image.height * coverScale;
  const translateFactor = canvasSize / 360;
  const drawX = (canvasSize - drawWidth) / 2 + options.offsetX * translateFactor;
  const drawY = (canvasSize - drawHeight) / 2 + options.offsetY * translateFactor;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  return canvas.toDataURL("image/jpeg", options.quality ?? 0.82);
}

function LanguagePicker({ locale, setLocale }: { locale: Locale; setLocale: (locale: Locale) => void }) {
  const current = LANGUAGE_OPTIONS.find((item) => item.code === locale) ?? LANGUAGE_OPTIONS[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {LANGUAGE_OPTIONS.map((item) => (
          <DropdownMenuItem
            key={item.code}
            className={item.code === locale ? "font-semibold" : undefined}
            onClick={() => setLocale(item.code)}
          >
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ManagerJoinPageClientProps = {
  initialError?: string | null;
  initialInvitation: PublicInvitationPayload | null;
  token: string;
};

export default function ManagerJoinPageClient({
  initialError = null,
  initialInvitation,
  token,
}: ManagerJoinPageClientProps) {
  const router = useRouter();
  const { locale, setLocale } = useI18n();
  const [invitation] = useState<PublicInvitationPayload | null>(initialInvitation);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarSourceDataUrl, setAvatarSourceDataUrl] = useState<string | null>(null);
  const [avatarPreviewDataUrl, setAvatarPreviewDataUrl] = useState<string | null>(null);
  const [avatarFileName, setAvatarFileName] = useState<string>("");
  const [avatarDragging, setAvatarDragging] = useState(false);
  const initialPhone = splitPhoneNumber(initialInvitation?.phone);
  const [form, setForm] = useState({
    password: "",
    firstName: initialInvitation?.firstName ?? "",
    lastName: initialInvitation?.lastName ?? "",
    middleName: "",
    birthDate: "",
    gender: "male",
    phone: initialPhone.nationalNumber,
  });
  const [countryOptionId, setCountryOptionId] = useState(initialPhone.countryOptionId);
  const [countryCode, setCountryCode] = useState(initialPhone.countryCode);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const selectedCountryOption = COUNTRY_CODE_OPTIONS.find((option) => option.id === countryOptionId) ?? null;
  const countryPickerRef = useRef<HTMLDivElement | null>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartPointRef = useRef<{ x: number; y: number } | null>(null);
  const dragStartOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragPendingOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragFrameRef = useRef<number | null>(null);
  const avatarEditorValuesRef = useRef({ zoom: 1, offsetX: 0, offsetY: 0 });
  const avatarEditorImageRef = useRef<HTMLImageElement | null>(null);
  const zoomRangeRef = useRef<HTMLInputElement | null>(null);
  const offsetXRangeRef = useRef<HTMLInputElement | null>(null);
  const offsetYRangeRef = useRef<HTMLInputElement | null>(null);
  const textFieldClassName = "h-11 rounded-md border-[rgba(24,24,27,0.12)] bg-white px-3 py-2 text-sm shadow-[0_0_0_0_rgba(15,23,42,0.04)] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
  const requiredMark = <span className="ml-1 text-[color:var(--destructive)]">*</span>;
  const filteredCountryOptions = useMemo(() => {
    const normalizedSearch = countrySearch.trim().toLowerCase();
    if (!normalizedSearch) {
      return COUNTRY_CODE_OPTIONS;
    }

    return COUNTRY_CODE_OPTIONS.filter((option) => {
      const haystack = `${option.label} ${option.code} ${option.searchText}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [countrySearch]);

  useEffect(() => {
    if (!countryMenuOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!countryPickerRef.current?.contains(event.target as Node)) {
        setCountryMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCountryMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [countryMenuOpen]);

  function applyAvatarTransform() {
    const image = avatarEditorImageRef.current;
    if (!image) return;

    const { zoom, offsetX, offsetY } = avatarEditorValuesRef.current;
    image.style.transform = `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), 0) scale(${zoom})`;
  }

  function scheduleAvatarTransform() {
    if (dragFrameRef.current !== null) {
      return;
    }

    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null;
      applyAvatarTransform();
    });
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setAvatarDataUrl(null);
      setAvatarSourceDataUrl(null);
      setAvatarPreviewDataUrl(null);
      setAvatarFileName("");
      return;
    }

    try {
      const nextDataUrl = await compressImageToDataUrl(file, {
        maxSide: 420,
        quality: 0.78,
      });
      setError(null);
      setAvatarDataUrl(
        await resizeDataUrl(nextDataUrl, {
          maxSide: 300,
          quality: 0.8,
        }),
      );
      setAvatarSourceDataUrl(nextDataUrl);
      setAvatarPreviewDataUrl(nextDataUrl);
      setAvatarFileName(file.name);
      avatarEditorValuesRef.current = { zoom: 1, offsetX: 0, offsetY: 0 };
      dragPendingOffsetRef.current = { x: 0, y: 0 };
      setAvatarEditorOpen(true);
    } catch (avatarError) {
      setAvatarDataUrl(null);
      setAvatarSourceDataUrl(null);
      setAvatarPreviewDataUrl(null);
      setAvatarFileName("");
      setError(avatarError instanceof Error ? avatarError.message : "Не удалось подготовить фото.");
    }
  }

  async function handleApplyAvatarEditor() {
    if (!avatarSourceDataUrl) return;

    try {
      const nextPreview = await renderAvatarPreviewDataUrl(avatarSourceDataUrl, {
        zoom: avatarEditorValuesRef.current.zoom,
        offsetX: avatarEditorValuesRef.current.offsetX,
        offsetY: avatarEditorValuesRef.current.offsetY,
        canvasSize: 300,
        quality: 0.82,
      });
      setAvatarPreviewDataUrl(nextPreview);
      setAvatarDataUrl(nextPreview);
      setAvatarEditorOpen(false);
      setError(null);
    } catch (avatarError) {
      setError(avatarError instanceof Error ? avatarError.message : "Не удалось применить превью.");
    }
  }

  function handleAvatarPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!avatarSourceDataUrl) return;
    dragPointerIdRef.current = event.pointerId;
    dragStartPointRef.current = { x: event.clientX, y: event.clientY };
    dragStartOffsetRef.current = {
      x: avatarEditorValuesRef.current.offsetX,
      y: avatarEditorValuesRef.current.offsetY,
    };
    setAvatarDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleAvatarPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId || !dragStartPointRef.current) {
      return;
    }

    const deltaX = event.clientX - dragStartPointRef.current.x;
    const deltaY = event.clientY - dragStartPointRef.current.y;
    dragPendingOffsetRef.current = {
      x: Math.round(dragStartOffsetRef.current.x + deltaX),
      y: Math.round(dragStartOffsetRef.current.y + deltaY),
    };
    avatarEditorValuesRef.current.offsetX = dragPendingOffsetRef.current.x;
    avatarEditorValuesRef.current.offsetY = dragPendingOffsetRef.current.y;
    if (offsetXRangeRef.current) offsetXRangeRef.current.value = String(dragPendingOffsetRef.current.x);
    if (offsetYRangeRef.current) offsetYRangeRef.current.value = String(dragPendingOffsetRef.current.y);
    scheduleAvatarTransform();
  }

  function handleAvatarPointerEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    dragPointerIdRef.current = null;
    dragStartPointRef.current = null;
    setAvatarDragging(false);

    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
      avatarEditorValuesRef.current.offsetX = dragPendingOffsetRef.current.x;
      avatarEditorValuesRef.current.offsetY = dragPendingOffsetRef.current.y;
      applyAvatarTransform();
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  useEffect(() => {
    if (!avatarEditorOpen) return;

    const { zoom, offsetX, offsetY } = avatarEditorValuesRef.current;
    if (zoomRangeRef.current) zoomRangeRef.current.value = String(zoom);
    if (offsetXRangeRef.current) offsetXRangeRef.current.value = String(offsetX);
    if (offsetYRangeRef.current) offsetYRangeRef.current.value = String(offsetY);
    applyAvatarTransform();
  }, [avatarEditorOpen, avatarSourceDataUrl]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invitation) return;

    setError(null);
    setSuccess(null);

    if (!avatarDataUrl) {
      setError(
        locale === "ru"
          ? "Добавьте фото профиля"
          : "Add a profile photo",
      );
      return;
    }

    setSubmitting(true);

    try {
      const registration = await apiRequest<{ accessGranted?: boolean }>(`/employees/invitations/public/${token}/register`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: `${normalizeCountryCode(countryCode)} ${form.phone.trim()}`.trim(),
          avatarDataUrl: avatarDataUrl ?? undefined,
        }),
      });

      if (registration.accessGranted === false) {
        setSuccess(
          locale === "ru"
            ? "Профиль сохранён. Войдите в систему после подтверждения доступа."
            : "Profile saved. Sign in after your access is approved.",
        );
        setTimeout(() => router.replace(`/login?tenant=${encodeURIComponent(invitation.tenantSlug)}`), 900);
        return;
      }

      let session: AuthSession;
      try {
        session = await apiRequest<AuthSession>(`/auth/login`, {
          method: "POST",
          realBackend: true,
          body: JSON.stringify({
            tenantSlug: invitation.tenantSlug,
            email: invitation.email,
            password: form.password,
          }),
        });
      } catch {
        setSuccess(
          locale === "ru"
            ? "Профиль создан. Откроем обычный вход, чтобы вы завершили настройку без повторного заполнения формы."
            : "Profile created. Opening the regular sign-in so you can finish setup without filling the form again.",
        );
        setTimeout(() => router.replace(`/login?tenant=${encodeURIComponent(invitation.tenantSlug)}`), 900);
        return;
      }

      await persistSession(session);
      saveTenantSlug(invitation.tenantSlug);
      setSuccess(
        locale === "ru"
          ? "Профиль создан. Перенаправляем в настройки организации."
          : "Profile created. Redirecting to organization settings.",
      );
      setTimeout(() => router.replace(toAdminHref("/organization")), 600);
    } catch (submitError) {
      const fallbackMessage =
        locale === "ru"
          ? "Произошла ошибка при настройке."
          : "An error occurred during setup.";
      const nextMessage =
        submitError instanceof Error ? submitError.message : fallbackMessage;

      setError(
        isExistingManagerAccountError(nextMessage)
          ? locale === "ru"
            ? "Аккаунт уже создан. Войдите в систему и завершите настройку организации."
            : "The account has already been created. Sign in to finish organization setup."
          : nextMessage,
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !invitation) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-bold">
            {locale === "ru" ? "Приглашение недоступно" : "Invitation unavailable"}
          </h1>
          <p className="mt-3 text-sm text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  if (!invitation) return null;

  if (invitation.registrationCompleted) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-bold">
            {locale === "ru" ? "Аккаунт уже создан" : "Account already created"}
          </h1>
          <p className="mt-3 text-sm text-gray-500">
            {locale === "ru"
              ? `Для ${invitation.email} аккаунт уже создан. Войдите в систему и завершите настройку организации.`
              : `The account for ${invitation.email} has already been created. Sign in to finish organization setup.`}
          </p>
          <Link
            className="solid-button mt-6 inline-flex"
            href={`/login?tenant=${encodeURIComponent(invitation.tenantSlug)}`}
          >
            {locale === "ru" ? "Войти" : "Sign in"}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-6xl flex-col gap-6">
        <div className="flex items-center justify-center font-medium">
          <BrandWordmark className="text-[2.25rem] leading-none md:text-[2.6rem]" />
        </div>

        <Card className="gap-0 overflow-hidden border-border/40 py-0 shadow-lg">
          <CardContent className="grid gap-0 bg-[linear-gradient(135deg,rgba(37,99,235,0.10)_0%,rgba(255,255,255,0.96)_38%,rgba(255,255,255,0.94)_62%,rgba(79,70,229,0.08)_100%)] p-0 lg:grid-cols-[minmax(320px,0.92fr)_minmax(0,1.18fr)]">
            <section className="border-b border-border/30 bg-transparent p-6 lg:border-b-0 lg:border-r lg:border-r-border/30">
              <div className="mx-auto flex h-full max-w-[360px] flex-col justify-between gap-6">
                <div className="space-y-4">
                  <div className="text-center">
                    <h1 className="text-[2rem] font-light tracking-[-0.04em] text-foreground">
                      {locale === "ru" ? "Настройка организации" : "Organization setup"}
                    </h1>
                    <p className="mx-auto mt-3 max-w-[420px] text-sm leading-6 text-muted-foreground">
                      {locale === "ru"
                        ? "Сначала создайте профиль менеджера. Сразу после этого вы попадёте в настройки организации, где зададите название, логотип, адрес, точку на карте и радиус."
                        : "First create the manager profile. Right after that you will land in organization settings, where you can set the name, logo, address, map point, and radius."}
                    </p>
                  </div>

                  <div className="rounded-[24px] border border-border/60 bg-white/85 p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                      {invitation.companyName ?? invitation.tenantName}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="h-4 w-4" />
                      {locale === "ru" ? "Код компании:" : "Company code:"}{" "}
                      <strong className="text-foreground">{invitation.companyCode ?? "—"}</strong>
                    </div>
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {invitation.email}
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      {success}
                    </div>
                  ) : null}
                </div>

                <div className="hidden rounded-[24px] border border-border/60 bg-white/70 p-4 text-sm text-muted-foreground lg:block">
                  {locale === "ru"
                    ? "Название организации, логотип, адрес и георадиус можно настроить сразу после завершения этого шага."
                    : "You can configure the organization name, logo, address, and geofence right after this step."}
                </div>
              </div>
            </section>

            <section className="bg-transparent p-6 lg:p-7">
              <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="manager-email" className="text-sm font-medium">Email</label>
                  <Input className={textFieldClassName} id="manager-email" disabled value={invitation.email} />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-password" className="text-sm font-medium">{locale === "ru" ? "Пароль" : "Password"}{requiredMark}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-password"
                    required
                    minLength={8}
                    type="password"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-first-name" className="text-sm font-medium">{locale === "ru" ? "Имя" : "First name"}{requiredMark}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-first-name"
                    required
                    value={form.firstName}
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-last-name" className="text-sm font-medium">{locale === "ru" ? "Фамилия" : "Last name"}{requiredMark}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-last-name"
                    required
                    value={form.lastName}
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="manager-middle-name" className="text-sm font-medium">{locale === "ru" ? "Отчество" : "Middle name"}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-middle-name"
                    value={form.middleName}
                    onChange={(event) => setForm((current) => ({ ...current, middleName: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-birth-date" className="text-sm font-medium">{locale === "ru" ? "Дата рождения" : "Date of birth"}{requiredMark}</label>
                  <DateOfBirthField
                    value={form.birthDate}
                    onChange={(nextValue) =>
                      setForm((current) => ({ ...current, birthDate: nextValue }))
                    }
                    triggerClassName="h-11 rounded-md"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-gender" className="text-sm font-medium">{locale === "ru" ? "Пол" : "Gender"}{requiredMark}</label>
                  <AppSelectField
                    value={form.gender}
                    onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
                    options={[
                      { value: "male", label: locale === "ru" ? "Мужской" : "Male" },
                      { value: "female", label: locale === "ru" ? "Женский" : "Female" },
                    ]}
                    triggerClassName="h-11 rounded-md"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="manager-phone" className="text-sm font-medium">{locale === "ru" ? "Телефон" : "Phone"}{requiredMark}</label>
                  <div className="relative flex h-11 rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                    <div ref={countryPickerRef} className="relative w-[220px] shrink-0 border-r border-input">
                      <button
                        type="button"
                        aria-expanded={countryMenuOpen}
                        aria-haspopup="listbox"
                        className="flex h-full w-full items-center justify-between gap-2 bg-transparent px-3 text-left text-sm outline-none"
                        onClick={() => {
                          setCountryMenuOpen((current) => !current);
                          setCountrySearch("");
                        }}
                      >
                        <span className="truncate text-xs">
                          {selectedCountryOption?.label ?? ""}
                        </span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>

                      {countryMenuOpen ? (
                        <div className="absolute left-0 top-[calc(100%+8px)] z-30 w-[320px] rounded-[24px] border border-border bg-popover p-2 shadow-xl">
                          <div className="px-1 pb-2">
                            <Input
                              value={countrySearch}
                              onChange={(event) => setCountrySearch(event.target.value)}
                              placeholder={locale === "ru" ? "Поиск страны" : "Search country"}
                              className="h-10"
                              autoFocus
                            />
                          </div>

                          <div className="max-h-64 overflow-y-auto px-1">
                            {filteredCountryOptions.length ? (
                              filteredCountryOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  className="flex w-full items-center justify-between gap-3 rounded-[18px] px-3 py-2 text-left text-sm transition hover:bg-accent/60"
                                  onClick={() => {
                                    setCountryOptionId(option.id);
                                    setCountryCode(option.code);
                                    setCountryMenuOpen(false);
                                    setCountrySearch("");
                                  }}
                                >
                                  <span className="truncate">{option.label}</span>
                                  <span className="ml-auto flex items-center gap-2 text-muted-foreground">
                                    <span>{option.code}</span>
                                    {option.id === countryOptionId ? <Check className="h-4 w-4 text-foreground" /> : null}
                                  </span>
                                </button>
                              ))
                            ) : (
                              <div className="px-3 py-2 text-sm text-muted-foreground">
                                {locale === "ru" ? "Ничего не найдено" : "No matches found"}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <input
                      aria-label={locale === "ru" ? "Телефонный код страны" : "Country dial code"}
                      className="w-[82px] shrink-0 border-0 border-r border-input bg-transparent px-3 text-sm outline-none"
                      inputMode="tel"
                      placeholder="+7"
                      value={countryCode}
                      onChange={(event) => {
                        const nextCode = normalizeCountryCode(event.target.value);
                        setCountryCode(nextCode);
                        setCountryOptionId(findCountryOptionIdByCode(nextCode));
                      }}
                    />

                    <input
                      id="manager-phone"
                      required
                      className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm outline-none"
                      inputMode="tel"
                      placeholder="999 000 00 00"
                      value={form.phone}
                      onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label htmlFor="manager-photo" className="text-sm font-medium">{locale === "ru" ? "Фото" : "Photo"}{requiredMark}</label>
                  <div className="flex min-h-[88px] items-center gap-3 rounded-[20px] border border-border/60 bg-muted/15 p-3">
                    <button
                      type="button"
                      className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-white transition hover:border-[color:var(--accent)]"
                      onClick={() => {
                        if (avatarSourceDataUrl) {
                          setAvatarEditorOpen(true);
                        }
                      }}
                    >
                      {avatarPreviewDataUrl ? (
                        <img
                          alt={locale === "ru" ? "Превью аватара" : "Avatar preview"}
                          className="h-full w-full object-cover"
                          src={avatarPreviewDataUrl}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
                          {locale === "ru" ? "Превью" : "Preview"}
                        </div>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <input
                        id="manager-photo"
                        accept="image/*"
                        type="file"
                        onChange={handleAvatarChange}
                        className="sr-only"
                      />
                      <div className="flex min-h-[72px] items-center gap-3">
                        <label
                          htmlFor="manager-photo"
                          className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md border border-input bg-[rgba(37,99,235,0.08)] px-4 text-sm font-medium text-[color:var(--accent)] transition hover:bg-[rgba(37,99,235,0.12)]"
                        >
                          {locale === "ru" ? "Выберите файл" : "Choose file"}
                        </label>
                        <span className={`truncate text-sm ${avatarFileName ? "text-muted-foreground" : "text-red-600"}`}>
                          {avatarFileName || (locale === "ru" ? "Фото обязательно" : "Photo is required")}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                  >
                    {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {submitting
                      ? locale === "ru"
                        ? "Создаём..."
                        : "Creating..."
                      : locale === "ru"
                        ? "Продолжить"
                        : "Continue"}
                  </Button>
                </div>
              </form>
            </section>
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <LanguagePicker locale={locale} setLocale={setLocale} />
        </div>
      </div>

      <Dialog open={avatarEditorOpen} onOpenChange={setAvatarEditorOpen}>
        <DialogContent className="w-[min(760px,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
          <div className="border-b border-[color:var(--border)] px-6 py-4">
            <DialogHeader className="gap-1">
              <DialogTitle>{locale === "ru" ? "Редактировать фото" : "Edit photo"}</DialogTitle>
              <DialogDescription>
                {locale === "ru"
                  ? "Подгони кадр так, как он должен выглядеть в профиле менеджера."
                  : "Adjust the frame to how it should look in the manager profile."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-5">
              <div className="mx-auto flex w-full max-w-[420px] items-center justify-center rounded-[28px] bg-[linear-gradient(180deg,#f6f8fc_0%,#edf2f9_100%)] p-4">
              <div
                className="relative h-[360px] w-[360px] overflow-hidden rounded-[28px] border-2 border-[#3b82f6] bg-white shadow-inner"
                onPointerDown={handleAvatarPointerDown}
                onPointerMove={handleAvatarPointerMove}
                onPointerUp={handleAvatarPointerEnd}
                onPointerCancel={handleAvatarPointerEnd}
                style={{ cursor: avatarSourceDataUrl ? (avatarDragging ? "grabbing" : "grab") : "default" }}
              >
                {avatarSourceDataUrl ? (
                  <img
                    alt={locale === "ru" ? "Превью редактора аватара" : "Avatar editor preview"}
                    ref={avatarEditorImageRef}
                    className="absolute left-1/2 top-1/2 h-full w-full select-none object-cover"
                    draggable={false}
                    src={avatarSourceDataUrl}
                    style={{
                      transform: `translate3d(calc(-50% + ${avatarEditorValuesRef.current.offsetX}px), calc(-50% + ${avatarEditorValuesRef.current.offsetY}px), 0) scale(${avatarEditorValuesRef.current.zoom})`,
                      transformOrigin: "center center",
                      userSelect: "none",
                      willChange: "transform",
                    }}
                  />
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="inline-flex shrink-0 items-center gap-2 font-medium whitespace-nowrap">
                  <ZoomIn className="h-4 w-4 text-muted-foreground" />
                  {locale === "ru" ? "Масштаб" : "Zoom"}
                </span>
                <input
                  ref={zoomRangeRef}
                  type="range"
                  min="1"
                  max="2.6"
                  step="0.01"
                  defaultValue="1"
                  onInput={(event) => {
                    avatarEditorValuesRef.current.zoom = Number(event.currentTarget.value);
                    scheduleAvatarTransform();
                  }}
                  className="min-w-0 flex-1"
                />
              </label>

              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="shrink-0 font-medium whitespace-nowrap">{locale === "ru" ? "Сдвиг по X" : "Offset X"}</span>
                <input
                  ref={offsetXRangeRef}
                  type="range"
                  min="-160"
                  max="160"
                  step="1"
                  defaultValue="0"
                  onInput={(event) => {
                    avatarEditorValuesRef.current.offsetX = Number(event.currentTarget.value);
                    scheduleAvatarTransform();
                  }}
                  className="min-w-0 flex-1"
                />
              </label>

              <label className="flex min-w-[190px] flex-1 items-center gap-3 text-sm">
                <span className="shrink-0 font-medium whitespace-nowrap">{locale === "ru" ? "Сдвиг по Y" : "Offset Y"}</span>
                <input
                  ref={offsetYRangeRef}
                  type="range"
                  min="-160"
                  max="160"
                  step="1"
                  defaultValue="0"
                  onInput={(event) => {
                    avatarEditorValuesRef.current.offsetY = Number(event.currentTarget.value);
                    scheduleAvatarTransform();
                  }}
                  className="min-w-0 flex-1"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="border-t border-[color:var(--border)] px-6 py-4 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAvatarEditorOpen(false)}
            >
              {locale === "ru" ? "Отмена" : "Cancel"}
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              onClick={() => void handleApplyAvatarEditor()}
            >
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
