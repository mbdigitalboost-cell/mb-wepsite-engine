import "server-only";

import { createSupabasePublicClient } from "@/lib/supabase/public";
import { getShippingFeeSettings } from "@/lib/commerce/public/shipping-fee-settings";
import { getReturnSettings } from "@/lib/commerce/returns/service";
import { isCardPaymentEnabled } from "@/lib/integrations/store-payment-integration";
import { CARD_PAYMENT_METHOD, PAYMENT_METHODS } from "@/lib/validation/order";
import { findStoreSiteBySlug } from "@/lib/sites/registry";
import { buildLegalValues, type LegalOrderContext, type LegalStoreContext, type SellerIdentity } from "@/lib/legal/context";
import { renderLegalTemplate } from "@/lib/legal/template";
import type { LegalDocumentKind } from "@/lib/supabase/types";

/**
 * Faz 33 — vitrinin yasal metin verisi (sunucu). Her okuma store_id ile
 * filtrelenir ve RLS'li public client'la yapılır (store_seller_profiles:
 * yayındaki mağaza; store_public_legal_documents: aktif mağazanın son
 * sürümü) — bir mağazanın metni başka mağazada görünmez. Tablo yoksa
 * (migration henüz uygulanmadıysa) ya da okuma hata verirse sessizce boş
 * döner: sayfalar 404 olur, ödeme adımında onay kutusu çıkmaz, eski akış
 * bozulmaz.
 */

export interface PublishedLegalDocument {
  id: string;
  kind: LegalDocumentKind;
  title: string;
  body: string;
  version: number;
}

export async function getSellerIdentity(storeId: string): Promise<SellerIdentity | null> {
  const client = createSupabasePublicClient();
  const { data, error } = await client
    .from("store_seller_profiles")
    .select("legal_name, owner_name, tax_number, tax_office, mersis_number, address, phone, email, kep_address, etbis_info, etbis_url")
    .eq("store_id", storeId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    legalName: data.legal_name,
    ownerName: data.owner_name,
    taxNumber: data.tax_number,
    taxOffice: data.tax_office,
    mersisNumber: data.mersis_number,
    address: data.address,
    phone: data.phone,
    email: data.email,
    kepAddress: data.kep_address,
    etbisInfo: data.etbis_info,
    etbisUrl: data.etbis_url,
  };
}

export async function getPublishedLegalDocuments(storeId: string): Promise<Map<LegalDocumentKind, PublishedLegalDocument>> {
  const client = createSupabasePublicClient();
  const { data, error } = await client.from("store_public_legal_documents").select("id, store_id, kind, title, body, version").eq("store_id", storeId);
  const map = new Map<LegalDocumentKind, PublishedLegalDocument>();
  if (error || !data) return map;
  for (const row of data) {
    if (row.store_id !== storeId) continue; // ikinci savunma: başka mağazanın satırı asla
    map.set(row.kind, { id: row.id, kind: row.kind, title: row.title, body: row.body, version: row.version });
  }
  return map;
}

export async function loadLegalStoreContext(store: { id: string; name: string; slug: string }): Promise<LegalStoreContext> {
  const [seller, shipping, returns, cardEnabled] = await Promise.all([
    getSellerIdentity(store.id),
    getShippingFeeSettings(store.id),
    getReturnSettings(store.id),
    isCardPaymentEnabled(store.id),
  ]);
  return {
    storeName: store.name,
    siteUrl: findStoreSiteBySlug(store.slug)?.canonicalOrigin ?? null,
    seller,
    shipping,
    returns: {
      enabled: returns.returnsEnabled,
      windowDays: returns.returnWindowDays,
      carrierName: returns.carrierName,
      code: returns.returnCode,
      instructions: returns.instructions,
      address: returns.address,
    },
    paymentMethods: cardEnabled ? [...PAYMENT_METHODS, CARD_PAYMENT_METHOD] : [...PAYMENT_METHODS],
    cardPaymentEnabled: cardEnabled,
  };
}

export interface RenderedLegalDocument {
  documentId: string;
  version: number;
  title: string;
  text: string;
}

export function renderPublishedDocument(
  document: PublishedLegalDocument,
  context: LegalStoreContext,
  order?: LegalOrderContext | null,
): RenderedLegalDocument {
  return {
    documentId: document.id,
    version: document.version,
    title: document.title,
    text: renderLegalTemplate(document.body, buildLegalValues(context, order)),
  };
}

/** Ödeme adımında onay kutusu gerekli mi? (iki metin de yayımlanmışsa) */
export function checkoutRequiresLegalAcceptance(documents: Map<LegalDocumentKind, PublishedLegalDocument>): boolean {
  return documents.has("pre_information") && documents.has("distance_sales");
}
