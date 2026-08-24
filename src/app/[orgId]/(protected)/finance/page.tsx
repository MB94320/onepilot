import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function FinancePage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="overview" />; }
