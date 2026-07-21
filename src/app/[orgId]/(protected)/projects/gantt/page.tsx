import ProjectManagementPage from "@/components/projects/ProjectManagementPage";

export default function ProjectGanttPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  return <ProjectManagementPage params={params} mode="gantt" />;
}
