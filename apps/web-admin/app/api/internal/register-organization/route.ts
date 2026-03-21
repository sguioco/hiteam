import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.API_INTERNAL_URL ??
  process.env.API_URL ??
  "http://api:4000";

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

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1/system/organizations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-system-secret": systemSecret,
      },
      body: JSON.stringify({
        organizationName: body.organizationName,
        managerEmail: body.managerEmail,
        companyCode: body.companyCode,
        timezone: body.timezone,
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
