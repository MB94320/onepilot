import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function CollectionsPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="collections" />; }
