import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublishedLegalDocuments, loadLegalStoreContext, renderPublishedDocument } from "@/lib/legal/store-legal";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";
import type { LegalDocumentKind } from "@/lib/supabase/types";
import { LegalMarkdown } from "./legal-markdown";
import { PrintButton } from "./print-button";

/**
 * Faz 33 — mağazanın yayımlanmış yasal metnini (son sürüm) mağaza
 * bilgileriyle doldurup gösterir. Sipariş değişkenleri burada boştur
 * (o satırlar çıkar ya da "|varsayılan" metni yazılır); siparişe özel,
 * doldurulmuş metin ödeme adımında ve "Siparişlerim"de gösterilir.
 * Metin yayımlanmamışsa 404.
 */
export async function legalDocumentMetadata(storeSlug: string, kind: LegalDocumentKind): Promise<Metadata> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return {};
  const document = (await getPublishedLegalDocuments(store.id)).get(kind);
  return document ? { title: { absolute: `${document.title} | ${store.name}` } } : {};
}

export async function LegalDocumentPage({ storeSlug, kind, printable = false }: { storeSlug: string; kind: LegalDocumentKind; printable?: boolean }) {
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();
  const [documents, context] = await Promise.all([getPublishedLegalDocuments(store.id), loadLegalStoreContext(store)]);
  const document = documents.get(kind);
  if (!document) notFound();
  const rendered = renderPublishedDocument(document, context);

  return (
    <div className="min-h-screen bg-[#0A0A0A] print:bg-white">
      <Container className="max-w-3xl py-10">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5] print:text-black`}>{rendered.title}</h1>
          {printable ? <PrintButton /> : null}
        </div>
        <p className="mt-1 text-xs text-[#737373]">Sürüm {rendered.version}</p>
        <div className="mt-6 print:text-black">
          <LegalMarkdown source={rendered.text} />
        </div>
      </Container>
    </div>
  );
}
