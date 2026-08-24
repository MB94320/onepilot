import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function QualityPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="quality" />; }
