import "server-only";
import { serverEnv, readLeadNotificationEmail } from "@/lib/config/env";
import type { DiscoveryRequestInput } from "@/lib/validation/discovery-request";

/**
 * Best-effort email notification for a new discovery-request lead, sent
 * via the Resend API. This is deliberately isolated from
 * lib/leads/submit-discovery-request.ts's Supabase insert: the two
 * failure modes are independent (a customer can have leads storage but no
 * notification email yet, or vice versa), and neither is ever allowed to
 * throw or change the form's success response — same fail-soft rule as
 * every other integration in this codebase (see lib/cms/connection.ts).
 *
 * Requires two things to actually send anything:
 *  - RESEND_API_KEY (platform-level, shared across customers)
 *  - LEAD_NOTIFICATION_EMAIL_<connectionKey> (per customer, e.g.
 *    LEAD_NOTIFICATION_EMAIL_PETRA) — deliberately NOT hardcoded; Petra's
 *    real business email was not yet confirmed when this was written (see
 *    lib/data/petra/site-config.ts's `email: null`), so this reads
 *    whatever the user configures in Vercel once they have it.
 *
 * Sender note: until a domain is verified in Resend (Settings → Domains),
 * this uses Resend's shared onboarding sender, which Resend restricts to
 * delivering only to the Resend account owner's own verified address —
 * NOT to an arbitrary customer inbox. Once a real domain is verified,
 * update RESEND_FROM_EMAIL to a verified address on that domain and every
 * customer's notification email will actually deliver.
 */
export async function sendLeadNotificationEmail(
  connectionKey: string,
  input: DiscoveryRequestInput,
): Promise<void> {
  const apiKey = serverEnv.resendApiKey;
  const to = readLeadNotificationEmail(connectionKey);

  if (!apiKey || !to) {
    // Not configured yet — expected, ordinary state (see file doc above),
    // not an error.
    return;
  }

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
  const serviceLine = input.service ? `\nİlgilenilen hizmet: ${input.service}` : "";
  const messageLine = input.message ? `\nMesaj: ${input.message}` : "";

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Yeni keşif talebi — ${input.fullName}`,
        text: `Web sitenizden yeni bir keşif talebi geldi.\n\nAd Soyad: ${input.fullName}\nTelefon: ${input.phone}\nE-posta: ${input.email || "belirtilmedi"}${serviceLine}${messageLine}`,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error("[lead-notification] Resend request failed:", response.status, body);
    }
  } catch (err) {
    console.error("[lead-notification] unexpected error sending email:", err);
  }
}
