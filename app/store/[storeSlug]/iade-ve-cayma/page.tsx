import { LegalDocumentPage, legalDocumentMetadata } from "@/components/commerce/public/legal/legal-document-page";

/** Faz 33 — temiz adres: /iade-ve-cayma (lib/sites/store-paths.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return legalDocumentMetadata(storeSlug, "returns");
}

export default async function Page({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return <LegalDocumentPage storeSlug={storeSlug} kind="returns" />;
}
