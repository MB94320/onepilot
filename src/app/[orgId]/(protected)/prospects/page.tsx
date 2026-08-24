import CommerceEntityPage from "@/components/commerce/CommerceEntityPage";

export default function ProspectsPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <CommerceEntityPage params={params} mode="prospects" />;
}
