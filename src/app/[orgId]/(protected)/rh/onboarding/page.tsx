import HrOnboardingPage from "@/components/hr/HrOnboardingPage";

type PageParams = { orgId: string };

export default function Page({ params }: { params: Promise<PageParams> }) {
  return <HrOnboardingPage params={params} />;
}
