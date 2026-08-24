import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function TemplatesPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="templates" />; }
