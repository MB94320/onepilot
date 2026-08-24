import { UnifiedModulePage } from "@/components/platform/UnifiedModulePage";
export default function QualityDocumentsPage({ params }: { params: Promise<{ orgId: string }> }) { return <UnifiedModulePage params={params} mode="qualityDocuments" />; }
