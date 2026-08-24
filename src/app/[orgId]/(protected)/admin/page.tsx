import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function AdminPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="overview" />;
}
