import { redirect } from "next/navigation";

export default async function LegacyAutomationsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/documents/automatisations`);
}
