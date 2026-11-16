import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LEGAL_KINDS, LEGAL_KIND_LABELS, listLegalVersions } from "@/lib/legal/admin-legal";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { LEGAL_PAGE_LINKS } from "@/lib/legal/links";

/**
 * Faz 33 — Mağaza → Yasal Metinler (liste). Her metnin son sürümü, hukukçu
 * kontrol durumu ve vitrindeki adresi.
 */
export default async function LegalDocumentsPage({ params }: { params: Promise<{ customerId: string; storeId: string }> }) {
  const { customerId, storeId } = await params;
  await requireStoreEditorAccess(storeId, customerId);
  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name, slug").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const { versions, available } = await listLegalVersions(storeId);
  const origin = findStoreSiteBySlug(store.slug)?.canonicalOrigin ?? null;
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/legal`;

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-semibold tracking-tight">Yasal Metinler</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ön bilgilendirme, mesafeli satış sözleşmesi, iade/cayma, KVKK ve çerez metinleri. Metinler mağaza ve sipariş bilgileriyle otomatik doldurulur; her
        yayımlama yeni bir sürümdür ve siparişler onayladıkları sürümü saklar.
      </p>
      {!available ? <p className="mt-3 text-sm text-amber-700">Tablo bulunamadı — migration 0048 ve 0049 henüz uygulanmamış olabilir.</p> : null}

      <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
        {LEGAL_KINDS.map((kind) => {
          const latest = versions.find((version) => version.kind === kind) ?? null;
          const path = LEGAL_PAGE_LINKS.find((link) => link.kind === kind)?.path ?? null;
          return (
            <li key={kind} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
              <div>
                <Link href={`${base}/${kind}`} className="font-medium hover:underline">
                  {LEGAL_KIND_LABELS[kind]}
                </Link>
                <p className="mt-0.5 text-xs text-foreground/60">
                  {latest ? `Sürüm ${latest.version} · ${new Date(latest.createdAt).toLocaleDateString("tr-TR")}` : "Henüz yayımlanmadı — vitrinde sayfa yok."}
                  {origin && path && latest ? (
                    <>
                      {" · "}
                      <a href={`${origin}${path}`} target="_blank" rel="noreferrer" className="font-mono text-[#B34C00] hover:underline">
                        {path}
                      </a>
                    </>
                  ) : null}
                </p>
              </div>
              {latest ? (
                latest.reviewedByLawyer ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs text-green-800">Hukukçu kontrol etti</span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs text-amber-900">Şablon — hukukçu kontrolü bekliyor</span>
                )
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
