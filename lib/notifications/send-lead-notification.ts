import "server-only";
import { serverEnv, readLeadNotificationEmail } from "@/lib/config/env";
import type { DiscoveryRequestInput } from "@/lib/validation/discovery-request";
import { deliverLeadNotification } from "@/lib/notifications/petra-lead-notification";

/**
 * Best-effort email notification for a new discovery-request lead, sent
 * via the Resend API. This is deliberately isolated from
 * lib/leads/submit-discovery-request.ts's Supabase insert: the two
 * failure modes are independent (a customer can have leads storage but no
 * notification email yet, or vice versa), and neither is ever allowed to
 * throw or change the form's success response — same fail-soft rule as
 * every other integration in this codebase (see lib/cms/connection.ts).
 *
 * Requires three things to actually send anything:
 *  - RESEND_API_KEY
 *  - LEAD_NOTIFICATION_EMAIL_<connectionKey> (per customer, e.g.
 *    LEAD_NOTIFICATION_EMAIL_PETRA) — deliberately NOT hardcoded.
 *  - RESEND_FROM_EMAIL — the sender, used exactly as configured.
 *
 * Gönderen notu: YEDEK GÖNDEREN YOKTUR. RESEND_FROM_EMAIL boşsa ya da
 * geçerli bir gönderen değilse e-posta gönderilmez ve sunucu loguna
 * "gönderen ayarı yok" yazılır (eskiden sağlayıcının ortak deneme adresine
 * düşülüyordu; kaldırıldı). Mantık ve kurallar petra-lead-notification.ts'te;
 * loga lead içeriği (ad, telefon, e-posta, mesaj) yazılmaz.
 */
export async function sendLeadNotificationEmail(
  connectionKey: string,
  input: DiscoveryRequestInput,
): Promise<void> {
  await deliverLeadNotification(
    {
      apiKey: serverEnv.resendApiKey,
      to: readLeadNotificationEmail(connectionKey),
      fromRaw: process.env.RESEND_FROM_EMAIL,
      fetch: (url, init) => fetch(url, init),
      logError: (message) => console.error(message),
    },
    input,
  );
}
