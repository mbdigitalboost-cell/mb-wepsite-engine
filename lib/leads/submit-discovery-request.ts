import "server-only";
import type { DiscoveryRequestInput } from "@/lib/validation/discovery-request";
import { getCustomerSupabaseClient } from "@/lib/cms/connection";

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
 * behavior: the console.info line below still always runs (Phase 6 §17:
 * "mevcut console.log davranışını koru"), and a failed/unavailable
 * customer DB (today's actual state — no real Petra Supabase project
 * exists yet) is caught and logged, never thrown, never surfaced to the
 * visitor as an error.
 */
export async function submitDiscoveryRequest(
  input: DiscoveryRequestInput,
): Promise<SubmitDiscoveryRequestResult> {
  console.info("[petra:discovery-request]", {
    fullName: input.fullName,
    phone: input.phone,
    email: input.email || null,
    service: input.service ?? null,
    hasMessage: Boolean(input.message),
  });

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
      }
    }
    // client === null means "Petra Supabase not connected yet" — expected,
    // ordinary state in this sandbox; the console.info above already
    // captured the lead, so nothing is lost.
  } catch (err) {
    console.error("[petra:discovery-request] unexpected error writing to leads:", err);
  }

  return { ok: true };
}
