import type { LegalDocumentKind } from "@/lib/supabase/types";

/**
 * Faz 33 — vitrinin yasal sayfaları (temiz adresler; lib/sites/store-paths.ts
 * CLEAN_STORE_PREFIXES ile birlikte). `kind` yoksa sayfa bir metne değil
 * satıcı kaydına bağlıdır (/iletisim). Altbilgi, İletişim sayfası ve sitemap
 * aynı listeyi kullanır.
 */
export const LEGAL_PAGE_LINKS: ReadonlyArray<{ path: string; label: string; kind: LegalDocumentKind | null }> = [
  { path: "/sozlesmeler/on-bilgilendirme", label: "Ön Bilgilendirme Formu", kind: "pre_information" },
  { path: "/sozlesmeler/mesafeli-satis", label: "Mesafeli Satış Sözleşmesi", kind: "distance_sales" },
  { path: "/iade-ve-cayma", label: "İade ve Cayma Koşulları", kind: "returns" },
  { path: "/cayma-formu", label: "Cayma Formu", kind: "withdrawal_form" },
  { path: "/kvkk", label: "KVKK Aydınlatma Metni", kind: "privacy_kvkk" },
  { path: "/cerez-politikasi", label: "Çerez Politikası", kind: "cookies" },
  { path: "/iletisim", label: "İletişim", kind: null },
];

/** Temiz adres önekleri (store-paths.ts bunları rewrite eder). */
export const LEGAL_PATH_PREFIXES = ["/sozlesmeler", "/iade-ve-cayma", "/cayma-formu", "/kvkk", "/cerez-politikasi", "/iletisim"] as const;
