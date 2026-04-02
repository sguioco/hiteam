"use client";

import { ChangeEvent, FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Hand, Loader2, Mail, ShieldCheck, ZoomIn } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { toAdminHref } from "@/lib/admin-routes";
import { AuthSession, persistSession, saveTenantSlug } from "@/lib/auth";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DateOfBirthField } from "@/components/ui/date-of-birth-field";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AppSelectField, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PublicInvitationPayload } from "../../invitation-types";

type CountryCodeOption = {
  code: string;
  label: string;
};

const COUNTRY_CODE_OPTIONS: CountryCodeOption[] = [
  { code: "+1", label: "US/CA +1" },
  { code: "+7", label: "RU/KZ +7" },
  { code: "+44", label: "UK +44" },
  { code: "+49", label: "DE +49" },
  { code: "+66", label: "TH +66" },
  { code: "+84", label: "VN +84" },
  { code: "+971", label: "UAE +971" },
  { code: "+998", label: "UZ +998" },
];

function splitPhoneNumber(rawPhone?: string | null) {
  const normalized = (rawPhone ?? "").trim();
  if (!normalized) {
    return { countryCode: "+7", nationalNumber: "" };
  }

  const match = COUNTRY_CODE_OPTIONS
    .slice()
    .sort((left, right) => right.code.length - left.code.length)
    .find((option) => normalized.startsWith(option.code));

  if (!match) {
    return { countryCode: "+7", nationalNumber: normalized.replace(/^\+/, "") };
  }

  return {
    countryCode: match.code,
    nationalNumber: normalized.slice(match.code.length).trim(),
  };
}

