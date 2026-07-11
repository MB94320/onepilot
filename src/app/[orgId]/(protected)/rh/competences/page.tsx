import HrTalentModulePage from "@/components/hr/HrTalentModulePage";

type PageParams = {
  orgId: string;
};

export default function HrSkillsPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  return <HrTalentModulePage params={params} moduleKey="skills" />;
}
