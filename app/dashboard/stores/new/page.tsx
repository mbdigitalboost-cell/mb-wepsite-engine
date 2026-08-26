import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StoreForm } from "./store-form";

export default async function NewStorePage() {
  await requireAdmin();

  const supabase = await createSupabaseServerClient();
  const { data: customers, error } = await supabase
    .from("customers")
    .select("id, name")
    .eq("status", "active")
    .order("name");

  return (
    <div>
      <h1 className="text-xl font-semibold tracking-tight">Yeni Mağaza</h1>
      <div className="mt-6">
        {error ? (
          <p className="text-sm text-red-600">Müşteri listesi yüklenemedi: {error.message}</p>
        ) : (
          <StoreForm customers={customers ?? []} />
        )}
      </div>
    </div>
  );
}
