import { LegalDocumentPage, legalDocumentMetadata } from "@/components/commerce/public/legal/legal-document-page";

/** Faz 33 — temiz adres: /cayma-formu (lib/sites/store-paths.ts). */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return legalDocumentMetadata(storeSlug, "withdrawal_form");
}

export default async function Page({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  return <LegalDocumentPage storeSlug={storeSlug} kind="withdrawal_form" printable />;
}
