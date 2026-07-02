// src/app/[orgId]/page.tsx
import { redirect } from "next/navigation";
import { use } from "react";

export default function OrgaPage({ params }: { params: Promise<{ orgId: string }> }) {
  // On déballe la Promise ici
  const { orgId } = use(params);
  
  redirect(`/${orgId}/dashboard`);
}