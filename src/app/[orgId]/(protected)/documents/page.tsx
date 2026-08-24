import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function DocumentsPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="documents" />; }
