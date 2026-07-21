import ProjectManagementPage from "@/components/projects/ProjectManagementPage";

export default function ProjectTimelinePage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  return <ProjectManagementPage params={params} mode="timeline" />;
}
