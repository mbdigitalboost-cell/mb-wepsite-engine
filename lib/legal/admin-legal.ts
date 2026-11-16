import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ConsentEvidence } from "@/lib/legal/marketing-consent";
import type { LegalDocumentKind } from "@/lib/supabase/types";

/**
 * Faz 33 — admin okumaları (oturumlu client; RLS editor+). Her sorgu
 * store_id ile filtrelenir; tablo yoksa (migration uygulanmadıysa) boş döner.
 */
export const LEGAL_KIND_LABELS: Record<LegalDocumentKind, string> = {
  pre_information: "Ön Bilgilendirme Formu",
  distance_sales: "Mesafeli Satış Sözleşmesi",
  returns: "İade ve Cayma Koşulları",
  withdrawal_form: "Cayma Formu",
  privacy_kvkk: "KVKK Aydınlatma Metni",
  cookies: "Çerez Politikası",
};

export const LEGAL_KINDS = Object.keys(LEGAL_KIND_LABELS) as LegalDocumentKind[];

export function isLegalKind(value: string): value is LegalDocumentKind {
  return (LEGAL_KINDS as string[]).includes(value);
}

export interface AdminLegalVersion {
  id: string;
  kind: LegalDocumentKind;
  title: string;
  body: string;
  version: number;
  reviewedByLawyer: boolean;
  reviewedAt: string | null;
  createdAt: string;
}

export async function listLegalVersions(storeId: string, kind?: LegalDocumentKind): Promise<{ versions: AdminLegalVersion[]; available: boolean }> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("store_legal_documents")
    .select("id, store_id, kind, title, body, version, reviewed_by_lawyer, reviewed_at, created_at")
    .eq("store_id", storeId)
    .order("version", { ascending: false });
  if (kind) query = query.eq("kind", kind);
  const { data, error } = await query;
  if (error) return { versions: [], available: false };
  return {
    available: true,
    versions: (data ?? [])
      .filter((row) => row.store_id === storeId)
      .map((row) => ({
        id: row.id,
        kind: row.kind,
        title: row.title,
        body: row.body,
        version: row.version,
        reviewedByLawyer: row.reviewed_by_lawyer,
        reviewedAt: row.reviewed_at,
        createdAt: row.created_at,
      })),
  };
}

/** Aboneler: siparişlerdeki ticari ileti onayları (kişi bazında en son kayıt karar verir). */
export async function loadMarketingConsentEvidence(storeId: string): Promise<ConsentEvidence[]> {
  const supabase = await createSupabaseServerClient();
  const { data: acceptances, error } = await supabase
    .from("order_legal_acceptances")
    .select("order_id, marketing_consent, accepted_at")
    .eq("store_id", storeId);
  if (error || !acceptances || acceptances.length === 0) return [];
  const orderIds = acceptances.map((row) => row.order_id);
  const contacts = new Map<string, { email: string | null; phone: string | null }>();
  for (let index = 0; index < orderIds.length; index += 150) {
    const { data: orders } = await supabase
      .from("orders")
      .select("id, customer_email, customer_phone")
      .eq("store_id", storeId)
      .in("id", orderIds.slice(index, index + 150));
    for (const order of orders ?? []) contacts.set(order.id, { email: order.customer_email, phone: order.customer_phone });
  }
  return acceptances
    .filter((row) => contacts.has(row.order_id))
    .map((row) => ({ ...contacts.get(row.order_id)!, consent: row.marketing_consent, at: row.accepted_at }));
}
