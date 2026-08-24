import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function UsersPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="users" />;
}
