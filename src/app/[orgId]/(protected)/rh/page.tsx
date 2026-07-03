import { redirect } from "next/navigation";

type RhPageProps = {
  params: Promise<{
    orgId: string;
  }>;
};

export default async function RhPage({
  params,
}: RhPageProps) {
  const { orgId } = await params;

  redirect(
    `/${encodeURIComponent(
      orgId,
    )}/rh/ressources`,
  );
}