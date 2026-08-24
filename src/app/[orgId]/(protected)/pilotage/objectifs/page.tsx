import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function ObjectivesPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="objectives" />; }
