"use client";

import { useState } from "react";
import { Copy, ExternalLink, Hand, Loader2, Mail, ShieldCheck, Smartphone } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type RegisterOrganizationResponse = {
  tenantId: string;
  tenantSlug: string;
  companyId: string;
  companyCode: string;
  managerEmail: string;
  managerSetupUrl: string;
  employeeJoinUrl: string;
  employeeDeepLink: string;
};

export default function InternalCreateOrganizationPage() {
  const [accessKey, setAccessKey] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegisterOrganizationResponse | null>(null);
  const [copiedField, setCopiedField] = useState<"manager" | "code" | "mobile" | "deep" | null>(null);

  async function copyValue(value: string, field: "manager" | "code" | "mobile" | "deep") {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField((current) => (current === field ? null : current)), 1200);
    } catch {
      setError("Не удалось скопировать значение.");
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
        throw new Error(payload.message || "Organization creation failed.");
      }

      setResult(payload);
      setOrganizationName("");
      setManagerEmail("");
      setCompanyCode("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Organization creation failed.");
    } finally {
      setLoading(false);
    }
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
          <CardTitle className="text-center text-xl font-bold">Hi-Team Internal Setup</CardTitle>
          <CardDescription className="mt-2 text-center">
            Create an organization, issue the manager setup link, and generate the company code for mobile employee onboarding.
          </CardDescription>
          </CardHeader>

          <CardContent>
            {result ? (
              <div className="flex flex-col gap-4">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Организация создана
                  </div>
                  <p className="mt-2 text-emerald-800">
                    Передай ссылку менеджеру для desktop setup, а сотрудникам отправь код компании или mobile join link.
                  </p>
                </div>

                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      Manager setup link
                    </div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.managerSetupUrl} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.managerSetupUrl, "manager")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "manager" ? "Copied" : "Copy"}
                      </Button>
                      <Button type="button" variant="outline" asChild>
                        <a href={result.managerSetupUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Employee company code</div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.companyCode} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.companyCode, "code")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "code" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      Employee mobile join link
                    </div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.employeeJoinUrl} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.employeeJoinUrl, "mobile")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "mobile" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-sm font-medium">Employee deep link</div>
                    <div className="flex gap-2">
                      <Input readOnly value={result.employeeDeepLink} />
                      <Button type="button" variant="outline" onClick={() => void copyValue(result.employeeDeepLink, "deep")}>
                        <Copy className="mr-2 h-4 w-4" />
                        {copiedField === "deep" ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button type="button" variant="outline" onClick={() => setResult(null)}>
                  Create another organization
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
                    Internal access key
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
                    Organization name
                  </label>
                  <Input
                    id="organization-name"
                    required
                    value={organizationName}
                    onChange={(event) => setOrganizationName(event.target.value)}
                    placeholder="HiTeam Beauty"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="manager-email" className="text-sm font-medium">
                    Manager email
                  </label>
                  <Input
                    id="manager-email"
                    required
                    type="email"
                    value={managerEmail}
                    onChange={(event) => setManagerEmail(event.target.value)}
                    placeholder="manager@company.com"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="company-code" className="text-sm font-medium">
                    Company code
                  </label>
                  <Input
                    id="company-code"
                    required
                    value={companyCode}
                    onChange={(event) => setCompanyCode(event.target.value.toUpperCase())}
                    placeholder="HITEAM-HQ"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {loading ? "Создаём..." : "Создать организацию"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
