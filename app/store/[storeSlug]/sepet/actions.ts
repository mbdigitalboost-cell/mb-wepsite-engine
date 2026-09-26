"use server";

import { revalidatePath } from "next/cache";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import {
  getPublicProductBySlug,
  getPublicProductOptions,
  getPublicProductVariants,
  getPublicProductAddons,
} from "@/lib/commerce/public/products";
import type { PublicOptionGroup, PublicProductVariant } from "@/lib/commerce/public/products";
import { computeConfiguredPrice } from "@/lib/commerce/pricing";
import { checkoutFormSchema, orderCartLinesSchema } from "@/lib/validation/order";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CheckoutFormState } from "./form-state";

/**
 * FAZ 2 (mağaza sepeti/sipariş) — the ONLY function in this file, and the
 * ONLY thing that ever writes to orders/order_items/order_item_addons.
 * Fully anonymous/public — no requireSession()/requireStoreAccess() call
 * anywhere here, by design (this is the storefront checkout, not a
 * dashboard route). Writes through createSupabaseAdminClient()
 * (service-role) because migration 0029 deliberately gives these 3 tables
 * NO anon RLS policy on any operation — see that migration's own header
 * for why.
 *
 * SERVER-AUTHORITATIVE PRICING (the whole point of this action): the
 * client's cart (see cart-context.tsx) sends ONLY productSlug/variantId/
 * addonIds/quantity per line — never a price, name, or label. Every line
 * is re-resolved here from FRESH getPublicProductBySlug/
 * getPublicProductOptions/getPublicProductVariants/getPublicProductAddons
 * calls (the exact same functions the product page itself uses — RLS's
 * own `_select_public_active` policies mean a since-deactivated product/
 * variant/addon simply won't come back, which IS the "ürün o arada
 * pasife alınmışsa anlamlı hata döndür" check, not a separate one) and
 * priced via lib/commerce/pricing.ts's computeConfiguredPrice, UNCHANGED
 * from Faz 1 — exactly the reuse this phase's own spec calls for, and
 * exactly what lib/validation/product-addon.ts's own CRITICAL warning
 * anticipated.
 */
