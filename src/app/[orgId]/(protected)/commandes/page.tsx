import CommerceEntityPage from "@/components/commerce/CommerceEntityPage";

export default function OrdersPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <CommerceEntityPage params={params} mode="orders" />;
}
