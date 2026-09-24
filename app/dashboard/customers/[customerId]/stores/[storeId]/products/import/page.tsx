import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { validateImportAction, commitImportAction } from "./actions";
import { ImportClient } from "./import-client";

/**
 * FAZ 2C-7 STEP 26, extended FAZ 2C STEP 27 (XLSX import), STEP 28
 * (formula rejection), STEP 29 (XLSX template download) — bulk product
 * import. store_editor+ only (same tier as manual product create/update —
 * RLS `products_insert_editor_tier` / `products_update_editor_tier` is
 * the real, final gate either way; this route's own
 * `requireStoreEditorAccess` call is the same fast UX check every other
 * write route in this codebase already uses, not a new auth model).
 */
export default async function ProductImportPage({
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

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}/products`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name} · Products
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Toplu Ürün İçe Aktarma</h1>
      <p className="mt-1 text-sm text-foreground/60">
        CSV veya XLSX dosyasından ürün ekleyin/güncelleyin. SKU eşleşirse mevcut ürün güncellenir, eşleşmezse yeni
        ürün oluşturulur. Dosyada olmayan mevcut ürünler asla değiştirilmez veya silinmez. Kategori/marka önceden
        oluşturulmuş olmalı — import otomatik yeni kategori/marka oluşturmaz.
      </p>

      <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-foreground/50">
        <a
          href={`/dashboard/customers/${customerId}/stores/${storeId}/products/import/template`}
          className="text-brand-accent underline-offset-2 hover:underline"
        >
          Örnek şablonu indir (CSV)
        </a>
        <span className="text-foreground/30">·</span>
        <a
          href={`/dashboard/customers/${customerId}/stores/${storeId}/products/import/template/xlsx`}
          className="text-brand-accent underline-offset-2 hover:underline"
        >
          XLSX Şablonu İndir
        </a>
      </p>
      <p className="mt-1 text-xs text-foreground/40">Excel ile ürün yüklemek için XLSX şablonunu indirin.</p>

      <div className="mt-6">
        <ImportClient
          validateAction={validateImportAction.bind(null, customerId, storeId)}
          commitAction={commitImportAction.bind(null, customerId, storeId)}
        />
      </div>
    </div>
  );
}
