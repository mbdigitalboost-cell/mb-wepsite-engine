import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WebsiteForm } from "./website-form";

export default async function NewWebsitePage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  await requireAdmin();
  const { customerId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("id, name")
    .eq("id", customerId)
    .maybeSingle();

  if (!customer) {
    notFound();
  }

  return (
    <div>
      <p className="text-xs font-medium text-foreground/50">{customer.name}</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight">Yeni Website</h1>
      <div className="mt-6">
        <WebsiteForm customerId={customerId} />
      </div>
    </div>
  );
}
