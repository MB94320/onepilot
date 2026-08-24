import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function ProcessesPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="processes" />; }