export async function createOrderAction(
  storeSlug: string,
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) {
    return { status: "error", error: "Mağaza bulunamadı.", orderNumber: null };
  }

  const parsedCustomer = checkoutFormSchema.safeParse({
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone"),
    customerEmail: formData.get("customerEmail") || undefined,
    addressCity: formData.get("addressCity"),
    addressDistrict: formData.get("addressDistrict"),
    addressNeighborhood: formData.get("addressNeighborhood"),
    addressLine: formData.get("addressLine"),
    note: formData.get("note") || undefined,
    paymentMethod: formData.get("paymentMethod"),
  });
  if (!parsedCustomer.success) {
    return { status: "error", error: parsedCustomer.error.issues[0]?.message ?? "Geçersiz form.", orderNumber: null };
  }

  let rawLines: unknown;
  try {
    rawLines = JSON.parse(String(formData.get("cartItems") ?? "[]"));
  } catch {
    return { status: "error", error: "Sepet verisi okunamadı, lütfen sayfayı yenileyip tekrar deneyin.", orderNumber: null };
  }
  const parsedLines = orderCartLinesSchema.safeParse(rawLines);
  if (!parsedLines.success) {
    return { status: "error", error: parsedLines.error.issues[0]?.message ?? "Sepetiniz boş.", orderNumber: null };
  }

  // Fetch each DISTINCT product's fresh data ONCE (never once per cart
  // LINE — a cart can have multiple lines for the same product with
  // different variants/addons) — same fetch-once-then-lookup discipline
  // as every other N+1-avoidance in lib/commerce/public/products.ts.
  const uniqueSlugs = [...new Set(parsedLines.data.map((line) => line.productSlug))];
  const productDataBySlug = new Map<
    string,
    {
      product: Awaited<ReturnType<typeof getPublicProductBySlug>>;
      optionGroups: PublicOptionGroup[];
      variants: PublicProductVariant[];
      addons: Awaited<ReturnType<typeof getPublicProductAddons>>;
    }
  >();

  for (const slug of uniqueSlugs) {
    const product = await getPublicProductBySlug(store.id, slug);
    if (!product) continue; // surfaces as a per-line error below, not thrown here
    const [optionGroups, variants, addons] = await Promise.all([
      getPublicProductOptions(store.id, product.id),
      getPublicProductVariants(store.id, product.id),
      getPublicProductAddons(store.id, product.id),
    ]);
    productDataBySlug.set(slug, { product, optionGroups, variants, addons });
  }

  interface ResolvedLine {
    productId: string;
    variantId: string | null;
    productName: string;
    variantLabel: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    addons: Array<{ addonId: string; addonName: string; priceDelta: number }>;
  }

  const resolvedLines: ResolvedLine[] = [];
  const lineErrors: string[] = [];

  for (const line of parsedLines.data) {
    const data = productDataBySlug.get(line.productSlug);
    if (!data || !data.product) {
      lineErrors.push("Sepetinizdeki bir ürün artık mevcut değil.");
      continue;
    }
    const { product, optionGroups, variants, addons } = data;

    let matchedVariant: PublicProductVariant | null = null;
    if (line.variantId) {
      matchedVariant = variants.find((v) => v.id === line.variantId) ?? null;
      if (!matchedVariant) {
        lineErrors.push(`${product.name}: seçtiğiniz seçenek artık mevcut değil.`);
        continue;
      }
    }

    const resolvedAddons: Array<{ addonId: string; addonName: string; priceDelta: number }> = [];
    let addonMissing = false;
    for (const addonId of line.addonIds) {
      const addon = addons.find((a) => a.id === addonId);
      if (!addon) {
        addonMissing = true;
        break;
      }
      resolvedAddons.push({ addonId: addon.id, addonName: addon.name, priceDelta: addon.priceDelta });
    }
    if (addonMissing) {
      lineErrors.push(`${product.name}: seçtiğiniz bir ek ürün alanı artık mevcut değil.`);
      continue;
    }

    // Reconstructs the same group->value selection the client's
    // configurator held when it produced `matchedVariant` — the ONE
    // extra step needed to feed computeConfiguredPrice unchanged (it
    // takes raw selections + resolves the matching variant itself; the
    // client already resolved it once, so this just re-derives the same
    // input from the id the client sent, not a second independent guess).
    const selectedOptionValueIdByGroup: Record<string, string> = {};
    if (matchedVariant) {
      for (const valueId of matchedVariant.optionValueIds) {
        const group = optionGroups.find((g) => g.values.some((v) => v.id === valueId));
        if (group) selectedOptionValueIdByGroup[group.id] = valueId;
      }
    }

    const priced = computeConfiguredPrice({
      productPrice: product.price,
      productCompareAtPrice: product.compareAtPrice,
      optionGroups,
      variants,
      addons,
      selectedOptionValueIdByGroup,
      selectedAddonIds: line.addonIds,
    });

    const variantLabel =
      matchedVariant && optionGroups.length > 0
        ? optionGroups
            .map((g) => {
              const valueId = selectedOptionValueIdByGroup[g.id];
              const value = g.values.find((v) => v.id === valueId);
              return value ? `${g.name}: ${value.value}` : null;
            })
            .filter((label): label is string => label !== null)
            .join(", ") || null
        : null;

    resolvedLines.push({
      productId: product.id,
      variantId: matchedVariant?.id ?? null,
      productName: product.name,
      variantLabel,
      unitPrice: priced.totalPrice,
      quantity: line.quantity,
      lineTotal: priced.totalPrice * line.quantity,
      addons: resolvedAddons,
    });
  }

  if (lineErrors.length > 0) {
    return { status: "error", error: [...new Set(lineErrors)].join(" "), orderNumber: null };
  }
  if (resolvedLines.length === 0) {
    return { status: "error", error: "Sepetiniz boş.", orderNumber: null };
  }

  const subtotal = resolvedLines.reduce((sum, line) => sum + line.lineTotal, 0);

  // FAZ 5.1 — read via the request's own cookie-bound session (NOT the
  // admin client below, which has no session at all), never trusted from
  // client input. Anonymous/guest checkout is unaffected: `user` is simply
  // null when there's no session, and customer_user_id stays null on the
  // insert below — identical to Faz 2's original behavior.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createSupabaseAdminClient();

  // store_public_stores (the anon-safe view getStoreBySlug reads) never
  // exposes customer_id (see that view's own comment) — the real `stores`
  // row is looked up here, through the admin client, ONLY for the audit
  // log's own "which customer does this concern" field.
  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", store.id).maybeSingle();

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      store_id: store.id,
      customer_name: parsedCustomer.data.customerName,
      customer_phone: parsedCustomer.data.customerPhone,
      customer_email: parsedCustomer.data.customerEmail || null,
      customer_user_id: user?.id ?? null,
      address_city: parsedCustomer.data.addressCity,
      address_district: parsedCustomer.data.addressDistrict,
      address_neighborhood: parsedCustomer.data.addressNeighborhood,
      address_line: parsedCustomer.data.addressLine,
      note: parsedCustomer.data.note || null,
      payment_method: parsedCustomer.data.paymentMethod,
      subtotal,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[store/sepet] failed to create order:", orderError?.message);
    return { status: "error", error: "Siparişiniz oluşturulamadı, lütfen tekrar deneyin.", orderNumber: null };
  }

  if (user) {
    // FAZ 5.1b — keeps a signed-in customer's account profile in sync with
    // whichever address they actually shipped to most recently, so the
    // next checkout's pre-fill (sepet/page.tsx's loadInitialCustomer)
    // reflects reality instead of silently going stale the moment they
    // ship to a second address. Only writes when something actually
    // differs from the stored profile (not an unconditional upsert on
    // every order) so a repeat order to the same address doesn't churn
    // the row for no reason. Uses the admin client like every other write
    // in this action — `user.id` came from the request's own verified
    // session above, never from client input, so this is as trusted as
    // the order insert itself.
    const { data: currentProfile } = await admin
      .from("store_customers")
      .select("address_city, address_district, address_neighborhood, address_line")
      .eq("user_id", user.id)
      .eq("store_id", store.id)
      .maybeSingle();

    const addressChanged =
      !currentProfile ||
      currentProfile.address_city !== parsedCustomer.data.addressCity ||
      currentProfile.address_district !== parsedCustomer.data.addressDistrict ||
      currentProfile.address_neighborhood !== parsedCustomer.data.addressNeighborhood ||
      currentProfile.address_line !== parsedCustomer.data.addressLine;

    if (addressChanged) {
      const { error: profileSyncError } = await admin.from("store_customers").upsert(
        {
          user_id: user.id,
          store_id: store.id,
          email: user.email ?? parsedCustomer.data.customerEmail ?? "",
          address_city: parsedCustomer.data.addressCity,
          address_district: parsedCustomer.data.addressDistrict,
          address_neighborhood: parsedCustomer.data.addressNeighborhood,
          address_line: parsedCustomer.data.addressLine,
        },
        { onConflict: "user_id,store_id" },
      );
      if (profileSyncError) {
        // Non-fatal — the order itself already succeeded; this is a
        // best-effort profile sync, not part of the order's own
        // correctness.
        console.error("[store/sepet] failed to sync store_customers address:", profileSyncError.message);
      }
    }
  }

  for (const line of resolvedLines) {
    const { data: item, error: itemError } = await admin
      .from("order_items")
      .insert({
        store_id: store.id,
        order_id: order.id,
        product_id: line.productId,
        variant_id: line.variantId,
        product_name: line.productName,
        variant_label: line.variantLabel,
        unit_price: line.unitPrice,
        quantity: line.quantity,
        line_total: line.lineTotal,
      })
      .select("id")
      .single();

    if (itemError || !item) {
      // The order row itself already exists at this point — a single
      // line's own insert failing (extremely unlikely: same admin client,
      // same request) is logged, not thrown, so the customer still gets
      // their order confirmation rather than a false "failed" message for
      // an order that partially succeeded.
      console.error("[store/sepet] failed to create order item:", itemError?.message);
      continue;
    }

    if (line.addons.length > 0) {
      const { error: addonsError } = await admin.from("order_item_addons").insert(
        line.addons.map((addon) => ({
          store_id: store.id,
          order_item_id: item.id,
          addon_id: addon.addonId,
          addon_name: addon.addonName,
          price_delta: addon.priceDelta,
        })),
      );
      if (addonsError) {
        console.error("[store/sepet] failed to create order item addons:", addonsError.message);
      }
    }
  }

  await logAuditEvent({
    userId: null,
    customerId: storeRow?.customer_id ?? null,
    action: "order.create",
    entityType: "order",
    entityId: order.id,
    metadata: { storeId: store.id, orderNumber: order.order_number, subtotal, lineCount: resolvedLines.length },
  });

  if (storeRow?.customer_id) {
    // The admin orders list is `ƒ` (server-rendered on demand, never
    // statically cached) so this is a minor freshness nicety rather than
    // a correctness requirement — still done for consistency with every
    // other mutation in this codebase.
    revalidatePath(`/dashboard/customers/${storeRow.customer_id}/stores/${store.id}/orders`);
  }

  return { status: "success", error: null, orderNumber: order.order_number };
}
