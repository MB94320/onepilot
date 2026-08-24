import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function MarginsPage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="margins" />; }
