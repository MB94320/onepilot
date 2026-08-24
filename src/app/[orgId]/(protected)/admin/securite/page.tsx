import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function SecurityPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="security" />;
}
