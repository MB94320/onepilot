import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function OrganizationsPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="organizations" />;
}
