import AdministrationModulePage from "@/components/admin/AdministrationModulePage";

export default function SubscriptionsPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <AdministrationModulePage params={params} mode="subscriptions" />;
}
