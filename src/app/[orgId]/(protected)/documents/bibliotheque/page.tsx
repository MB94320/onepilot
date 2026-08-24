import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function LibraryPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="library" />; }
