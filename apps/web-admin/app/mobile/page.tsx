import type { Metadata } from "next";
import { headers } from "next/headers";
import { Apple } from "lucide-react";
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
  href,
  kind,
}: {
  href: string;
  kind: "app-store" | "google-play";
}) {
  return (
    <a
      aria-label={
        kind === "app-store"
          ? "Download on the App Store"
          : "Get it on Google Play"
      }
      className="inline-flex h-10 shrink-0 items-center rounded-[7px] bg-black px-3 text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)] ring-1 ring-white/12 ring-inset outline-none transition duration-200 hover:-translate-y-0.5 hover:bg-black/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black active:translate-y-0"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {kind === "app-store" ? (
        <span className="inline-flex w-[96px] items-center gap-1.5">
          <Apple className="h-[22px] w-[22px]" fill="currentColor" strokeWidth={1.6} />
          <span className="grid leading-none">
            <span className="text-[6px] font-semibold leading-[8px]">
              Download on the
            </span>
            <span className="text-[15px] font-semibold leading-[16px]">
              App Store
            </span>
          </span>
        </span>
      ) : (
        <span className="inline-flex w-[111px] items-center gap-1.5">
          <span className="relative h-[23px] w-[20px] shrink-0 overflow-hidden rounded-[3px]">
            <span className="absolute left-0 top-0 h-full w-full bg-[#00d8ff] [clip-path:polygon(0_0,100%_50%,0_100%)]" />
            <span className="absolute left-[2px] top-[2px] h-[19px] w-[16px] bg-[#00f076] [clip-path:polygon(0_0,58%_50%,0_100%)]" />
            <span className="absolute right-0 top-[3px] h-[8px] w-[12px] bg-[#ffe000] [clip-path:polygon(0_0,100%_50%,0_100%)]" />
            <span className="absolute bottom-[3px] right-0 h-[8px] w-[12px] bg-[#ff3a44] [clip-path:polygon(0_100%,100%_50%,0_0)]" />
          </span>
          <span className="grid leading-none">
            <span className="text-[6px] font-semibold uppercase leading-[8px] tracking-[0.06em]">
              Get it on
            </span>
            <span className="text-[14px] font-semibold leading-[16px]">
              Google Play
            </span>
          </span>
        </span>
      )}
    </a>
  );
}

export default async function MobileDownloadPage() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("accept-language"));
  const isRu = locale === "ru";

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_18%_18%,rgba(59,130,246,0.18),transparent_25%),radial-gradient(circle_at_82%_20%,rgba(99,102,241,0.14),transparent_30%),radial-gradient(circle_at_50%_82%,rgba(96,165,250,0.18),transparent_32%),linear-gradient(180deg,#ecf4ff_0%,#dfeaff_100%)] px-5 py-6 text-[#182131] sm:px-8 lg:px-10">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col">
        <header className="flex items-center">
          <BrandWordmark className="text-[2rem]" />
        </header>

        <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:py-16">
          <div className="max-w-2xl">
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
                href={IOS_APP_URL}
                kind="app-store"
              />
              <StoreButton
                href={ANDROID_APP_URL}
                kind="google-play"
              />
            </div>
          </div>

          <div className="flex flex-1 justify-center lg:justify-end">
            <div className="relative lg:translate-x-4">
              <div className="relative rounded-[3.4rem] bg-[#141c2a]/90 p-2.5 shadow-2xl shadow-[#4f6df5]/10">
                <div className="absolute left-1/2 top-0 z-20 h-[30px] w-[136px] -translate-x-1/2 rounded-b-[1.35rem] bg-[#141c2a]/90" />
                <div className="relative aspect-[9/19.5] w-[min(78vw,288px)] overflow-hidden rounded-[2.9rem] bg-white sm:w-[288px] md:w-[332px] lg:w-[372px]">
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
