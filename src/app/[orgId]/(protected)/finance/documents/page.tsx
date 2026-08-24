import { redirect } from "next/navigation";

export default async function LegacyFinanceDocumentsPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = await params;
  redirect(`/${orgId}/documents/bibliotheque`);
}
