import type { Metadata } from "next";
import Link from "next/link";
import { BrandWordmark } from "@/components/brand-wordmark";

const supportEmail = "info@hiteam.net";

export const metadata: Metadata = {
  title: "Account deletion | HiTeam",
  description:
    "Instructions for deleting a HiTeam account and the associated personal data.",
};

export default function AccountDeletionPage() {
  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-950 md:px-10 md:py-12">
      <div className="mx-auto max-w-[840px]">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link
            className="text-sm font-semibold text-slate-700 transition hover:text-primary"
            href="/support"
          >
            Back to support
          </Link>
          <Link aria-label="HiTeam home" href="/">
            <BrandWordmark className="text-[2rem]" />
          </Link>
        </header>

        <section className="mt-10 border border-slate-200 bg-white p-6 md:p-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
            HiTeam account management
          </p>
          <h1 className="mt-4 text-3xl font-bold text-slate-950 md:text-5xl">
            Delete your HiTeam account
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-700">
            You can permanently disable your account and remove or anonymize the
            personal data associated with it directly in the HiTeam app.
          </p>

          <div className="mt-9 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-slate-950">
              Delete your account in the app
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>Open HiTeam and sign in to your account.</li>
              <li>Open Profile.</li>
              <li>Select Delete account.</li>
              <li>Review the warning and confirm Delete.</li>
            </ol>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Account access is disabled immediately and the action cannot be
              undone.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-slate-950">
              Request deletion without using the app
            </h2>
            <p className="mt-4 text-sm leading-7 text-slate-700">
              Email{" "}
              <a
                className="font-semibold text-primary underline"
                href={`mailto:${supportEmail}?subject=HiTeam%20account%20deletion%20request`}
              >
                {supportEmail}
              </a>{" "}
              from the address connected to your HiTeam account. Use the subject
              &quot;HiTeam account deletion request&quot; and include your
              workspace or company name. We may ask you to verify ownership of
              the account before processing the request.
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8">
            <h2 className="text-xl font-bold text-slate-950">
              Data deletion and retention
            </h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              <li>
                Login sessions, push notification identifiers, notifications,
                and biometric profile data are deleted when the account is
                deleted.
              </li>
              <li>
                The account email and employee profile are anonymized and access
                is permanently disabled.
              </li>
              <li>
                Account data may be retained for up to 30 days after deletion
                where required for backup, security, or legal obligations.
              </li>
              <li>
                Anonymized operational, audit, billing, and legally required
                records may be retained when they can no longer identify the
                deleted user.
              </li>
            </ul>
            <p className="mt-5 text-sm leading-7 text-slate-700">
              For more information, read the{" "}
              <Link
                className="font-semibold text-primary underline"
                href="/privacy"
              >
                HiTeam Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
