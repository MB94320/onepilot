import PilotageModulePage from "@/components/pilotage/PilotageModulePage";
export default function ReportsPage({ params }: { params: Promise<{ orgId: string }> }) { return <PilotageModulePage params={params} mode="reports" />; }
