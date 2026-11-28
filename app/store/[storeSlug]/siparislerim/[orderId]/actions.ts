"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { resolveCustomerReturnAccess } from "@/lib/commerce/returns/access";
import { createReturnRequest, customerMarkHandedToCarrier, customerWithdrawRequest } from "@/lib/commerce/returns/service";
import { sendReturnEmail } from "@/lib/commerce/returns/notify";
import { RETURN_REASONS } from "@/lib/commerce/returns/state";
import { storeBase } from "@/lib/sites/store-href";
import type { ReturnRequestFormState } from "./form-state";

/**
 * Faz 30 — vitrin: iptal/iade talebi. Her action erişimi YENİDEN doğrular
 * (üye oturumu ya da misafir jetonu — lib/commerce/returns/access.ts);
 * uygunluk ve tutar sunucuda yeniden hesaplanır (service.ts).
 */
const requestSchema = z.object({
  kind: z.enum(["cancel", "return"]),
  reason: z.enum(RETURN_REASONS as [string, ...string[]], { message: "Bir neden seçin." }),
  note: z.string().max(1000, "Açıklama en fazla 1000 karakter olabilir.").optional(),
  iban: z.string().max(40).optional(),
  accountHolder: z.string().max(140).optional(),
});

function detailPath(storeSlug: string, orderId: string, token: string | null, extra = ""): string {
  const params = new URLSearchParams();
  if (token) params.set("t", token);
  if (extra) for (const [key, value] of new URLSearchParams(extra)) params.set(key, value);
  const query = params.toString();
  return `${storeBase(storeSlug)}/siparislerim/${orderId}${query ? `?${query}` : ""}`;
}

export async function createReturnRequestAction(
  storeSlug: string,
  orderId: string,
  token: string | null,
  _prev: ReturnRequestFormState,
  formData: FormData,
): Promise<ReturnRequestFormState> {
  const access = await resolveCustomerReturnAccess(storeSlug, orderId, token);
  if (!access) return { error: "Bu sipariş için işlem yapma yetkiniz yok ya da bağlantının süresi doldu. Siparişlerim sayfasından tekrar sorgulayın." };

  const parsed = requestSchema.safeParse({
    kind: formData.get("kind"),
    reason: formData.get("reason"),
    note: (formData.get("note") as string | null) || undefined,
    iban: (formData.get("iban") as string | null) || undefined,
    accountHolder: (formData.get("accountHolder") as string | null) || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Formu kontrol edin." };

  const quantities: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("qty:")) quantities[key.slice(4)] = Number(value) || 0;
  }

  const result = await createReturnRequest({
    context: access.context,
    settings: access.settings,
    kind: parsed.data.kind,
    channel: access.channel,
    actorUserId: access.actorUserId,
    reason: parsed.data.reason as Parameters<typeof createReturnRequest>[0]["reason"],
    customerNote: parsed.data.note ?? null,
    quantities,
    iban: parsed.data.iban ?? null,
    accountHolder: parsed.data.accountHolder ?? null,
  });
  if (!result.ok) return { error: result.error };

  await sendReturnEmail({ storeId: access.storeId, orderId, returnId: result.id, event: "requested" });

  redirect(detailPath(storeSlug, orderId, access.token, `talep=${result.returnNumber}`));
}

export async function markHandedToCarrierAction(storeSlug: string, orderId: string, token: string | null, returnId: string): Promise<void> {
  const access = await resolveCustomerReturnAccess(storeSlug, orderId, token);
  if (!access) redirect(`${storeBase(storeSlug)}/siparislerim`);
  const ok = await customerMarkHandedToCarrier(access.context, returnId, access.actorUserId);
  redirect(detailPath(storeSlug, orderId, access.token, ok ? "kargo=1" : "hata=1"));
}

export async function withdrawReturnAction(storeSlug: string, orderId: string, token: string | null, returnId: string): Promise<void> {
  const access = await resolveCustomerReturnAccess(storeSlug, orderId, token);
  if (!access) redirect(`${storeBase(storeSlug)}/siparislerim`);
  const ok = await customerWithdrawRequest(access.context, returnId, access.actorUserId);
  redirect(detailPath(storeSlug, orderId, access.token, ok ? "geri=1" : "hata=1"));
}
