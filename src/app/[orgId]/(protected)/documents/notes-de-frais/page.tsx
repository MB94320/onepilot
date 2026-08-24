import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function ExpensesPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="expenses" />; }
