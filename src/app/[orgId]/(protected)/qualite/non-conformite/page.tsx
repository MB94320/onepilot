import OperationalModulePage from "@/components/platform/OperationalModulePage";
export default function NonConformitiesPage({ params }: { params: Promise<{ orgId: string }> }) { return <OperationalModulePage params={params} mode="nonconformities" />; }
