import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function CashPage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="cash" />; }
