import { NextResponse } from "next/server";
import { isSupabaseConfigured, publicEnv } from "@/lib/config/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Lightweight connectivity check for the Supabase project.
 *
 * Does NOT query any table (none exist yet in this foundation). It only
 * confirms that the configured URL/anon key can reach the project's Auth
 * endpoint. Useful for verifying `.env.local` is wired correctly before
 * building real features on top of it.
 *
 * GET /api/health/supabase
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        message:
          "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. " +
          "Copy .env.local.example to .env.local and fill in your Supabase project's values.",
      },
      { status: 200 },
    );
  }

  try {
    const supabase = await createSupabaseServerClient();
    // getSession() only inspects the local/cookie session and does not
    // guarantee a round-trip; getUser() revalidates against Supabase Auth
    // and is the right check for "can we actually reach the project".
    const { error } = await supabase.auth.getUser();

    // "Auth session missing" is expected when nobody is logged in — it
    // still proves the client reached Supabase and got a real response.
    const reachable = !error || error.name === "AuthSessionMissingError";

    return NextResponse.json({
      ok: reachable,
      configured: true,
      supabaseUrl: publicEnv.supabaseUrl,
      error: reachable ? null : error?.message,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        configured: true,
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 200 },
    );
  }
}
