import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function ExpensesPage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="expenses" />; }
