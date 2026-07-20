import { redirect } from "next/navigation";

type PageParams = { orgId: string };

export default async function Page({ params }: { params: Promise<PageParams> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/rh/temps-activites`);
}
