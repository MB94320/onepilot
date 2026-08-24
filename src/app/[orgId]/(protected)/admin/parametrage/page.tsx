import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function SettingsPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="settings" />;
}
