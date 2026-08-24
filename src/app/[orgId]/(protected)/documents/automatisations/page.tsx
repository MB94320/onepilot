import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function AutomationsPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="automations" />; }
