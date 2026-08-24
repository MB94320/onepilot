import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function SharingPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="sharing" />; }
