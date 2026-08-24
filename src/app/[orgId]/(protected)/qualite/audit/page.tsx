import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function AuditsPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="audits" />; }
