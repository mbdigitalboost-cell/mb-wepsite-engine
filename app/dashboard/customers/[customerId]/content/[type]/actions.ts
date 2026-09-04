"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCustomerWriteAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { getContentTypeConfig, isContentTypeKey, type ContentTypeConfig, type ContentTypeKey } from "@/lib/cms/dashboard/content-types";
import { buildContentFormSchema } from "@/lib/validation/content";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { ContentFormState } from "./form-state";
import type { ContentStatus } from "@/lib/cms/customer-types";

/**
 * One generic set of actions for all 6 list-shaped content types
 * (services/solutions/projects/campaigns/testimonials/faqs — see
 * lib/cms/dashboard/content-types.ts). `type` is always re-validated
 * against the known config, never trusted as a raw table name.
 *
 * Authorization: `requireCustomerWriteAccess(customerId)` — NOT
 * `requireAdmin()`. Unlike Phase 4's Platform Customer/Website CRUD
 * (intentionally admin-only), content management is something a
 * customer's own user should be able to do for their own customer too —
 * per Phase 6 §4: "Customer: yalnızca kendi müşterisini yönetebilir."
 * Every export here re-checks this itself, independent of which page
 * happened to render the form that called it.
 *
 * Phase 1 RBAC genişlemesi: `requireCustomerAccess` (okuma) yerine
 * `requireCustomerWriteAccess` kullanılıyor — bir `store_viewer` bu
 * müşterinin içeriğini görebilir ama buradan DEĞİŞTİREMEZ (bkz. o
 * fonksiyonun dosya yorumundaki dürüstlük notu: bu ayrımın RLS'te bir
 * karşılığı yok, tek uygulama noktası bu çağrı).
 */

/**
 * Faz 4D — her tipin GERÇEK public karşılığı, app/(public)/ altındaki
 * route dosyaları okunarak doğrulandı (bkz. FAZ 4D teşhis/uygulama
 * raporu): solutions → /cozumler, services → /hizmetler, projects →
 * /projeler, campaigns → /kampanyalar. testimonials/faqs/
 * product_showcase_items'ın kendi sayfası yok, yalnızca ana sayfada
 * (`/`) görünüyorlar — bu yüzden boş liste, ana sayfa kapsaması zaten
 * her üç fonksiyonda da ayrıca `revalidatePath("/", "layout")` ile
 * sağlanıyor (bkz. revalidatePublicPathsForType).
 */
const PUBLIC_LIST_PATHS: Record<ContentTypeKey, string[]> = {
  solutions: ["/cozumler"],
  services: ["/hizmetler"],
  projects: ["/projeler"],
  campaigns: ["/kampanyalar"],
  testimonials: [],
  faqs: [],
  product_showcase_items: [],
};

/**
 * SADECE `solutions`'ın gerçek bir slug bazlı detay sayfası var
 * (`/cozumler/[slug]`) — services/projects/campaigns/
 * product_showcase_items'ın hepsinde DB'de bir `slug` kolonu olsa da,
 * hiçbiri için app/(public)/ altında bir `[slug]` route'u YOK (glob ile
 * doğrulandı: hizmetler/projeler/kampanyalar altında [slug] klasörü
 * yok). Uydurma bir path eklenmedi.
 */
const PUBLIC_DETAIL_PATH_TEMPLATES: Partial<Record<ContentTypeKey, (slug: string) => string>> = {
  solutions: (slug) => `/cozumler/${slug}`,
};

/**
 * Ana sayfa (`"layout"` tipiyle — header/footer paylaşan HER public
 * route'u kapsar, sadece `/` değil, aynı FAZ 4B'deki site_settings
 * gerekçesiyle) + o tipin kendi liste sayfası varsa onu revalidate eder.
 * Detay sayfası revalidation'ı (yalnızca solutions) çağıran fonksiyonda
 * ayrıca, slug elde edilebiliyorsa yapılır.
 */
function revalidatePublicPathsForType(type: ContentTypeKey): void {
  revalidatePath("/", "layout");
  for (const path of PUBLIC_LIST_PATHS[type]) revalidatePath(path);
}

function readFormValues(config: ContentTypeConfig, formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = { sortOrder: formData.get("sortOrder") ?? 0 };
  for (const field of config.fields) {
    values[field.key] = formData.get(field.key);
  }
  return values;
}

function toRow(parsed: Record<string, unknown>, config: ContentTypeConfig): Record<string, unknown> {
  const row: Record<string, unknown> = { sort_order: parsed.sortOrder ?? 0 };
  for (const field of config.fields) {
    const value = parsed[field.key];
    row[field.key] = value === "" || value === undefined ? null : value;
  }
  return row;
}

