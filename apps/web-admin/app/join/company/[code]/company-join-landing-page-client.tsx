"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

const APP_STORE_URL = process.env.NEXT_PUBLIC_MOBILE_APP_STORE_URL ?? "";
const PLAY_STORE_URL = process.env.NEXT_PUBLIC_MOBILE_PLAY_STORE_URL ?? "";

type CompanyJoinLandingPageClientProps = {
  code: string;
};

export default function CompanyJoinLandingPageClient({
  code,
}: CompanyJoinLandingPageClientProps) {
  const normalizedCode = useMemo(() => decodeURIComponent(code).trim().toUpperCase(), [code]);
  const deepLink = `smart://auth/join/${encodeURIComponent(normalizedCode)}`;

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.href = deepLink;
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [deepLink]);

  return (
    <main className="auth-gate">
      <div className="auth-gate-card max-w-[560px] text-left">
        <h1 className="text-2xl font-bold">Join team from mobile</h1>
        <p className="mt-3 text-sm text-gray-500">
          If Smart is installed, the app should open automatically. If not, install the app and enter this company code:
        </p>
        <div className="preview-card mt-6">
          <span className="section-kicker">Company code</span>
          <strong>{normalizedCode}</strong>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <a className="solid-button inline-flex" href={deepLink}>
            Open in app
          </a>
          {APP_STORE_URL ? (
            <a className="solid-button inline-flex" href={APP_STORE_URL} rel="noreferrer" target="_blank">
              App Store
            </a>
          ) : null}
          {PLAY_STORE_URL ? (
            <a className="solid-button inline-flex" href={PLAY_STORE_URL} rel="noreferrer" target="_blank">
              Google Play
            </a>
          ) : null}
          <Link className="solid-button inline-flex" href="/login">
            Desktop login
          </Link>
        </div>
      </div>
    </main>
  );
}
