import FinanceOperationsPage from "@/components/finance/FinanceOperationsPage";
export default function BillingPage({ params }: { params: Promise<{ orgId: string }> }) { return <FinanceOperationsPage params={params} mode="billing" />; }
