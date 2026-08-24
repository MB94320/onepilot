import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function CollectionsPage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="collections" />; }
