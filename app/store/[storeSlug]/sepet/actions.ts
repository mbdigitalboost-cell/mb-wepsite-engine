"use server";

import { storeBase } from "@/lib/sites/store-href";
import { revalidatePath } from "next/cache";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublicProductImages } from "@/lib/commerce/public/products";
import { CARD_PAYMENT_METHOD, checkoutFormSchema } from "@/lib/validation/order";
import { isCardPaymentEnabled } from "@/lib/integrations/store-payment-integration";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { quoteCheckout } from "@/lib/commerce/checkout/quote-server";
import { resolveCartLines } from "@/lib/commerce/checkout/resolve-cart";
import type { ServerLinePrice } from "@/lib/commerce/cart-refresh";
import {
  orderAmountsFromQuote,
  parseExpectedTotal,
  previewFromQuote,
  totalChangedMessage,
  totalsMatch,
  type CheckoutPreview,
} from "@/lib/commerce/checkout/quote";
import { logAuditEvent } from "@/lib/auth/audit-log";
import type { CheckoutFormState } from "./form-state";
import {
  checkoutRequiresLegalAcceptance,
  getPublishedLegalDocuments,
  loadLegalStoreContext,
  renderPublishedDocument,
} from "@/lib/legal/store-legal";
import { buildAcceptanceRecord, isChecked, legalAcceptanceError, legalOrderFromCheckout } from "@/lib/legal/acceptance";
import { orderContractHref } from "@/lib/legal/order-acceptance";
import { notifyOrderPlaced } from "@/lib/commerce/order-emails/service";
import { getOrderBankTransferDetails } from "@/lib/commerce/payments/bank-transfer-server";

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
    return { status: "error", error: "Mağaza bulunamadı.", orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
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
    discountCode: formData.get("discountCode") || undefined,
    // Faz 22 — Fatura Bilgileri (tüm yöntemlerde). Checkbox "on"/yok.
    billingType: formData.get("billingType") || "individual",
    billingName: formData.get("billingName") || undefined,
    billingIdentityNumber: formData.get("billingIdentityNumber") || undefined,
    billingTaxOffice: formData.get("billingTaxOffice") || undefined,
    billingSameAsShipping: formData.get("billingSameAsShipping") !== "off",
    billingAddressCity: formData.get("billingAddressCity") || undefined,
    billingAddressDistrict: formData.get("billingAddressDistrict") || undefined,
    billingAddressLine: formData.get("billingAddressLine") || undefined,
  });
  if (!parsedCustomer.success) {
    return { status: "error", error: parsedCustomer.error.issues[0]?.message ?? "Geçersiz form.", orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
  }

  // Faz 22 — kart yalnızca mağazanın iyzico entegrasyonu AKTİFSE kabul
  // edilir; client "Kredi Kartı" gönderse bile burada son söz sunucunun.
  const isCardPayment = parsedCustomer.data.paymentMethod === CARD_PAYMENT_METHOD;
  if (isCardPayment && !(await isCardPaymentEnabled(store.id))) {
    return {
      status: "error",
      error: "Kart ile ödeme şu an kullanılamıyor — lütfen başka bir ödeme yöntemi seçin.",
      orderNumber: null,
      discountAmount: null,
      discountCode: null,
      paymentRedirectUrl: null,
    };
  }

  // Faz 33 — Ön Bilgilendirme + Mesafeli Satış onayı ZORUNLU (metinler
  // yayımlanmışsa). İstemcideki "required" kutuya güvenilmez; sunucu reddeder.
  // Ticari ileti onayı ayrı ve opsiyoneldir (siparişin şartı değildir).
  const legalDocuments = await getPublishedLegalDocuments(store.id);
  const legalRequired = checkoutRequiresLegalAcceptance(legalDocuments);
  const legalError = legalAcceptanceError(legalRequired, formData.get("legalAccepted"));
  if (legalError) {
    return { status: "error", error: legalError, orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
  }
  const marketingConsent = legalRequired && isChecked(formData.get("marketingConsent"));

  const admin = createSupabaseAdminClient();

  // Faz 32 — satırlar, indirim ve kargo/kapıda ödeme/toplam ÖNİZLEME ile
  // AYNI fonksiyondan (lib/commerce/checkout/quote-server.ts) gelir.
  const quoted = await quoteCheckout({
    admin,
    storeId: store.id,
    cartItems: String(formData.get("cartItems") ?? "[]"),
    paymentMethod: parsedCustomer.data.paymentMethod,
    enteredCode: parsedCustomer.data.discountCode || null,
    contact: { email: parsedCustomer.data.customerEmail || null, phone: parsedCustomer.data.customerPhone },
  });
  if (!quoted.ok) {
    return { status: "error", error: quoted.error, orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
  }
  // Girilen kod geçersizse (yok/süresi dolmuş/şart tutmuyor/deneme sınırı)
  // sipariş OLUŞTURULMAZ — kodu sessizce yok saymak yanıltıcı olurdu.
  if (quoted.codeError) {
    return { status: "error", error: quoted.codeError, orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
  }
  const { lines: resolvedLines, quote, user } = quoted;
  const amounts = orderAmountsFromQuote(quote);
  const resolvedDiscount = quote.discount;
  const charges = quote.charges;
  const subtotal = quote.subtotal;

  // Faz 32 — müşteri ekranda gördüğü toplamı onaylar. Sunucunun hesabı
  // farklıysa (kod bu arada sona erdi, kullanım hakkı doldu, fiyat değişti)
  // sipariş oluşmaz; kart akışında da paidPrice bu siparişin toplamından
  // (orderGrandTotal) hesaplandığı için aynı kontrol kartı da kapsar.
  if (!totalsMatch(parseExpectedTotal(formData.get("expectedTotal")), charges.grandTotal)) {
    return {
      status: "error",
      error: totalChangedMessage(charges.grandTotal),
      orderNumber: null,
      discountAmount: null,
      discountCode: null,
      paymentRedirectUrl: null,
      totalChanged: true,
      newTotal: charges.grandTotal,
    };
  }

  // store_public_stores (getStoreBySlug'ın okuduğu anon view) customer_id
  // vermez — gerçek stores satırı yalnız audit log'un "hangi müşteri"
  // alanı için admin client'la okunur.
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
      ...amounts,
      // Faz 22 — kart: provider izi burada açılır, ödeme odeme/[orderId]
      // sayfasında alınır; sipariş o ana kadar unpaid/pending kalır.
      payment_provider: isCardPayment ? "iyzico" : null,
      // Faz 22 — fatura bilgisi. TCKN/VKN SADECE buraya yazılır (audit metadata'sına değil).
      billing_type: parsedCustomer.data.billingType,
      billing_name: parsedCustomer.data.billingName || null,
      billing_identity_number: (parsedCustomer.data.billingIdentityNumber || "").replace(/\s+/g, "") || null,
      billing_tax_office: parsedCustomer.data.billingType === "corporate" ? parsedCustomer.data.billingTaxOffice || null : null,
      billing_same_as_shipping: parsedCustomer.data.billingSameAsShipping,
      billing_address_city: parsedCustomer.data.billingSameAsShipping ? null : parsedCustomer.data.billingAddressCity || null,
      billing_address_district: parsedCustomer.data.billingSameAsShipping ? null : parsedCustomer.data.billingAddressDistrict || null,
      billing_address_line: parsedCustomer.data.billingSameAsShipping ? null : parsedCustomer.data.billingAddressLine || null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    console.error("[store/sepet] failed to create order:", orderError?.message);
    return { status: "error", error: "Siparişiniz oluşturulamadı, lütfen tekrar deneyin.", orderNumber: null, discountAmount: null, discountCode: null, paymentRedirectUrl: null };
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

  // Faz 33 — kabul edilen metinlerin sipariş bilgileriyle doldurulmuş ANLIK
  // GÖRÜNTÜSÜ. Sipariş no artık belli; tutarlar yukarıdaki AYNI quote'tan.
  let contractSaved = false;
  if (legalRequired) {
    const preDocument = legalDocuments.get("pre_information");
    const salesDocument = legalDocuments.get("distance_sales");
    if (preDocument && salesDocument) {
      const acceptedAt = new Date();
      const legalContext = await loadLegalStoreContext(store);
      const legalOrder = legalOrderFromCheckout({
        orderNumber: order.order_number,
        date: acceptedAt,
        customerName: parsedCustomer.data.customerName,
        customerPhone: parsedCustomer.data.customerPhone,
        customerEmail: parsedCustomer.data.customerEmail || null,
        address: {
          neighborhood: parsedCustomer.data.addressNeighborhood,
          line: parsedCustomer.data.addressLine,
          district: parsedCustomer.data.addressDistrict,
          city: parsedCustomer.data.addressCity,
        },
        billing: {
          type: parsedCustomer.data.billingType,
          name: parsedCustomer.data.billingName || null,
          taxOffice: parsedCustomer.data.billingTaxOffice || null,
          sameAsShipping: parsedCustomer.data.billingSameAsShipping,
          addressLine: parsedCustomer.data.billingAddressLine || null,
          district: parsedCustomer.data.billingAddressDistrict || null,
          city: parsedCustomer.data.billingAddressCity || null,
        },
        lines: resolvedLines,
        subtotal,
        discountAmount: resolvedDiscount?.amount ?? 0,
        discountCode: resolvedDiscount?.code ?? null,
        shippingFee: charges.shippingFee,
        codFee: charges.codFee,
        total: charges.grandTotal,
        paymentMethod: parsedCustomer.data.paymentMethod,
      });
      const record = buildAcceptanceRecord({
        storeId: store.id,
        orderId: order.id,
        preInformation: renderPublishedDocument(preDocument, legalContext, legalOrder),
        distanceSales: renderPublishedDocument(salesDocument, legalContext, legalOrder),
        marketingConsent,
        acceptedAt,
      });
      const { error: acceptanceError } = await admin.from("order_legal_acceptances").insert(record);
      if (acceptanceError) {
        // Sipariş oluştu; kayıt hatası müşteriye "başarısız" gösterilmez ama
        // izlenmeli (yalnız teknik mesaj — kişisel veri loglanmaz).
        console.error("[store/sepet] failed to save legal acceptance:", acceptanceError.message);
      } else {
        contractSaved = true;
      }
    }
  }

  await logAuditEvent({
    userId: null,
    customerId: storeRow?.customer_id ?? null,
    action: "order.create",
    entityType: "order",
    entityId: order.id,
    metadata: {
      storeId: store.id,
      orderNumber: order.order_number,
      subtotal,
      lineCount: resolvedLines.length,
      discountAmount: resolvedDiscount?.amount ?? 0,
      discountId: resolvedDiscount?.id ?? null,
      shippingFee: charges.shippingFee,
      codFee: charges.codFee,
      paymentMethod: parsedCustomer.data.paymentMethod,
      billingType: parsedCustomer.data.billingType,
      legalAccepted: contractSaved,
      marketingConsent,
    },
  });

  // Faz 40 — sipariş onayı (müşteri) + mağazaya bildirim. Kart siparişinde
  // burada GÖNDERİLMEZ: ödeme sunucuda doğrulanınca finalizeCardPayment
  // gönderir (notifyOrderPlaced koşulu kendisi de denetler). Hata fırlatmaz;
  // e-posta sorunu siparişi etkilemez.
  if (!isCardPayment) await notifyOrderPlaced(store.id, order.id);

  if (storeRow?.customer_id) {
    // The admin orders list is `ƒ` (server-rendered on demand, never
    // statically cached) so this is a minor freshness nicety rather than
    // a correctness requirement — still done for consistency with every
    // other mutation in this codebase.
    revalidatePath(`/dashboard/customers/${storeRow.customer_id}/stores/${store.id}/orders`);
  }

  return {
    status: "success",
    error: null,
    orderNumber: order.order_number,
    discountAmount: resolvedDiscount?.amount ?? null,
    discountCode: resolvedDiscount?.code ?? null,
    // Faz 22 — kart: client bu sayfaya yönlenir, sepet ödeme doğrulanana
    // kadar BOŞALTILMAZ (checkout-form.tsx). Sipariş uuid'si tahmin
    // edilemez; sayfa ayrıca mağaza eşleşmesini kontrol eder.
    paymentRedirectUrl: isCardPayment ? `${storeBase(storeSlug)}/odeme/${order.id}` : null,
    shippingFee: charges.shippingFee,
    codFee: charges.codFee,
    total: charges.grandTotal,
    contractUrl: contractSaved ? orderContractHref(storeSlug, store.id, order.id, Boolean(user)) : null,
    orderId: order.id,
    // Faz 40 (ek) — yalnız Havale/EFT siparişinde ve mağaza bilgiyi girmişse; yoksa null (bölüm gösterilmez).
    bankTransfer: await getOrderBankTransferDetails(store.id, {
      paymentMethod: parsedCustomer.data.paymentMethod,
      paymentStatus: "unpaid",
      status: "pending",
    }),
  };
}

/**
 * BUG FIX — sepetteki "kırık/yüklenmeyen ürün görseli". KÖK NEDEN: sepet
 * tamamen client-side/localStorage (cart-context.tsx'in kendi doc comment'i
 * — "every display field is snapshotted at add-time"), yani CartItem.imageUrl
 * ürün sepete eklendiği ANDA product-configurator.tsx'ten gelen
 * `primaryImage.url`'i KALICI olarak saklıyordu. O url ise
 * getPublicProductImages'ın (products.ts) ürettiği bir Supabase Storage
 * SIGNED URL — createSignedUrl(path, 3600), yani 1 SAAT sonra süresi
 * doluyor. Diğer sayfalar (ürün detay, kategori, homepage) bu sorunu hiç
 * yaşamıyor çünkü HER SERVER RENDER'DA (Server Component) imzayı yeniden
 * üretiyorlar — sepet ise localStorage'da saatlerce/günlerce yaşayan TEK
 * yer, bu yüzden imza süresi dolduğunda görsel 403/kırık oluyor. Bu,
 * "diğer sayfalardaki çalışan görsel-çekme deseniyle karşılaştır" talimatı
 * gereği bulunan gerçek kök neden.
 *
 * ÇÖZÜM: cart-list.tsx artık item.imageUrl'e (potansiyel olarak bayat)
 * GÜVENMİYOR — mount olduğunda (ve sepetteki ürün kümesi değiştiğinde) bu
 * action'ı çağırıp, sepetteki her productId için TAZE bir imzalı URL
 * istiyor, dönen Map'i item.imageUrl'in YERİNE kullanıyor. localStorage'daki
 * eski imageUrl alanı hâlâ var (CartItem şeması değişmedi, geriye dönük
 * uyumluluk için) ama artık SADECE action henüz dönmemişken ilk boyamada
 * bir "resim yok" flash'ını önleyen bir geçici fallback.
 */
export async function resolveCartProductImages(
  storeSlug: string,
  productIds: string[],
): Promise<Record<string, string | null>> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return {};

  const uniqueProductIds = [...new Set(productIds)];
  const entries = await Promise.all(
    uniqueProductIds.map(async (productId) => {
      const images = await getPublicProductImages(store.id, productId);
      const primary = images.find((image) => image.isPrimary) ?? images[0] ?? null;
      return [productId, primary?.url ?? null] as const;
    }),
  );

  return Object.fromEntries(entries);
}

/**
 * Faz 32 — İNDİRİM/TOPLAM ÖNİZLEMESİ ("Uygula" ve sepet/ödeme yöntemi
 * değişince). createOrderAction ile AYNI quoteCheckout'u çağırır; yalnız
 * bilgi verir, hiçbir şey yazmaz (deneme sınırı kaydı hariç). Sipariş
 * anında her şey yeniden doğrulanır ve ekrandaki toplam (expectedTotal)
 * sunucununkiyle karşılaştırılır.
 *
 * Kod hatası olsa bile `preview` döner (kodsuz hesap; varsa hesaba tanımlı
 * otomatik indirimle) — istemci "Uygula" başarısızsa eski özeti korur,
 * uygulanmış bir kod sonradan geçersizleşirse bu özete geçer.
 */
export type CheckoutPreviewResult =
  | { ok: true; preview: CheckoutPreview; appliedCode: string | null; codeError: string | null }
  | { ok: false; error: string };

export async function previewCheckoutAction(
  storeSlug: string,
  input: { cartItems: unknown; paymentMethod: string | null; discountCode: string | null; customerEmail: string | null; customerPhone: string | null },
): Promise<CheckoutPreviewResult> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { ok: false, error: "Mağaza bulunamadı." };

  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : null);

  const quoted = await quoteCheckout({
    admin: createSupabaseAdminClient(),
    storeId: store.id,
    cartItems: input.cartItems,
    paymentMethod: text(input.paymentMethod, 40),
    enteredCode: text(input.discountCode, 50),
    contact: { email: text(input.customerEmail, 200), phone: text(input.customerPhone, 40) },
  });
  if (!quoted.ok) return { ok: false, error: quoted.error };

  const preview = previewFromQuote(quoted.quote);
  return {
    ok: true,
    preview,
    appliedCode: quoted.codeResolution?.status === "applied" ? (preview.discount?.code ?? null) : null,
    codeError: quoted.codeError,
  };
}

