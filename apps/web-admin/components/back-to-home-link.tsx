"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BackToHomeLink() {
  const { locale } = useI18n();
  return (
    <Link className="mb-6 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" href="/">
      <ArrowLeft aria-hidden="true" className="size-4" />
      {locale === "ru" ? "Вернуться на главную" : "Back to home"}
    </Link>
  );
}
