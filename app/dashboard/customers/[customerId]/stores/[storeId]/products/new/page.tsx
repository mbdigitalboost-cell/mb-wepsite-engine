import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createDraftProductAction } from "../actions";
import { NewProductButton } from "../new-product-button";

/**
 * Faz 27 Kısım B — eski /products/new adresi (yer imleri için). Sayfa
 * açılınca KENDİLİĞİNDEN satır oluşturmaz (GET'te yan etki, link
 * prefetch'lerinde istenmeyen taslaklar üretirdi); tek buton taslak ürünü
 * POST ile oluşturup tek sayfa formuna yönlendirir. Ürün listesindeki
 * "Yeni Ürün" butonu aynı action'ı doğrudan çağırır.
 */
export default async function NewProductPage({ params }: { params: Promise<{ customerId: string; storeId: string }> }) {
  const { customerId, storeId } = await params;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  return (
    <div>
      <Link href={`/dashboard/customers/${customerId}/stores/${storeId}/products`} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← {store.name} · Ürünler
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Yeni Ürün</h1>
      <div className="mt-6 max-w-lg rounded-xl border border-[#E4E4E7] bg-white p-5">
        <p className="text-sm text-[#17171A]">
          Yeni ürün bir <strong>taslak</strong> olarak oluşturulur: mağazada görünmez. Görsel, renk, kategori ve fiyatı tek sayfada
          ekleyip hazır olunca &quot;Yayınla&quot;ya basarsınız.
        </p>
        <form action={createDraftProductAction.bind(null, customerId, storeId)} className="mt-4">
          <NewProductButton label="Taslak oluştur ve düzenle" />
        </form>
      </div>
    </div>
  );
}
