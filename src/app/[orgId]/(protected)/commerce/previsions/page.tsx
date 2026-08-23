import CommercialForecastPage from "@/components/commerce/CommercialForecastPage";

export default function ForecastPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <CommercialForecastPage params={params} />;
}
