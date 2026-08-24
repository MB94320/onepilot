import PilotageModulePage from "@/components/pilotage/PilotageModulePage";
export default function ObjectivesPage({ params }: { params: Promise<{ orgId: string }> }) { return <PilotageModulePage params={params} mode="objectives" />; }
