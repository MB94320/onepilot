import DocumentToolsPage from "@/components/platform/DocumentToolsPage";
export default function AutomationsPage({ params }: { params: Promise<{ orgId: string }> }) { return <DocumentToolsPage params={params} mode="automations" />; }
