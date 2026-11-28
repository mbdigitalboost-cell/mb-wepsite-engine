import "server-only";
import type { DiscoveryRequestInput } from "@/lib/validation/discovery-request";
import { getCustomerSupabaseClient } from "@/lib/cms/connection";
import { sendLeadNotificationEmail } from "@/lib/notifications/send-lead-notification";

export interface SubmitDiscoveryRequestResult {
  ok: boolean;
}

/**
 * Where a validated discovery request lead ends up. Deliberately
 * separated from the route handler (app/api/forms/discovery-request/
 * route.ts) so that wiring up real persistence is a change to this one
 * function, not to the API route, the form component, or its validation.
 *
 * Phase 6 §17: the public route isn't behind the domain resolver yet
 * (that's still not wired to any route — see lib/cms/resolve-website.ts),
 * so this uses a controlled, explicit "PETRA" connection key for this one
 * call site only, exactly as that instruction permits ("Petra için
 * kontrollü bir connectionKey kullanılabilir"). This is NOT the same as
 * hardcoding a domain→customer mapping — getCustomerSupabaseClient still
 * independently verifies "PETRA" is a real, active connection key in the
 * Platform DB before returning anything (lib/cms/connection.ts).
 *
 * The insert is best-effort and never changes this function's success
 * behavior: a failed/unavailable customer DB is caught and logged, never
 * thrown, never surfaced to the visitor as an error.
 *
 * LOG KURALI: sunucu loguna lead içeriği (ad, telefon, e-posta, mesaj)
 * YAZILMAZ. Eskiden her formda ad/telefon/e-posta console.info ile
 * loglanıyordu; kaldırıldı. Loga yalnız sonucun kendisi yazılır ("lead
 * kaydedildi" / kaydedilemedi + veritabanının kısa hata mesajı).
 */
export async function submitDiscoveryRequest(
  input: DiscoveryRequestInput,
): Promise<SubmitDiscoveryRequestResult> {
  try {
    const client = await getCustomerSupabaseClient("PETRA");
    if (client) {
      const { error } = await client.from("leads").insert({
        name: input.fullName,
        phone: input.phone,
        email: input.email || null,
        message: input.message || null,
        source: input.service ? `discovery-form:${input.service}` : "discovery-form",
      });
      if (error) {
        console.error("[petra:discovery-request] leads insert failed:", error.message);
      } else {
        console.info("[petra:discovery-request] lead kaydedildi");
      }
    } else {
      // client === null: müşteri veritabanı bağlı değil. Lead içeriği loga
      // yazılmadığı için bu durumda lead yalnız bildirim e-postasıyla ulaşır.
      console.error("[petra:discovery-request] lead kaydedilemedi: müşteri veritabanı bağlantısı yok");
    }
  } catch (err) {
    console.error("[petra:discovery-request] unexpected error writing to leads:", err instanceof Error ? err.name : "unknown");
  }

  // Best-effort, independent of the Supabase insert above — see
  // lib/notifications/send-lead-notification.ts's file doc for exactly
  // what has to be configured before this actually sends anything.
  await sendLeadNotificationEmail("PETRA", input);

  return { ok: true };
}
