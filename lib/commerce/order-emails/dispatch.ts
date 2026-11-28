import {
  emailIdempotencyKey,
  isKindEnabled,
  resolveSender,
  type EmailKind,
  type StoreEmailSettings,
} from "./settings.ts";

/**
 * Faz 40 — E-POSTA GÖNDERİM ÇEKİRDEĞİ (saf; veritabanı ve sağlayıcı dışarıdan verilir).
 *
 * Sıra ve kurallar:
 *   1. Mağazanın e-posta ayarı yoksa GÖNDERİM YOK ("skipped").
 *   2. Tür mağazada kapalıysa gönderim yok ("skipped").
 *   3. Alıcı yoksa gönderim yok ("skipped").
 *   4. Aynı hedef + tür için daha önce "sent" kaydı varsa İKİNCİ kez gönderilmez
 *      ("duplicate"; kayıt da değişmez).
 *   5. Sağlayıcıya tekrar-koruma anahtarıyla gönderilir; sonuç kaydedilir.
 *
 * BU FONKSİYON ASLA HATA FIRLATMAZ: e-posta sorunu siparişi, ödemeyi ya da
 * durum değişikliğini engelleyemez. Her hata "failed" olarak döner/kaydedilir.
 */

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export interface OutgoingEmail extends RenderedEmail {
  from: string;
  replyTo: string | null;
  to: string[];
  idempotencyKey: string;
}

export type ProviderResult = { ok: true; messageId: string | null } | { ok: false; error: string };

export interface EmailLogTarget {
  storeId: string;
  orderId: string | null;
  returnId: string | null;
  kind: EmailKind;
}

export interface ExistingEmailLog {
  id: string;
  status: "sent" | "failed" | "skipped";
  attempts: number;
}

export interface EmailLogWrite extends EmailLogTarget {
  existingId: string | null;
  recipient: string;
  status: "sent" | "failed" | "skipped";
  providerMessageId: string | null;
  error: string | null;
  attempts: number;
}

export interface DispatchDeps {
  loadSettings(storeId: string): Promise<StoreEmailSettings | null>;
  findLog(target: EmailLogTarget): Promise<ExistingEmailLog | null>;
  send(email: OutgoingEmail): Promise<ProviderResult>;
  writeLog(entry: EmailLogWrite): Promise<void>;
}

export interface DispatchRequest extends EmailLogTarget {
  /** Müşteri e-postaları ve test için alıcı; mağaza bildirimi için null (ayardaki adresler kullanılır). */
  customerRecipient: string | null;
  /** İçerik yalnız gerçekten gönderilecekse üretilir. */
  render(settings: StoreEmailSettings): Promise<RenderedEmail | null> | RenderedEmail | null;
  /** Test e-postasında kayıt hedefi olmadığı için anahtara eklenen tek kullanımlık değer. */
  nonce?: string;
}

export type DispatchOutcome =
  | { status: "sent"; messageId: string | null }
  | { status: "duplicate" }
  | { status: "skipped"; reason: "no_settings" | "disabled" | "no_recipient" | "no_content" }
  | { status: "failed"; error: string };

export const SKIP_MESSAGES: Record<"no_settings" | "disabled" | "no_recipient" | "no_content", string> = {
  no_settings: "E-posta ayarı yok (Mağaza → Ayarlar → E-posta).",
  disabled: "Bu e-posta türü mağaza ayarında kapalı.",
  no_recipient: "Alıcı e-posta adresi yok.",
  no_content: "E-posta içeriği oluşturulamadı (sipariş bulunamadı).",
};

const ERROR_MAX_LENGTH = 500;

function shortError(error: unknown): string {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "Bilinmeyen hata";
  return message.slice(0, ERROR_MAX_LENGTH);
}

