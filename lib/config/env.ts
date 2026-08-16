/**
 * Central environment variable access.
 *
 * Never read `process.env.*` directly elsewhere in the app. Route every
 * environment variable through here so:
 *  - missing/invalid config fails fast with a clear error instead of a
 *    confusing runtime crash three layers down,
 *  - it is obvious at a glance which variables are public (safe to ship to
 *    the browser) vs. server-only secrets,
 *  - adding a new customer-configurable value (tracking IDs, feature flags,
 *    etc.) later is a one-line change in one place.
 */

function readPublicEnv(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

function readServerEnv(name: string): string | undefined {
  if (typeof window !== "undefined") {
    throw new Error(
      `[env] "${name}" is a server-only variable and cannot be read in the browser.`,
    );
  }
  return process.env[name];
}

/**
 * Public/browser-safe configuration. These are inlined into the client
 * bundle by Next.js (NEXT_PUBLIC_*), so they must never contain secrets.
 */
export const publicEnv = {
  supabaseUrl: readPublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  siteUrl: readPublicEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),

  // Tracking IDs are intentionally optional and empty by default. Nothing
  // fires until a real ID is supplied per-customer/per-environment.
  gtmContainerId: readPublicEnv("NEXT_PUBLIC_GTM_ID"),
  ga4MeasurementId: readPublicEnv("NEXT_PUBLIC_GA4_ID"),
  metaPixelId: readPublicEnv("NEXT_PUBLIC_META_PIXEL_ID"),
};

/**
 * Server-only configuration. Accessing these from a Client Component will
 * throw. Never pass the resolved values into client props/serialization.
 */
export const serverEnv = {
  get supabaseServiceRoleKey() {
    return readServerEnv("SUPABASE_SERVICE_ROLE_KEY");
  },
  get metaConversionsApiToken() {
    return readServerEnv("META_CAPI_ACCESS_TOKEN");
  },
  /**
   * Platform-level Resend API key — one Resend account serves every
   * customer's transactional lead-notification emails. Optional: a
   * customer with no key configured (or, before Phase "lead notify", no
   * key at all) simply gets no email, exactly like the Supabase
   * connection's fail-soft pattern in lib/cms/connection.ts.
   */
  get resendApiKey() {
    return readServerEnv("RESEND_API_KEY");
  },
};

/**
 * Per-customer lead-notification recipient, e.g. LEAD_NOTIFICATION_EMAIL_PETRA.
 * Follows the same "_<CONNECTION_KEY>" suffix convention as the customer
 * Supabase vars (SUPABASE_URL_PETRA, etc.) so a future second customer
 * needs only its own env var, no code change. Never hardcode a real
 * business email here — this project's data must always come from a real,
 * confirmed source (env var set by the user), never invented.
 */
export function readLeadNotificationEmail(connectionKey: string): string | undefined {
  return readServerEnv(`LEAD_NOTIFICATION_EMAIL_${connectionKey}`);
}

export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}
