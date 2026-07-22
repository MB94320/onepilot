import ProjectDetailPage from "@/components/projects/ProjectDetailPage";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ orgId: string; id: string }>;
}) {
  return <ProjectDetailPage params={params} />;
}
