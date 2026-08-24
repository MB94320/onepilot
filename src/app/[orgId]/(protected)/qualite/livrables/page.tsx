import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function DeliverablesPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="deliverables" />; }
