import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { findStoreSiteBySlug } from "@/lib/sites/registry";

/**
 * Faz 29 — müşteri bağlamı şeridi. Her mağaza ekranının üstünde, kaydırınca
 * da görünür: "Müşteri · Mağaza · domain". Ajans çalışanı birden çok
 * müşteride çalışırken yanlış müşteride işlem yapmasın diye.
 *
 * Domain lib/sites/registry.ts'ten (mağazanın Vercel projesi/SITE_KEY'i);
 * kaydı olmayan mağazada "yayın sitesi yok" yazar (ör. Petra müşterisinin
 * boş petra-muhendislik mağazası — hiçbir domainde açılmıyor).
 *
 * Guard burada da çalışır: URL'deki müşteri mağazanın gerçek müşterisi
 * değilse sayfa hiç render edilmez (404).
 */
export default async function StoreScopeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: customer }] = await Promise.all([
    supabase.from("stores").select("name, slug").eq("id", storeId).maybeSingle(),
    supabase.from("customers").select("name").eq("id", customerId).maybeSingle(),
  ]);

  const site = store ? findStoreSiteBySlug(store.slug) : undefined;
  const domain = site ? new URL(site.canonicalOrigin).host.replace(/^www\./, "") : null;

  return (
    <>
      <div
        role="note"
        aria-label="Çalışılan müşteri"
        className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-[#E4E4E7] bg-[#FFF7ED] px-6 py-2 text-xs text-[#17171A]"
      >
        <span className="font-semibold tracking-wide text-[#B34C00] uppercase">Müşteri</span>
        <span className="font-semibold">{customer?.name ?? "—"}</span>
        <span className="text-[#A1A1AA]">·</span>
        <span>{store?.name ?? "—"}</span>
        <span className="text-[#A1A1AA]">·</span>
        {domain ? (
          <a href={site?.canonicalOrigin} target="_blank" rel="noreferrer" className="font-mono text-[#B34C00] hover:underline">
            {domain}
          </a>
        ) : (
          <span className="text-[#71717A]">yayın sitesi yok</span>
        )}
      </div>
      {children}
    </>
  );
}
