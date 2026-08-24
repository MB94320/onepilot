import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function LibraryPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="library" />; }
