import { DashboardHomeSkeleton } from "@/components/dashboard/dashboard-home-skeleton";

export default function AppLoading() {
  return (
    <main className="min-h-screen bg-[color:var(--background)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1560px]">
        <DashboardHomeSkeleton />
      </div>
    </main>
  );
}
