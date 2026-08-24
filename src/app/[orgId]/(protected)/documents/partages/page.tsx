import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function SharingPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="sharing" />; }
