import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function ProcessesPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="processes" />; }
