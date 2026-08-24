import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function CashPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="cash" />; }
