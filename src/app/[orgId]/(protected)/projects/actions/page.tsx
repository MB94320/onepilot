import ProjectManagementPage from "@/components/projects/ProjectManagementPage";

export default function ProjectActionsPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  return <ProjectManagementPage params={params} mode="actions" />;
}
