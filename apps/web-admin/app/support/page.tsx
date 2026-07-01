import type { Metadata } from "next";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";

const whatsappNumber = "+971 55 719 5382";
const whatsappHref =
  "https://wa.me/971557195382?text=HiTeam%20support%20request";
const supportEmail = "info@hiteam.net";

export const metadata: Metadata = {
  title: "Support | HiTeam",
  description:
    "Contact HiTeam support by live chat, WhatsApp, or email for help with attendance, tasks, billing, and account access.",
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-950 md:px-10 md:py-12">
      <div className="mx-auto max-w-[960px]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-primary"
            href="/"
          >
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                d="M19 12H5m0 0 6-6m-6 6 6 6"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
              />
            </svg>
            Back to site
          </Link>
          <Link aria-label="HiTeam home" href="/">
            <BrandWordmark className="text-[2rem]" />
          </Link>
        </header>

        <section className="mt-10 rounded-[14px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
            HiTeam support
          </p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.1rem,5vw,3.6rem)] leading-[1.02] font-bold tracking-[-0.03em] text-slate-950">
            Need help with HiTeam?
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            Our team can help with account access, setup, attendance, tasks,
            checklists, billing, and technical questions.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <a
              className="rounded-[14px] border border-slate-200 bg-slate-50 p-5 transition hover:border-primary/40 hover:bg-white"
              href={whatsappHref}
              rel="noopener noreferrer"
              target="_blank"
            >
              <p className="text-sm font-bold text-slate-950">WhatsApp</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Message us directly at {whatsappNumber}.
              </p>
              <span className="mt-4 inline-flex text-sm font-bold text-primary">
                Open WhatsApp
              </span>
            </a>

            <a
              className="rounded-[14px] border border-slate-200 bg-slate-50 p-5 transition hover:border-primary/40 hover:bg-white"
              href={`mailto:${supportEmail}?subject=HiTeam%20support%20request`}
            >
              <p className="text-sm font-bold text-slate-950">Email</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Send details to {supportEmail}. We will reply by email.
              </p>
              <span className="mt-4 inline-flex text-sm font-bold text-primary">
                Send email
              </span>
            </a>

            <div className="rounded-[14px] border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-bold text-slate-950">Live chat</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use the Umnico chat widget in the bottom-right corner of this
                page for quick support.
              </p>
              <span className="mt-4 inline-flex text-sm font-bold text-primary">
                Chat widget is available here
              </span>
            </div>
          </div>

          <div className="mt-8 rounded-[14px] border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold tracking-[-0.02em] text-slate-950">
              What to include
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>Your company name and workspace email.</li>
              <li>The page or feature where the issue happened.</li>
              <li>Screenshots or steps to reproduce the problem.</li>
              <li>Whether the issue affects managers, employees, or billing.</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
