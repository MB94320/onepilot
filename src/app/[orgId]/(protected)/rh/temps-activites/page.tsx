import HrTimeActivitiesPage from "@/components/hr/HrTimeActivitiesPage";

type PageParams = { orgId: string };

export default function Page({ params }: { params: Promise<PageParams> }) {
  return <HrTimeActivitiesPage params={params} />;
}
