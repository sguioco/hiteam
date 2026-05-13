import AdminShellLoadingFrame from "@/components/admin-shell-loading-frame";

export default function ActivityLoading() {
  return (
    <AdminShellLoadingFrame
      activeHref="/activity"
      label="Загружаем активность"
      locale="ru"
    />
  );
}
