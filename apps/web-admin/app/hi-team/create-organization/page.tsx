"use client";

import { useEffect, useState } from "react";
import { Copy, ExternalLink, Globe, Loader2, Mail, ShieldCheck } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  readBrowserStorageItem,
  removeBrowserStorageItem,
  writeBrowserStorageItem,
} from "@/lib/browser-storage";

type RegisterOrganizationResponse = {
  tenantId: string;
  tenantSlug: string;
  companyId: string;
  companyCode: string;
  managerEmail: string;
  managerSetupUrl: string;
  managerTemporaryPassword?: string;
};

type SupportedLang = "en" | "ru";

const languages: { code: SupportedLang; label: string }[] = [
  { code: "en", label: "English" },
  { code: "ru", label: "Русский" },
];

const texts = {
  en: {
    pageTitle: "Hi-Team Internal Setup",
    pageDescription:
      "Create an organization, issue the manager setup link, and prepare the internal company identifier. Employees will join later by work email, not by company code.",
    successTitle: "Organization created",
    successBody:
      "Send the manager setup link to the manager. After setup, the manager will add employee work emails in organization settings.",
    managerLogin: "Manager login",
    managerTemporaryPassword: "Manager temporary password",
    employeeCompanyCode: "Internal company code",
    copied: "Copied",
    copy: "Copy",
    createAnother: "Create another organization",
    internalAccessKey: "Internal access key",
    organizationName: "Organization name",
    managerEmail: "Manager email",
    companyCode: "Internal company code",
    organizationPlaceholder: "HiTeam Beauty",
    managerEmailPlaceholder: "manager@company.com",
    companyCodePlaceholder: "HITEAM-HQ",
    creating: "Creating...",
    createOrganization: "Create organization",
    copyFailed: "Failed to copy the value.",
    createFailed: "Organization creation failed.",
  },
  ru: {
    pageTitle: "Внутренняя настройка Hi-Team",
    pageDescription:
      "Создай организацию, выпусти ссылку для настройки менеджера и задай внутренний код компании. Сотрудники теперь подключаются по рабочему email, а не по коду компании.",
    successTitle: "Организация создана",
    successBody:
      "Передай ссылку менеджеру для desktop setup. После настройки менеджер добавит рабочие email сотрудников в настройках организации.",
    managerLogin: "Вход менеджера",
    managerTemporaryPassword: "Временный пароль менеджера",
    employeeCompanyCode: "Внутренний код компании",
    copied: "Скопировано",
    copy: "Копировать",
    createAnother: "Создать ещё одну организацию",
    internalAccessKey: "Internal access key",
    organizationName: "Название организации",
    managerEmail: "Email менеджера",
    companyCode: "Внутренний код компании",
    organizationPlaceholder: "HiTeam Beauty",
    managerEmailPlaceholder: "manager@company.com",
    companyCodePlaceholder: "HITEAM-HQ",
    creating: "Создаём...",
    createOrganization: "Создать организацию",
    copyFailed: "Не удалось скопировать значение.",
    createFailed: "Не удалось создать организацию.",
  },
} as const;

function LanguagePicker({
  lang,
  setLang,
}: {
  lang: SupportedLang;
  setLang: (lang: SupportedLang) => void;
}) {
  const current = languages.find((language) => language.code === lang) ?? languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
          <Globe className="h-4 w-4" />
          <span className="text-sm">{current.label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            className={language.code === lang ? "font-semibold" : undefined}
            onClick={() => setLang(language.code)}
          >
            {language.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function InternalCreateOrganizationPage() {
  const [lang, setLang] = useState<SupportedLang>("en");
  const [accessKey, setAccessKey] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterOrganizationResponse | null>(null);
  const [copiedField, setCopiedField] = useState<"manager" | "code" | null>(null);
  const t = texts[lang];

  useEffect(() => {
    const savedLocale = readBrowserStorageItem("smart-admin-locale");
    if (savedLocale === "ru") {
      setLang("ru");
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;

    if (lang === "en") {
      removeBrowserStorageItem("smart-admin-locale");
      return;
    }

    writeBrowserStorageItem("smart-admin-locale", lang);
  }, [lang]);

  async function copyValue(value: string, field: "manager" | "code") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1200);
    } catch {
      setError(t.copyFailed);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/internal/register-organization", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessKey,
          organizationName,
          managerEmail,
          companyCode,
        }),
      });

      const raw = await response.text();
      const payload = (raw ? JSON.parse(raw) : {}) as RegisterOrganizationResponse & { message?: string };
      if (!response.ok) {
        throw new Error(payload.message || t.createFailed);
      }

      setResult(payload);
      setOrganizationName("");
      setManagerEmail("");
      setCompanyCode("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.createFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex justify-center">
          <BrandWordmark className="text-[2.25rem] leading-none md:text-[2.5rem]" />
        </div>

        <Card className="border-border/40 shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle className="text-center text-xl font-bold">{t.pageTitle}</CardTitle>
            <CardDescription className="mt-2 text-center">
              {t.pageDescription}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {result ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    {t.successTitle}
                  </div>
                  <p className="mt-2 text-emerald-800">
                    {t.successBody}
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {t.managerLogin}
                    </div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.managerSetupUrl} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.managerSetupUrl, "manager")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "manager" ? t.copied : t.copy}
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <a href={result.managerSetupUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  {result.managerTemporaryPassword ? (
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{t.managerTemporaryPassword}</div>
                      <div className="flex gap-2">
                        <Input readOnly value={result.managerTemporaryPassword} />
                        <Button type="button" variant="outline" onClick={() => void copyValue(result.managerTemporaryPassword ?? "", "manager")}>
                          <Copy className="mr-2 h-4 w-4" />
                          {copiedField === "manager" ? t.copied : t.copy}
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1">
                    <div className="text-sm font-medium">{t.employeeCompanyCode}</div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.companyCode} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.companyCode, "code")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "code" ? t.copied : t.copy}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={() => setResult(null)}>
                  {t.createAnother}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error ? (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <label htmlFor="internal-access-key" className="text-sm font-medium">
                    {t.internalAccessKey}
                  </label>
                  <Input
                    id="internal-access-key"
                    required
                    type="password"
                    value={accessKey}
                    onChange={(event) => setAccessKey(event.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="organization-name" className="text-sm font-medium">
                    {t.organizationName}
                  </label>
                  <Input
                    id="organization-name"
                    required
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder={t.organizationPlaceholder}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-email" className="text-sm font-medium">
                    {t.managerEmail}
                  </label>
                  <Input
                    id="manager-email"
                    required
                    type="email"
                    value={managerEmail}
                    onChange={(event) => setManagerEmail(event.target.value)}
                    placeholder={t.managerEmailPlaceholder}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-code" className="text-sm font-medium">
                    {t.companyCode}
                  </label>
                  <Input
                    id="company-code"
                    required
                    value={companyCode}
                    onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
                    placeholder={t.companyCodePlaceholder}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? t.creating : t.createOrganization}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <LanguagePicker lang={lang} setLang={setLang} />
        </div>
      </div>
    </div>
  );
}
