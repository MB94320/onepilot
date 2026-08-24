import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function BillingPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="billing" />; }
