import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.API_INTERNAL_URL ??
  process.env.API_URL ??
  "http://api:4000";

function resolveWebBaseUrl(request: NextRequest) {
  const configuredBaseUrl =
    process.env.WEB_ADMIN_BASE_URL ??
    process.env.NEXT_PUBLIC_WEB_ADMIN_BASE_URL;

  if (configuredBaseUrl?.trim()) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  return request.nextUrl.origin.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const internalAccessKey = process.env.HI_TEAM_INTERNAL_ACCESS_KEY ?? process.env.SYSTEM_SECRET;
  const systemSecret = process.env.SYSTEM_SECRET;

  if (!internalAccessKey || !systemSecret) {
    return NextResponse.json(
      {
        message:
          "Internal organization setup is not configured. Set HI_TEAM_INTERNAL_ACCESS_KEY and SYSTEM_SECRET in web-admin env, and SYSTEM_SECRET in api env.",
      },
      { status: 500 },
    );
  }

  const body = (await request.json()) as {
    accessKey?: string;
    organizationName?: string;
    managerEmail?: string;
    companyCode?: string;
    timezone?: string;
  };

  if ((body.accessKey ?? "").trim() !== internalAccessKey) {
    return NextResponse.json({ message: "Invalid internal access key." }, { status: 401 });
  }

  const organizationName = (body.organizationName ?? "").trim();
  const managerEmail = (body.managerEmail ?? "").trim().toLowerCase();
  const companyCode = (body.companyCode ?? "").trim().toUpperCase();
  const timezone = (body.timezone ?? "UTC").trim() || "UTC";

  if (!organizationName || !managerEmail || !companyCode) {
    return NextResponse.json({ message: "Organization name, manager email, and company code are required." }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/system/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-system-secret": systemSecret,
      },
      body: JSON.stringify({
        organizationName,
        managerEmail,
        companyCode,
        timezone,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to reach api service.",
        apiUrl: API_URL,
      },
      { status: 502 },
    );
  }

  const text = await response.text();

  if (response.status === 401) {
    const webBaseUrl = resolveWebBaseUrl(request);
    const baseSlug = organizationName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "company";

    const temporaryPassword = `Ht!${randomBytes(10).toString("hex")}`;
    let lastError = "Organization creation failed.";

    for (let attempt = 0; attempt < 10; attempt += 1) {
      const tenantSlug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
      const bootstrapResponse = await fetch(`${API_URL}/api/v1/auth/register-owner`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenantName: organizationName,
          tenantSlug,
          companyName: organizationName,
          companyCode,
          firstName: "Owner",
          lastName: "Pending",
          email: managerEmail,
          password: temporaryPassword,
          employeeNumber: `OWNER-${companyCode}`.slice(0, 32),
          hireDate: new Date().toISOString().slice(0, 10),
          timezone,
        }),
      });

      const bootstrapText = await bootstrapResponse.text();
      if (!bootstrapResponse.ok) {
        try {
          const parsed = JSON.parse(bootstrapText) as { message?: string | string[] };
          const message = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
          lastError = message || lastError;
          if (message?.includes("Tenant slug already exists")) {
            continue;
          }
        } catch {
          lastError = bootstrapText || lastError;
        }

        if (lastError.includes("Tenant slug already exists")) {
          continue;
        }

        return NextResponse.json({ message: lastError }, { status: bootstrapResponse.status });
      }

      const setupPayload = {
        tenantId: "",
        companyId: "",
        companyCode,
        tenantSlug,
        managerEmail,
        managerSetupUrl: `${webBaseUrl}/login`,
        managerTemporaryPassword: temporaryPassword,
        employeeJoinUrl: `${webBaseUrl}/join/company/${encodeURIComponent(companyCode)}`,
        employeeDeepLink: `smart://auth/join/${encodeURIComponent(companyCode)}`,
      };

      try {
        const registerPayload = JSON.parse(bootstrapText) as { tenantId?: string };
        setupPayload.tenantId = registerPayload.tenantId ?? "";

        const loginResponse = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            identifier: managerEmail,
            password: temporaryPassword,
            tenantSlug,
          }),
        });

        if (loginResponse.ok) {
          const loginPayload = (await loginResponse.json()) as { accessToken?: string };
          if (loginPayload.accessToken) {
            const orgResponse = await fetch(`${API_URL}/api/v1/org/setup`, {
              headers: {
                Authorization: `Bearer ${loginPayload.accessToken}`,
              },
            });

            if (orgResponse.ok) {
              const orgPayload = (await orgResponse.json()) as {
                company?: { id?: string; code?: string };
              };
              setupPayload.companyId = orgPayload.company?.id ?? "";
            }
          }
        }
      } catch {
        // Best effort only: creation already succeeded in Render.
      }

      return NextResponse.json(setupPayload, { status: 200 });
    }

    return NextResponse.json({ message: lastError }, { status: 409 });
  }

  if (!response.ok) {
    try {
      const parsed = JSON.parse(text) as { message?: string | string[] };
      const message = Array.isArray(parsed.message) ? parsed.message.join(", ") : parsed.message;
      return NextResponse.json({ message: message || "Organization creation failed." }, { status: response.status });
    } catch {
      return NextResponse.json({ message: text || "Organization creation failed." }, { status: response.status });
    }
  }

  if (!text.trim()) {
    return NextResponse.json({ message: "API returned an empty response." }, { status: 502 });
  }

  try {
    const payload = JSON.parse(text);
    return NextResponse.json(payload, { status: response.status });
  } catch {
    return NextResponse.json({ message: text }, { status: response.status });
  }
}