async function compressImageToDataUrl(
  file: File,
  options?: { maxSide?: number; quality?: number },
): Promise<string> {
  const sourceDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Не удалось прочитать файл."));
    reader.readAsDataURL(file);
  });

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
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
    throw new Error("Не удалось подготовить изображение.");
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", options?.quality ?? 0.82);
  if (compressed.length > 7_000_000) {
    throw new Error("Фото слишком большое. Выбери изображение поменьше.");
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
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
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
    throw new Error("Не удалось подготовить изображение.");
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
    nextImage.onerror = () => reject(new Error("Не удалось обработать изображение."));
    nextImage.src = sourceDataUrl;
  });

  const canvasSize = options.canvasSize ?? 300;
  const canvas = document.createElement("canvas");
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Не удалось подготовить превью.");
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
  const [countryCode, setCountryCode] = useState(initialPhone.countryCode);
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

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await apiRequest(`/employees/invitations/public/${token}/register`, {
        method: "POST",
        body: JSON.stringify({
          ...form,
          phone: `${countryCode} ${form.phone.trim()}`.trim(),
          avatarDataUrl: avatarDataUrl ?? undefined,
        }),
      });

      const session = await apiRequest<AuthSession>(`/auth/login`, {
        method: "POST",
        realBackend: true,
        body: JSON.stringify({
          tenantSlug: invitation.tenantSlug,
          email: invitation.email,
          password: form.password,
        }),
      });

      await persistSession(session);
      saveTenantSlug(invitation.tenantSlug);
      setSuccess("Профиль создан. Перенаправляем в настройки организации.");
      setTimeout(() => router.replace(toAdminHref("/organization")), 600);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Произошла ошибка при настройке.");
    } finally {
      setSubmitting(false);
    }
  }

  if (error && !invitation) {
    return (
      <main className="auth-gate">
        <div className="auth-gate-card max-w-[520px] text-left">
          <h1 className="text-2xl font-bold">Приглашение недоступно</h1>
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
          <h1 className="text-2xl font-bold">Настройка уже начата</h1>
          <p className="mt-3 text-sm text-gray-500">
            Для {invitation.email} профиль уже заполнен. Войдите в систему и завершите настройку организации.
          </p>
          <Link className="solid-button mt-6 inline-flex" href="/login">
            Войти
          </Link>
        </div>
      </main>
    );
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2.5 font-medium text-lg">
          <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
            <Hand className="size-4" />
          </div>
          <BrandWordmark className="text-[1.125rem]" />
        </div>

        <Card className="border-border/40 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-xl font-bold">Настройка организации</CardTitle>
            <CardDescription className="mt-2 text-center">
              Сначала создайте профиль менеджера. Сразу после этого вы попадёте в настройки организации, где зададите название, логотип, адрес, точку на карте и радиус. Название организации потом можно менять в любой момент.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="mb-4 rounded-2xl border border-border/60 bg-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <BriefcaseBusiness className="h-4 w-4 text-muted-foreground" />
                {invitation.companyName ?? invitation.tenantName}
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4" />
                Код компании: <strong className="text-foreground">{invitation.companyCode ?? "—"}</strong>
              </div>
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                {invitation.email}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

              <div className="space-y-1.5">
                <label htmlFor="manager-email" className="text-sm font-medium">Email</label>
                <Input className={textFieldClassName} id="manager-email" disabled value={invitation.email} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="manager-password" className="text-sm font-medium">Пароль{requiredMark}</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="manager-first-name" className="text-sm font-medium">Имя{requiredMark}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-first-name"
                    required
                    value={form.firstName}
                    onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-last-name" className="text-sm font-medium">Фамилия{requiredMark}</label>
                  <Input
                    className={textFieldClassName}
                    id="manager-last-name"
                    required
                    value={form.lastName}
                    onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="manager-middle-name" className="text-sm font-medium">Отчество</label>
                <Input
                  className={textFieldClassName}
                  id="manager-middle-name"
                  value={form.middleName}
                  onChange={(event) => setForm((current) => ({ ...current, middleName: event.target.value }))}
                />
              </div>

              <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="manager-birth-date" className="text-sm font-medium">Дата рождения{requiredMark}</label>
                  <DateOfBirthField
                    value={form.birthDate}
                    onChange={(nextValue) =>
                      setForm((current) => ({ ...current, birthDate: nextValue }))
                    }
                    triggerClassName="h-11 rounded-md"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-gender" className="text-sm font-medium">Пол{requiredMark}</label>
                  <AppSelectField
                    value={form.gender}
                    onValueChange={(value) => setForm((current) => ({ ...current, gender: value }))}
                    options={[
                      { value: "male", label: "Мужской" },
                      { value: "female", label: "Женский" },
                    ]}
                    triggerClassName="h-11 rounded-md"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="manager-phone" className="text-sm font-medium">Телефон{requiredMark}</label>
                <div className="flex h-11 overflow-hidden rounded-md border border-input bg-background focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                  <div className="w-[128px] shrink-0 border-r border-input">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger
                        aria-label="Код страны"
                        className="h-full min-h-0 rounded-none border-0 bg-transparent px-2.5 py-0 text-xs shadow-none hover:bg-transparent hover:shadow-none focus:ring-0 data-[state=open]:scale-100"
                      >
                        <SelectValue placeholder="Код страны" />
                      </SelectTrigger>
                      <SelectContent className="rounded-[24px]">
                        {COUNTRY_CODE_OPTIONS.map((option) => (
                          <SelectItem key={option.code} value={option.code}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

              <div className="space-y-1.5">
                <label htmlFor="manager-photo" className="text-sm font-medium">Фото</label>
                <div className="flex min-h-[72px] items-center gap-3">
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
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                        src={avatarPreviewDataUrl}
                      />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center text-center text-xs text-muted-foreground">
                          Preview
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
                        Выберите файл
                      </label>
                      <span className="truncate text-sm text-muted-foreground">
                        {avatarFileName || "Файл не выбран"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitting ? "Создаём..." : "Продолжить"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Dialog open={avatarEditorOpen} onOpenChange={setAvatarEditorOpen}>
        <DialogContent className="w-[min(760px,calc(100vw-1.5rem))] max-w-none overflow-hidden rounded-[28px] border-[color:var(--border)] bg-[color:var(--panel-strong)] p-0">
          <div className="border-b border-[color:var(--border)] px-6 py-4">
            <DialogHeader className="gap-1">
              <DialogTitle>Редактировать фото</DialogTitle>
              <DialogDescription>
                Подгони кадр так, как он должен выглядеть в профиле менеджера.
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
                    alt="Avatar editor preview"
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
                  Масштаб
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
                <span className="shrink-0 font-medium whitespace-nowrap">Сдвиг по X</span>
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
                <span className="shrink-0 font-medium whitespace-nowrap">Сдвиг по Y</span>
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
              Отмена
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