async function safeWrite(deps: DispatchDeps, entry: EmailLogWrite): Promise<void> {
  try {
    await deps.writeLog(entry);
  } catch (error) {
    // Kayıt yazılamasa da akış sürer; yalnız teknik mesaj loglanır (içerik/adres değil).
    console.error("[order-emails] log write failed:", shortError(error));
  }
}

export async function dispatchEmail(deps: DispatchDeps, request: DispatchRequest): Promise<DispatchOutcome> {
  const target: EmailLogTarget = { storeId: request.storeId, orderId: request.orderId, returnId: request.returnId, kind: request.kind };
  try {
    const settings = await deps.loadSettings(request.storeId);
    const existing = await deps.findLog(target);
    // Daha önce gönderilmiş e-posta: hiçbir koşulda ikinci kez gitmez, kaydı da değişmez.
    if (existing?.status === "sent") return { status: "duplicate" };

    const attempts = (existing?.attempts ?? 0) + 1;
    const skip = async (reason: "no_settings" | "disabled" | "no_recipient" | "no_content", recipient: string): Promise<DispatchOutcome> => {
      await safeWrite(deps, {
        ...target,
        existingId: existing?.id ?? null,
        recipient,
        status: "skipped",
        providerMessageId: null,
        error: SKIP_MESSAGES[reason],
        attempts,
      });
      return { status: "skipped", reason };
    };

    const sender = resolveSender(settings);
    if (!settings || !sender) {
      console.info("[order-emails] e-posta ayarı yok — gönderilmedi:", request.kind);
      return skip("no_settings", request.customerRecipient ?? "-");
    }

    const recipients = (request.kind === "store_new_order" ? settings.orderNotificationEmails : [request.customerRecipient ?? ""])
      .map((item) => item.trim())
      .filter(Boolean);
    const recipientLabel = recipients.join(", ") || "-";

    if (!isKindEnabled(settings, request.kind)) return skip("disabled", recipientLabel);
    if (recipients.length === 0) return skip("no_recipient", "-");

    const rendered = await request.render(settings);
    if (!rendered) return skip("no_content", recipientLabel);

    let result: ProviderResult;
    try {
      result = await deps.send({
        ...rendered,
        from: sender.from,
        replyTo: sender.replyTo,
        to: recipients,
        idempotencyKey: emailIdempotencyKey({ kind: request.kind, orderId: request.orderId, returnId: request.returnId, attempt: attempts, nonce: request.nonce }),
      });
    } catch (error) {
      result = { ok: false, error: shortError(error) };
    }

    await safeWrite(deps, {
      ...target,
      existingId: existing?.id ?? null,
      recipient: recipientLabel,
      status: result.ok ? "sent" : "failed",
      providerMessageId: result.ok ? result.messageId : null,
      error: result.ok ? null : result.error.slice(0, ERROR_MAX_LENGTH),
      attempts,
    });
    return result.ok ? { status: "sent", messageId: result.messageId } : { status: "failed", error: result.error };
  } catch (error) {
    const message = shortError(error);
    console.error("[order-emails] dispatch failed:", message);
    return { status: "failed", error: message };
  }
}

/**
 * Sipariş onayı (ve mağazaya yeni sipariş bildirimi) gönderilebilir mi?
 * Kart siparişinde YALNIZ ödeme sunucuda doğrulandıktan sonra; ödenmemiş
 * kart siparişine onay e-postası gitmez. İptal edilmiş siparişe de gitmez.
 */
export function canSendOrderPlacedEmails(order: { paymentMethod: string | null; paymentStatus: string; status: string }, cardPaymentMethod: string): boolean {
  if (order.status === "cancelled") return false;
  if (order.paymentMethod === cardPaymentMethod) return order.paymentStatus === "paid";
  return true;
}

/** Kargo e-postası: sipariş "shipped" durumunda VE takip numarası yazılmışsa. */
export function canSendShippedEmail(order: { status: string; trackingNumber: string | null }): boolean {
  return order.status === "shipped" && Boolean(order.trackingNumber && order.trackingNumber.trim());
}