/**
 * Faz 33 — ödeme adımındaki "Ön Bilgilendirme Formu" / "Mesafeli Satış
 * Sözleşmesi" bağlantıları: o anki sepet, alıcı, adres, kargo ve ödeme
 * bilgileriyle doldurulmuş metin. Tutarlar previewCheckoutAction ve
 * createOrderAction ile AYNI quoteCheckout'tan (Faz 32 özetiyle aynı).
 * Hiçbir şey yazmaz; sipariş anında metin yeniden doldurulup kaydedilir.
 */
export type CheckoutContractsResult =
  | { ok: true; preInformation: { title: string; text: string }; distanceSales: { title: string; text: string } }
  | { ok: false; error: string };

export async function renderCheckoutContractsAction(
  storeSlug: string,
  input: {
    cartItems: unknown;
    paymentMethod: string | null;
    discountCode: string | null;
    customerName: string | null;
    customerPhone: string | null;
    customerEmail: string | null;
    addressCity: string | null;
    addressDistrict: string | null;
    addressNeighborhood: string | null;
    addressLine: string | null;
    billingType: string | null;
    billingName: string | null;
    billingTaxOffice: string | null;
    billingSameAsShipping: boolean;
    billingAddressCity: string | null;
    billingAddressDistrict: string | null;
    billingAddressLine: string | null;
  },
): Promise<CheckoutContractsResult> {
  const store = await getStoreBySlug(storeSlug);
  if (!store) return { ok: false, error: "Mağaza bulunamadı." };
  const documents = await getPublishedLegalDocuments(store.id);
  const preDocument = documents.get("pre_information");
  const salesDocument = documents.get("distance_sales");
  if (!preDocument || !salesDocument) return { ok: false, error: "Sözleşme metni bulunamadı." };

  const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
  const quoted = await quoteCheckout({
    admin: createSupabaseAdminClient(),
    storeId: store.id,
    cartItems: input.cartItems,
    paymentMethod: text(input.paymentMethod, 40),
    enteredCode: text(input.discountCode, 50) || null,
    contact: { email: text(input.customerEmail, 200) || null, phone: text(input.customerPhone, 40) || null },
  });
  if (!quoted.ok) return { ok: false, error: quoted.error };

  const { quote } = quoted;
  const legalContext = await loadLegalStoreContext(store);
  const legalOrder = legalOrderFromCheckout({
    orderNumber: null,
    date: new Date(),
    customerName: text(input.customerName, 200),
    customerPhone: text(input.customerPhone, 40),
    customerEmail: text(input.customerEmail, 200) || null,
    address: {
      neighborhood: text(input.addressNeighborhood, 200),
      line: text(input.addressLine, 500),
      district: text(input.addressDistrict, 100),
      city: text(input.addressCity, 100),
    },
    billing: {
      type: input.billingType === "corporate" ? "corporate" : "individual",
      name: text(input.billingName, 200) || null,
      taxOffice: text(input.billingTaxOffice, 120) || null,
      sameAsShipping: input.billingSameAsShipping !== false,
      addressLine: text(input.billingAddressLine, 500) || null,
      district: text(input.billingAddressDistrict, 100) || null,
      city: text(input.billingAddressCity, 100) || null,
    },
    lines: quoted.lines,
    subtotal: quote.subtotal,
    discountAmount: quote.discount?.amount ?? 0,
    discountCode: quote.discount?.code ?? null,
    shippingFee: quote.charges.shippingFee,
    codFee: quote.charges.codFee,
    total: quote.charges.grandTotal,
    paymentMethod: text(input.paymentMethod, 40),
  });
  const pre = renderPublishedDocument(preDocument, legalContext, legalOrder);
  const sales = renderPublishedDocument(salesDocument, legalContext, legalOrder);
  return { ok: true, preInformation: { title: pre.title, text: pre.text }, distanceSales: { title: sales.title, text: sales.text } };
}

