/**
 * Faz 40 — MAĞAZA BAŞINA E-POSTA AYARI ve GÖNDEREN KURALI (saf mantık; import yok).
 *
 * KURAL (SITE_IZOLASYON.md §2.8): bir mağazanın e-postası YALNIZ o mağazanın
 * `store_email_settings` satırındaki gönderenle gider. Satır yoksa e-posta
 * GÖNDERİLMEZ. Ortam değişkenine, sağlayıcının deneme adresine ya da başka
 * bir mağazanın adresine düşmek yoktur — bu dosyada böyle bir yedek değer
 * bilerek YOKTUR; resolveSender ayarı olmayan mağaza için null döner.
 *
 * API ANAHTARI: bu fazda ortamdaki tek sağlayıcı anahtarı kullanılır ve o
 * anahtar yalnız tek bir alan adı için yetkilidir. Farklı alan adıyla ikinci
 * bir mağaza eklendiğinde anahtar da mağaza başına tutulmalıdır (Faz 21/22
 * deseni: yalnız service-role okuyabilen ayrı tablo). Bkz. docs/YENI_SITE_EKLEME.md.
 */

export const EMAIL_KINDS = [
  "order_confirmation",
  "store_new_order",
  "shipped",
  "cancelled",
  "return_requested",
  "return_approved",
  "return_rejected",
  "refund_completed",
  "test",
] as const;
export type EmailKind = (typeof EMAIL_KINDS)[number];

/** Bir sipariş için en fazla BİR kez gönderilen türler (order_email_log'da (order_id, kind) tekil). */
export const ONE_OFF_ORDER_KINDS: readonly EmailKind[] = ["order_confirmation", "store_new_order", "shipped", "cancelled"];
/** Talep (iptal/iade) başına bir kez gönderilen türler ((return_id, kind) tekil). */
export const RETURN_KINDS: readonly EmailKind[] = ["return_requested", "return_approved", "return_rejected", "refund_completed"];

export const EMAIL_KIND_LABELS: Record<EmailKind, string> = {
  order_confirmation: "Sipariş onayı",
  store_new_order: "Mağazaya yeni sipariş bildirimi",
  shipped: "Kargoya verildi",
  cancelled: "Sipariş iptali",
  return_requested: "Talep alındı",
  return_approved: "Talep onaylandı",
  return_rejected: "Talep reddedildi",
  refund_completed: "Ödeme iadesi",
  test: "Test e-postası",
};

export const MAX_NOTIFICATION_EMAILS = 5;
export const FROM_NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;

export interface StoreEmailSettings {
  fromName: string;
  fromEmail: string;
  replyToEmail: string | null;
  orderNotificationEmails: string[];
  sendOrderConfirmation: boolean;
  sendShipped: boolean;
  sendCancelRefund: boolean;
  sendStoreNewOrder: boolean;
}

const EMAIL_PATTERN = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;

export function isValidEmail(value: string): boolean {
  return value.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(value);
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Veritabanı satırı → ayar. Gönderen adı ya da adresi bozuksa ayar YOK sayılır (null) — yarım ayarla gönderim yapılmaz. */
export function toStoreEmailSettings(
  row: {
    from_name?: unknown;
    from_email?: unknown;
    reply_to_email?: unknown;
    order_notification_emails?: unknown;
    send_order_confirmation?: unknown;
    send_shipped?: unknown;
    send_cancel_refund?: unknown;
    send_store_new_order?: unknown;
  } | null,
): StoreEmailSettings | null {
  if (!row) return null;
  const fromName = text(row.from_name);
  const fromEmail = text(row.from_email);
  if (!fromName || !fromEmail || !isValidEmail(fromEmail)) return null;
  const replyTo = text(row.reply_to_email);
  const notifications = Array.isArray(row.order_notification_emails)
    ? row.order_notification_emails.map(text).filter((item): item is string => item !== null && isValidEmail(item))
    : [];
  return {
    fromName,
    fromEmail,
    replyToEmail: replyTo && isValidEmail(replyTo) ? replyTo : null,
    orderNotificationEmails: [...new Set(notifications)].slice(0, MAX_NOTIFICATION_EMAILS),
    sendOrderConfirmation: row.send_order_confirmation !== false,
    sendShipped: row.send_shipped !== false,
    sendCancelRefund: row.send_cancel_refund !== false,
    sendStoreNewOrder: row.send_store_new_order !== false,
  };
}

export interface ResolvedSender {
  /** `"Ad" <adres>` biçiminde. */
  from: string;
  replyTo: string | null;
}

/** Gönderen YALNIZ verilen mağaza ayarından üretilir; ayar yoksa null (gönderim yok). */
export function resolveSender(settings: StoreEmailSettings | null): ResolvedSender | null {
  if (!settings) return null;
  const safeName = settings.fromName.replace(/["<>\r\n]/g, "").trim();
  if (!safeName || !isValidEmail(settings.fromEmail)) return null;
  return { from: `"${safeName}" <${settings.fromEmail}>`, replyTo: settings.replyToEmail };
}

/** Tür, mağazanın anahtarlarına göre açık mı? Test e-postası her zaman açıktır. */
export function isKindEnabled(settings: StoreEmailSettings, kind: EmailKind): boolean {
  switch (kind) {
    case "order_confirmation":
      return settings.sendOrderConfirmation;
    case "store_new_order":
      return settings.sendStoreNewOrder;
    case "shipped":
      return settings.sendShipped;
    case "cancelled":
    case "return_requested":
    case "return_approved":
    case "return_rejected":
    case "refund_completed":
      return settings.sendCancelRefund;
    case "test":
      return true;
  }
}

/** Admin formundaki "her satıra / virgülle bir adres" metni → adres listesi (yinelenen atılır). */
export function parseEmailList(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((item) => item.trim()).filter(Boolean))];
}

/** Admin girdisinin doğrulaması; hata yoksa null. */
export function validateStoreEmailSettings(settings: StoreEmailSettings): string | null {
  const name = settings.fromName.trim();
  if (name.length === 0 || name.length > FROM_NAME_MAX_LENGTH) return `Gönderen adı 1–${FROM_NAME_MAX_LENGTH} karakter olmalı.`;
  if (/["<>\r\n]/.test(name)) return "Gönderen adında tırnak ya da < > işareti kullanılamaz.";
  if (!isValidEmail(settings.fromEmail)) return "Gönderen adresi geçerli bir e-posta adresi olmalı.";
  if (settings.replyToEmail !== null && !isValidEmail(settings.replyToEmail)) return "Yanıt adresi geçerli bir e-posta adresi olmalı.";
  if (settings.orderNotificationEmails.length > MAX_NOTIFICATION_EMAILS) return `En fazla ${MAX_NOTIFICATION_EMAILS} bildirim adresi yazılabilir.`;
  if (settings.orderNotificationEmails.some((item) => !isValidEmail(item))) return "Bildirim adreslerinden biri geçerli bir e-posta adresi değil.";
  return null;
}

/**
 * Sağlayıcıya verilen tekrar-koruma anahtarı. İlk gönderimde `<hedef>:<tür>`;
 * "Tekrar gönder" her denemede yeni bir anahtar üretir (aksi hâlde sağlayıcı
 * başarısız ilk denemenin yanıtını geri döndürebilir).
 */
export function emailIdempotencyKey(input: { kind: EmailKind; orderId: string | null; returnId: string | null; attempt: number; nonce?: string }): string {
  const target = input.returnId ?? input.orderId ?? input.nonce ?? "none";
  const base = `${target}:${input.kind}`;
  return input.attempt > 1 ? `${base}:r${input.attempt}` : base;
}
