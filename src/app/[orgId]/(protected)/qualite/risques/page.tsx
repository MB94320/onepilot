import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function RisksPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="risks" />; }
