import { NextResponse } from "next/server";
import { discoveryRequestSchema } from "@/lib/validation/discovery-request";
import { submitDiscoveryRequest } from "@/lib/leads/submit-discovery-request";

/**
 * Server-side validation is the only validation that's actually trusted —
 * the client-side check in discovery-request-form.tsx is only for instant
 * user feedback. Never assume a request body matches the form's shape.
 */
export async function POST(request: Request) {
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
