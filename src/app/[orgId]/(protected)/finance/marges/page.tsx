import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function MarginsPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="margins" />; }
