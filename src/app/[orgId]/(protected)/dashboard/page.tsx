import PilotageModulePage from "@/components/pilotage/PilotageModulePage";

export default function DashboardPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <PilotageModulePage params={params} mode="dashboard" />;
}
