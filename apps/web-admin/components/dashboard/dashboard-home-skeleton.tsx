function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[24px] bg-slate-200/80 ${className}`} />;
}

export function DashboardHomeSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading dashboard" className="grid gap-5 xl:grid-cols-[300px_minmax(0,1.45fr)_320px]">
      <aside className="space-y-5">
        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <SkeletonBlock className="h-10 w-32" />
          <div className="mt-5 flex gap-2">
            <SkeletonBlock className="h-10 flex-1 rounded-full" />
            <SkeletonBlock className="h-10 flex-1 rounded-full" />
          </div>
          <div className="mt-6 space-y-3">
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
            <SkeletonBlock className="h-16 w-full" />
          </div>
          <SkeletonBlock className="mt-6 h-11 w-full rounded-full" />
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <SkeletonBlock className="h-4 w-28" />
              <SkeletonBlock className="h-3 w-20" />
            </div>
          </div>
        </div>
      </aside>

      <div className="space-y-5">
        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SkeletonBlock className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <SkeletonBlock className="h-5 w-36" />
                <SkeletonBlock className="h-4 w-24" />
              </div>
            </div>
            <div className="hidden gap-2 sm:flex">
              <SkeletonBlock className="h-10 w-36 rounded-full" />
              <SkeletonBlock className="h-10 w-28 rounded-full" />
            </div>
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="flex gap-3">
            <SkeletonBlock className="h-11 w-24 rounded-full" />
            <SkeletonBlock className="h-11 w-24 rounded-full" />
            <SkeletonBlock className="h-11 w-24 rounded-full" />
          </div>
          <SkeletonBlock className="mt-5 h-[320px] w-full rounded-[28px]" />
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <div className="grid gap-3 sm:grid-cols-3">
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-36 w-full" />
            <SkeletonBlock className="h-36 w-full" />
          </div>
        </div>
      </div>

      <aside className="space-y-5">
        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <SkeletonBlock className="h-6 w-32" />
          <div className="mt-5 space-y-4">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
        <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <SkeletonBlock className="h-6 w-28" />
          <SkeletonBlock className="mt-5 h-[180px] w-full rounded-[28px]" />
        </div>
      </aside>
    </section>
  );
}
