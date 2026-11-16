import { LegalDocumentPage, legalDocumentMetadata } from "@/components/commerce/public/legal/legal-document-page";

/** Faz 33 — temiz adres: /kvkk (lib/sites/store-paths.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return legalDocumentMetadata(storeSlug, "privacy_kvkk");
}

export default async function Page({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return <LegalDocumentPage storeSlug={storeSlug} kind="privacy_kvkk" />;
}
