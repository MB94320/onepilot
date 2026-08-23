import PlatformAccessPage from "@/components/access/PlatformAccessPage";

export default function AccessSharingPage({ params }: { params: Promise<{ orgId: string }> }) {
  return <PlatformAccessPage params={params} />;
}
