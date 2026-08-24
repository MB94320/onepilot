import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function DocumentsPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="documents" />; }
