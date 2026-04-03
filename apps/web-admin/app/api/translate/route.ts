import { NextRequest, NextResponse } from "next/server";
import type { Locale } from "@/lib/i18n";
import { translateTexts } from "@/lib/live-translation";

type TranslateRequestBody = {
  texts?: string[];
  targetLocale?: Locale;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as TranslateRequestBody;
  const texts = Array.isArray(body.texts) ? body.texts : [];
  const targetLocale =
    body.targetLocale === "ru" || body.targetLocale === "en"
      ? body.targetLocale
      : "en";

  const translations = await translateTexts(texts, targetLocale);

  return NextResponse.json({
    translations,
  });
}
