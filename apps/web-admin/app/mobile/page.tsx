import type { Metadata } from "next";
import { headers } from "next/headers";
import { Apple, Play, ShieldCheck, Smartphone } from "lucide-react";
import { BrandWordmark } from "@/components/brand-wordmark";

const IOS_APP_URL = process.env.NEXT_PUBLIC_IOS_APP_URL ?? "https://apps.apple.com/";
const ANDROID_APP_URL =
  process.env.NEXT_PUBLIC_ANDROID_APP_URL ?? "https://play.google.com/store/apps";

export const metadata: Metadata = {
  title: "HiTeam mobile app",
  description: "Download the HiTeam mobile app for iPhone and Android.",
};

function resolveLocale(acceptLanguage: string | null) {
  return acceptLanguage?.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function StoreButton({
  eyebrow,
  href,
  icon,
  label,
}: {
  eyebrow: string;
  href: string;
  icon: "apple" | "play";
  label: string;
}) {
  const Icon = icon === "apple" ? Apple : Play;

  return (
    <a
      className="group inline-flex h-[64px] min-w-[210px] items-center gap-3 rounded-[18px] bg-[#121722] px-5 text-white shadow-[0_18px_44px_rgba(18,23,34,0.18)] ring-1 ring-white/10 transition duration-200 hover:-translate-y-0.5 hover:bg-[#1a2130] active:translate-y-0"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-white/10">
        <Icon className="h-6 w-6" strokeWidth={1.8} />
      </span>
      <span className="grid text-left leading-none">
        <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/62">
          {eyebrow}
        </span>
        <span className="mt-1 text-[18px] font-semibold tracking-[-0.02em]">
          {label}
        </span>
      </span>
    </a>
  );
}

export default async function MobileDownloadPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const isRu = locale === "ru";

  return (
    <main className="min-h-[100dvh] bg-[#f5f8fb] px-5 py-6 text-[#182131] sm:px-8 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center justify-between">
          <BrandWordmark className="text-[2rem]" />
          <div className="hidden items-center gap-2 rounded-full border border-[#dce5ef] bg-white/80 px-4 py-2 text-sm font-medium text-[#647085] shadow-sm sm:inline-flex">
            <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
            {isRu ? "Одна ссылка для всех компаний" : "One link for every company"}
          </div>
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-16">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#dce5ef] bg-white px-4 py-2 text-sm font-semibold text-[#4f6075] shadow-sm sm:hidden">
              <ShieldCheck className="h-4 w-4" strokeWidth={1.8} />
              {isRu ? "Одна ссылка для всех компаний" : "One link for every company"}
            </div>
            <h1 className="text-[clamp(2.25rem,8vw,5rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#141c2a]">
              {isRu ? "Скачайте HiTeam на телефон" : "Download HiTeam on your phone"}
            </h1>
            <p className="mt-6 max-w-[46ch] text-lg leading-8 text-[#647085]">
              {isRu
                ? "Отправьте сотрудникам эту страницу: iPhone и Android ведут на нужный магазин с одной общей ссылки."
                : "Share this page with employees: iPhone and Android users get the right store from one shared link."}
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <StoreButton
                eyebrow={isRu ? "Скачать в" : "Download on the"}
                href={IOS_APP_URL}
                icon="apple"
                label="App Store"
              />
              <StoreButton
                eyebrow={isRu ? "Скачать в" : "Get it on"}
                href={ANDROID_APP_URL}
                icon="play"
                label={isRu ? "Play Market" : "Google Play"}
              />
            </div>

            <p className="mt-5 text-sm text-[#7b8798]">
              {isRu
                ? "Адрес страницы: /mobile"
                : "Page address: /mobile"}
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[420px] lg:mr-0">
            <div className="absolute inset-x-8 top-8 h-px bg-[#dce5ef]" />
            <div className="relative ml-auto aspect-[9/18.5] w-[min(78vw,310px)] rounded-[3rem] bg-[#151c28] p-3 shadow-[0_28px_80px_rgba(18,23,34,0.24)]">
              <div className="absolute left-1/2 top-3 h-5 w-28 -translate-x-1/2 rounded-b-2xl bg-[#151c28]" />
              <div className="h-full overflow-hidden rounded-[2.45rem] bg-[#d7f6f8]">
                <div className="flex h-full flex-col px-5 py-8">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#29374c]/70">
                    <span>9:41</span>
                    <span>5G</span>
                  </div>
                  <div className="mt-14">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#5668f5] shadow-sm">
                      <Smartphone className="h-6 w-6" strokeWidth={1.8} />
                    </div>
                    <h2 className="mt-6 text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#223049]">
                      {isRu ? "Say hi одним касанием" : "Say hi in one tap"}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-[#607089]">
                      {isRu
                        ? "Смена, задачи, фотоотчёты и новости всегда под рукой."
                        : "Shifts, tasks, photo reports, and news stay close at hand."}
                    </p>
                  </div>
                  <div className="mt-auto rounded-[2rem] bg-white p-4 shadow-[0_18px_46px_rgba(60,86,120,0.16)]">
                    <div className="h-2 w-24 rounded-full bg-[#5668f5]" />
                    <div className="mt-4 h-3 w-44 rounded-full bg-[#d7deea]" />
                    <div className="mt-3 h-3 w-32 rounded-full bg-[#e6ebf2]" />
                    <div className="mt-6 h-12 rounded-2xl bg-[#5668f5]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
