import ProjectManagementPage from "@/components/projects/ProjectManagementPage";

export default function ProjectPerformancePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  return <ProjectManagementPage params={params} mode="performance" />;
}
