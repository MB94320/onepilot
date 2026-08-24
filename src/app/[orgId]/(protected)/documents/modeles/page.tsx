import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function TemplatesPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="templates" />; }
