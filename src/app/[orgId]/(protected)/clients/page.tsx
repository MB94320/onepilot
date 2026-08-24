import CommerceEntityPage from "@/components/commerce/CommerceEntityPage";

export default function ClientsPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <CommerceEntityPage params={params} mode="clients" />;
}
