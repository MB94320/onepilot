import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function FinancePage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="finance" />; }
