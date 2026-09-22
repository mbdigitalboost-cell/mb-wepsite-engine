import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ProductForm } from "../product-form";
import { createProductAction } from "../actions";
import { ProductTabs } from "../[productId]/product-tabs";

/**
 * Create mode of the unified product screen (see [productId]/page.tsx's
 * own doc comment). Only Temel Bilgiler is usable — there is no
 * productId yet for Görseller/Varyantlar/Ek Ürün Alanları to attach to
 * — the other 3 tabs render locked via ProductTabs's own `mode="create"`
 * handling. On successful save, createProductAction (unchanged action
 * logic, only its redirect target changed — see products/actions.ts)
 * sends the admin straight to the new product's Görseller tab.
 */
export default async function NewProductPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const [{ data: categories }, { data: brands }] = await Promise.all([
    supabase.from("categories").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
    supabase.from("brands").select("id, name").eq("store_id", storeId).order("name", { ascending: true }),
  ]);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}/products`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name} · Products
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Yeni Ürün</h1>

      <div className="mt-6">
        <ProductTabs
          mode="create"
          initialTab="basic"
          basicContent={
            <ProductForm
              categoryOptions={categories ?? []}
              brandOptions={brands ?? []}
              action={createProductAction.bind(null, customerId, storeId)}
              submitLabel="Ürün Oluştur"
            />
          }
        />
      </div>
    </div>
  );
}
