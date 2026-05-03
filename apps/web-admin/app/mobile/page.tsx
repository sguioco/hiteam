import type { Metadata } from "next";
import { headers } from "next/headers";
import { BrandWordmark } from "@/components/brand-wordmark";
import {
  AppStoreButton,
  GooglePlayButton,
} from "@/components/landing-page";

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

export default async function MobileDownloadPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const isRu = locale === "ru";

  return (
    <main className="h-[100dvh] overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_82%_20%,rgba(99,102,241,0.14),transparent_30%),radial-gradient(circle_at_50%_82%,rgba(96,165,250,0.18),transparent_32%),linear-gradient(180deg,#ecf4ff_0%,#dfeaff_100%)] px-5 py-5 text-[#182131] sm:px-8 lg:px-10">
      <section className="mx-auto flex h-full max-w-6xl flex-col">
        <header className="flex shrink-0 items-center">
          <BrandWordmark className="text-[1.9rem]" />
        </header>

        <div className="grid min-h-0 flex-1 items-center gap-7 py-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,0.95fr)] lg:py-2">
          <div className="max-w-2xl">
            <h1 className="text-[clamp(2.15rem,7vw,4.35rem)] font-semibold leading-[0.96] tracking-[-0.055em] text-[#141c2a]">
              {isRu ? "Скачайте HiTeam на телефон" : "Download HiTeam on your phone"}
            </h1>
            <p className="mt-5 max-w-[46ch] text-base leading-7 text-[#647085] sm:text-lg">
              {isRu
                ? "Отправьте сотрудникам эту страницу: iPhone и Android ведут на нужный магазин с одной общей ссылки."
                : "Share this page with employees: iPhone and Android users get the right store from one shared link."}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <AppStoreButton
                className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                href={IOS_APP_URL}
                rel="noreferrer"
                size="md"
                target="_blank"
              />
              <GooglePlayButton
                className="shrink-0 shadow-[0_16px_40px_rgba(15,23,42,0.16)] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 active:scale-[0.96]"
                href={ANDROID_APP_URL}
                rel="noreferrer"
                size="md"
                target="_blank"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-center lg:justify-end">
            <div className="relative lg:translate-x-4">
              <div className="relative rounded-[2.75rem] bg-[#141c2a]/90 p-2 shadow-2xl shadow-[#4f6df5]/10">
                <div className="absolute left-1/2 top-0 z-20 h-[24px] w-[108px] -translate-x-1/2 rounded-b-[1.1rem] bg-[#141c2a]/90" />
                <div className="relative aspect-[9/19.5] w-[min(70vw,236px)] overflow-hidden rounded-[2.35rem] bg-white sm:w-[252px] md:w-[276px] lg:w-[300px]">
                  <img
                    alt={isRu ? "Скриншот приложения" : "App screenshot"}
                    className="h-full w-full object-cover object-top"
                    decoding="async"
                    fetchPriority="low"
                    loading="lazy"
                    src={isRu ? "/mob_ru.webp" : "/mob_en.webp"}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
