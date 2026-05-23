import Link from "next/link";
import { BrandWordmark } from "./brand-wordmark";
import type { LegalDocument, LegalDocumentSection } from "@/lib/legal-documents";

function LegalSection({ section }: { section: LegalDocumentSection }) {
  return (
    <section className="border-t border-slate-200 pt-8">
      <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
        {section.title}
      </h2>
      {section.body?.map((paragraph) => (
        <p className="mt-4 text-sm leading-7 text-slate-700" key={paragraph}>
          {paragraph}
        </p>
      ))}
      {section.bullets ? (
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
          {section.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {section.subsections?.map((subsection) => (
        <div className="mt-6" key={subsection.title}>
          <h3 className="text-base font-semibold text-slate-950">
            {subsection.title}
          </h3>
          {subsection.body?.map((paragraph) => (
            <p className="mt-3 text-sm leading-7 text-slate-700" key={paragraph}>
              {paragraph}
            </p>
          ))}
          {subsection.bullets ? (
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700">
              {subsection.bullets.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </section>
  );
}

export function LegalDocumentPage({ document }: { document: LegalDocument }) {
  return (
    <main className="min-h-screen bg-[#f5f7fc] px-5 py-8 text-slate-950 md:px-10 md:py-12">
      <div className="mx-auto max-w-[920px]">
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

        <article className="mt-10 rounded-[14px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] md:p-10">
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">
            HiTeam legal
          </p>
          <h1 className="mt-4 text-[clamp(2.1rem,5vw,3.5rem)] leading-[1.02] font-bold tracking-[-0.03em] text-slate-950">
            {document.title}
          </h1>
          <p className="mt-3 text-lg font-semibold text-slate-700">
            {document.subtitle}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">{document.edition}</p>

          {document.intro?.map((paragraph) => (
            <p className="mt-6 text-sm leading-7 text-slate-700" key={paragraph}>
              {paragraph}
            </p>
          ))}

          <div className="mt-10 grid gap-8">
            {document.sections.map((section) => (
              <LegalSection key={section.title} section={section} />
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