/**
 * Faz 34 — sepet sayfası açılınca satırların GÜNCEL birim fiyatı (sipariş
 * ile aynı kurallar: resolveCartLines → computeConfiguredPrice; varyant
 * fiyatı NULL ise ürün fiyatı). Satılamayan satır (ürün/varyant/ek pasif ya
 * da silinmiş) `ok:false` + müşteriye gösterilecek sebep döner. Hiçbir şey
 * yazmaz; sipariş tutarı yine createOrderAction'da hesaplanır.
 */
export async function refreshCartPricesAction(
  storeSlug: string,
  lines: Array<{ lineId: string; productSlug: string; variantId: string | null; addonIds: string[] }>,
): Promise<ServerLinePrice[]> {
  const store = await getStoreBySlug(storeSlug);
  if (!store || !Array.isArray(lines)) return [];
  const results: ServerLinePrice[] = [];
  for (const line of lines.slice(0, 100)) {
    const lineId = typeof line?.lineId === "string" ? line.lineId.slice(0, 400) : "";
    if (!lineId) continue;
    const resolved = await resolveCartLines(store.id, [
      { productSlug: line.productSlug, variantId: line.variantId ?? null, addonIds: Array.isArray(line.addonIds) ? line.addonIds : [], quantity: 1 },
    ]);
    results.push(resolved.ok ? { lineId, ok: true, unitPrice: resolved.lines[0].unitPrice } : { lineId, ok: false, reason: resolved.error });
  }
  return results;
}
