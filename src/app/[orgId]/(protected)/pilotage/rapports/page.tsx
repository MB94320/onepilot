import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function ReportsPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="reports" />; }