export async function createContentItemAction(
  customerId: string,
  type: string,
  _prevState: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  if (!isContentTypeKey(type)) return { error: "Geçersiz içerik türü." };
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = buildContentFormSchema(type).safeParse(readFormValues(config, formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data, config);
  // `type` is a validated ContentTypeKey at runtime, but as a plain
  // `string` parameter it's broader than postgrest-js's table-name union,
  // which collapses Row/Insert/Update inference for a dynamic `.from()`
  // call (same issue worked around in lib/cms/adapters/shared.ts during
  // Phase 5). Casting the client to `any` for this one dynamic call keeps
  // the rest of the file (and every other table's static `.from(...)`
  // call) fully typed — only this generic engine needs it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment above
  const { data, error } = await (connection.client as any)
    .from(type)
    .insert({ ...row, status: "draft" as ContentStatus })
    .select("id")
    .single();

  if (error || !data) {
    return { error: `Kaydedilemedi: ${error?.message ?? "bilinmeyen hata"}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: `${config.auditPrefix}.create`,
    entityType: type,
    entityId: data.id,
    metadata: row as Record<string, string | number | boolean | null>,
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  // Faz 4D: yeni kayıt "draft" olarak başladığı için public'te henüz
  // görünmüyor (RLS status='published'), ama diğer iki action'la aynı
  // kapsamayı sağlamak için burada da çağrılıyor — boş bir path'i
  // revalidate etmek zararsız (no-op).
  revalidatePublicPathsForType(type);
  redirect(`/dashboard/customers/${customerId}/content/${type}/${data.id}`);
}

export async function updateContentItemAction(
  customerId: string,
  type: string,
  itemId: string,
  _prevState: ContentFormState,
  formData: FormData,
): Promise<ContentFormState> {
  if (!isContentTypeKey(type)) return { error: "Geçersiz içerik türü." };
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const parsed = buildContentFormSchema(type).safeParse(readFormValues(config, formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Geçersiz form." };

  const connection = await loadCustomerConnection(customerId);
  if (!connection) {
    return { error: "Petra Supabase bağlantısı henüz kurulmadı — ortam değişkenleri eksik olabilir." };
  }

  const row = toRow(parsed.data, config);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in createContentItemAction above
  const { error } = await connection.client.from(type as any).update(row).eq("id", itemId);

  if (error) {
    return { error: `Kaydedilemedi: ${error.message}` };
  }

  await logAuditEvent({
    userId: user.id,
    customerId,
    action: `${config.auditPrefix}.update`,
    entityType: type,
    entityId: itemId,
    metadata: row as Record<string, string | number | boolean | null>,
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  revalidatePath(`/dashboard/customers/${customerId}/content/${type}/${itemId}`);

  // Faz 4D: public tarafı da revalidate et (bkz. yukarıdaki sabitlerin
  // yorumu) — bu satırlar olmadan, `/` ve `/cozumler` gibi statik
  // üretilen sayfalar bir sonraki deploy'a kadar eski içeriği göstermeye
  // devam ediyordu (kanıt: FAZ 4D teşhis raporu).
  revalidatePublicPathsForType(type);
  const detailPathFor = PUBLIC_DETAIL_PATH_TEMPLATES[type];
  if (detailPathFor && typeof parsed.data.slug === "string" && parsed.data.slug) {
    revalidatePath(detailPathFor(parsed.data.slug));
  }

  return { error: null };
}

/**
 * Bound per-row/per-page via `.bind(null, customerId, type, itemId, nextStatus)`.
 * Publish system per Phase 6 §18: draft → published → archived, each a
 * separate explicit action, never an implicit side effect of save.
 */
export async function setContentItemStatusAction(
  customerId: string,
  type: string,
  itemId: string,
  nextStatus: ContentStatus,
): Promise<void> {
  if (!isContentTypeKey(type)) return;
  const config = getContentTypeConfig(type)!;
  const { user } = await requireCustomerWriteAccess(customerId);

  const connection = await loadCustomerConnection(customerId);
  if (!connection) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in createContentItemAction above
  const { error } = await connection.client.from(type as any).update({ status: nextStatus }).eq("id", itemId);
  if (error) {
    console.error(`[content/${type}] failed to set status:`, error.message);
    return;
  }

  const action =
    nextStatus === "published"
      ? `${config.auditPrefix}.publish`
      : nextStatus === "archived"
        ? `${config.auditPrefix}.archive`
        : `${config.auditPrefix}.update`;

  await logAuditEvent({
    userId: user.id,
    customerId,
    action,
    entityType: type,
    entityId: itemId,
    metadata: { status: nextStatus },
  });

  revalidatePath(`/dashboard/customers/${customerId}/content/${type}`);
  revalidatePath(`/dashboard/customers/${customerId}/content/${type}/${itemId}`);

  // Faz 4D: publish/archive de public'in status='published' filtreli
  // sorgusunu etkiler — aynı gerekçe, aynı kapsama.
  revalidatePublicPathsForType(type);
  const detailPathFor = PUBLIC_DETAIL_PATH_TEMPLATES[type];
  if (detailPathFor) {
    // Bu action form verisi almıyor (sadece itemId + nextStatus), yani
    // slug elde etmenin tek yolu satırı okumak — status değişikliğinden
    // SONRA, best-effort (başarısız olursa sadece detay sayfası eski
    // kalır, admin tarafındaki asıl işlem zaten tamamlanmış olur).
    // `.select()`'in dinamik `type` ile generic çözümlemesi `.update()`'ten
    // farklı davranıyor (`type as any` burada `SelectQueryError`'a
    // düşüyor) — createContentItemAction'daki gibi client'ın kendisini
    // cast etmek gerekiyor.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see comment in createContentItemAction above
    const { data: slugRow } = await (connection.client as any).from(type).select("slug").eq("id", itemId).maybeSingle();
    if (slugRow?.slug) revalidatePath(detailPathFor(slugRow.slug as string));
  }
}
