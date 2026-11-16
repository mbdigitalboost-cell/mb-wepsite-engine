import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { createSupabaseStorefrontServerClient } from "@/lib/supabase/storefront-server";
import { getShippingFeeSettings } from "@/lib/commerce/public/shipping-fee-settings";
import { resolveApplicableDiscount } from "@/lib/commerce/discounts";
import { normalizeDiscountCode, type DiscountResolution } from "@/lib/commerce/discount-rules";
import { resolveCartLines, type ResolvedLine } from "@/lib/commerce/checkout/resolve-cart";
import { codeErrorFor, composeQuote, type CheckoutQuote } from "@/lib/commerce/checkout/quote";
import { isCodeAttemptBlocked, recordFailedCodeAttempt } from "@/lib/commerce/checkout/code-attempts";
import { discountAttemptKey, discountAttemptStore } from "@/lib/commerce/checkout/code-attempts-server";

/**
 * Faz 32 — ÖNİZLEME ve SİPARİŞİN ORTAK HESABI. previewCheckoutAction ve
 * createOrderAction bunu çağırır; ikinci bir hesap kopyası yok:
 *   satırlar (resolveCartLines) → indirim (resolveApplicableDiscount)
 *   → kargo/kapıda ödeme/toplam (composeQuote → Faz 31 shipping-fee).
 *
 * Girilen kod uygulanamazsa `codeError` dolar ve `quote` kodsuz hesaplanır
 * (hesaba tanımlı otomatik indirim varsa o uygulanır). Önizleme bu quote'u
 * gösterir; sipariş oluşturma ise codeError varsa siparişi OLUŞTURMAZ.
 *
 * Deneme sınırı yalnız kod girildiğinde ve yalnız "geçersiz kod" sonuçlarını
 * sayar (code-attempts.ts).
 */
export type QuoteCheckoutResult =
  | { ok: false; error: string }
  | {
      ok: true;
      lines: ResolvedLine[];
      quote: CheckoutQuote;
      /** Kod girildiyse onun sonucu (uygulanmadıysa codeError dolu). */
      codeResolution: DiscountResolution | null;
      codeError: string | null;
      user: User | null;
    };

export async function quoteCheckout(params: {
  admin: SupabaseClient<Database>;
  storeId: string;
  cartItems: unknown;
  paymentMethod: string | null | undefined;
  enteredCode: string | null | undefined;
  contact: { email?: string | null; phone?: string | null };
}): Promise<QuoteCheckoutResult> {
  const { admin, storeId } = params;

  const cart = await resolveCartLines(storeId, params.cartItems);
  if (!cart.ok) return cart;

  // Oturum isteğin kendi çerezinden; istemci girdisine asla güvenilmez.
  const supabase = await createSupabaseStorefrontServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const settings = await getShippingFeeSettings(storeId);
  const base = {
    admin,
    storeId,
    subtotal: cart.subtotal,
    userId: user?.id ?? null,
    userEmail: user?.email ?? null,
    contact: params.contact,
  };

  const code = normalizeDiscountCode(params.enteredCode);
  let codeResolution: DiscountResolution | null = null;
  if (code) {
    const attempts = discountAttemptStore(admin, storeId);
    const key = await discountAttemptKey(storeId);
    if (await isCodeAttemptBlocked(attempts, key)) {
      codeResolution = { status: "rate_limited" };
    } else {
      codeResolution = await resolveApplicableDiscount({ ...base, enteredCode: code });
      if (codeResolution.status === "invalid_code") await recordFailedCodeAttempt(attempts, key);
    }
  }

  const resolution =
    codeResolution?.status === "applied" ? codeResolution : await resolveApplicableDiscount({ ...base, enteredCode: null });
  const quote = composeQuote({ subtotal: cart.subtotal, resolution, paymentMethod: params.paymentMethod, settings });

  return {
    ok: true,
    lines: cart.lines,
    quote,
    codeResolution,
    codeError: codeResolution ? codeErrorFor(code, codeResolution, cart.subtotal) : null,
    user,
  };
}
