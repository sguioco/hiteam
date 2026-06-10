import AdminShellLoadingFrame from "@/components/admin-shell-loading-frame";

export default function ActivityLoading() {
  return (
    <AdminShellLoadingFrame
      activeHref="/activity"
      label={{
        en: "Loading activity",
        ru: "Загружаем активность",
      }}
    />
  );
}
