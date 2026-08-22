import { NextResponse } from "next/server";
import { discoveryRequestSchema } from "@/lib/validation/discovery-request";
import { submitDiscoveryRequest } from "@/lib/leads/submit-discovery-request";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

// Güvenlik sertleştirmesi (2026-08-22): bu formun ne Supabase kaydı ne de
// e-posta bildirimi bir hıza tabi değildi — otomatik/toplu bir spam
// denemesi hem gereksiz e-posta kotası tüketir hem de (ileride gerçek
// Supabase bağlandığında) leads tablosunu doldurabilirdi. IP başına
// 10 dakikada 5 istekle sınırlandı. Bkz. lib/security/rate-limit.ts'in
// doc yorumu: bu bellek-içi bir limiter, dağıtık/kalıcı değil — ama
// altyapısız en iyi düşük-efor çözüm.
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

/**
 * Server-side validation is the only validation that's actually trusted —
 * the client-side check in discovery-request-form.tsx is only for instant
 * user feedback. Never assume a request body matches the form's shape.
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed, retryAfterMs } = rateLimit(`discovery-request:${ip}`, RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited" },
      {
        status: 429,
        headers: retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined,
      },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = discoveryRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "validation_failed", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Honeypot: a real visitor never fills this hidden field. Pretend
  // success so bots don't learn to detect the check, but do nothing.
  if (parsed.data.company) {
    return NextResponse.json({ ok: true });
  }

  const result = await submitDiscoveryRequest(parsed.data);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
