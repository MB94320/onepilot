import CommerceEntityPage from "@/components/commerce/CommerceEntityPage";

export default function OffersPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <CommerceEntityPage params={params} mode="offers" />;
}
