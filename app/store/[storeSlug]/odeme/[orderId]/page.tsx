import { storeBase } from "@/lib/sites/store-href";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banknote, CreditCard, Landmark, ShieldCheck } from "lucide-react";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { Container } from "@/components/ui/container";
import { storefrontDisplayClasses, storefrontMonoClasses } from "@/lib/utils/storefront-typography";
import { storefrontButtonOutlineClasses } from "@/lib/utils/storefront-button-classes";
import { storefrontRadioClasses } from "@/lib/utils/storefront-input-classes";
import { formatPrice } from "@/lib/utils/format-price";
import { resolveRequestBaseUrl, resolveRequestClientIp } from "@/lib/http/request-base-url";
import {
  CardPaymentUnavailableError,
  getCardPaymentOrder,
  isCardOrder,
  orderTotal,
  startCardPayment,
} from "@/lib/commerce/payments/iyzico-checkout";
import { IyzicoApiError, IyzicoSignatureError } from "@/lib/integrations/iyzico";
import { PAYMENT_METHODS } from "@/lib/validation/order";
import { IyzicoCheckoutEmbed } from "./iyzico-checkout-embed";
import { switchPaymentMethodAction } from "./actions";

export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ALT_METHOD_ICONS = { "Kapıda Nakit": Banknote, "Kapıda Kart": CreditCard, "Havale-EFT": Landmark } as const;

/**
 * Faz 22 — mağaza içi kart ödeme sayfası. createOrderAction kartlı siparişi
 * unpaid/pending oluşturup müşteriyi buraya yönlendirir. Her açılışta
 * iyzico Checkout Form YENİDEN başlatılır (yeni token — "Tekrar Dene" =
 * sayfayı yeniden yüklemek); tutar sipariş kaydından, callbackUrl bu
 * host'tan (lib/http/request-base-url.ts). Ödenmiş sipariş → /sepet
 * başarı ekranına; kart dışı yöntem → bilgi + sepete dön.
 *
 * ?hata=1 → callback başarısız döndü: orders.payment_error gösterilir,
 * "Tekrar Dene" (yeni form aşağıda zaten hazır) ve "Başka yöntem seç"
 * (switchPaymentMethodAction) sunulur.
 */
export default async function StoreCardPaymentPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>;
  searchParams: Promise<{ hata?: string }>;
}) {
  const { storeSlug, orderId } = await params;
  const sp = await searchParams;
  if (!UUID_PATTERN.test(orderId)) notFound();

  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();

  const order = await getCardPaymentOrder(store.id, orderId);
  if (!order) notFound();

  if (order.payment_status === "paid" && isCardOrder(order)) {
    redirect(`${storeBase(storeSlug)}/sepet?siparis=${orderId}&odeme=basarili`);
  }

  const sepetPath = `${storeBase(storeSlug)}/sepet`;
  const total = orderTotal(order);

  if (!isCardOrder(order) || order.status !== "pending" || order.payment_status !== "unpaid") {
    return (
      <div className="min-h-screen bg-[#0A0A0A]">
        <Container className="py-10">
          <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Ödeme</h1>
          <p className="mt-4 text-sm text-[#A3A3A3]">
            Sipariş <span className={`${storefrontMonoClasses} text-[#F5F5F5]`}>#{order.order_number}</span> için online kart ödemesi
            beklenmiyor
            {order.payment_method ? ` (ödeme yöntemi: ${order.payment_method})` : ""}.
          </p>
          <Link href={`${storeBase(storeSlug)}/siparislerim`} className={`${storefrontButtonOutlineClasses} mt-6 inline-flex`}>
            Siparişlerim
          </Link>
        </Container>
      </div>
    );
  }

  const admin = createSupabaseAdminClient();
  const { data: storeRow } = await admin.from("stores").select("customer_id").eq("id", store.id).maybeSingle();

  let embed: { checkoutFormContent: string; paymentPageUrl: string | null } | null = null;
  let initError: string | null = null;
  try {
    const [baseUrl, ip] = await Promise.all([resolveRequestBaseUrl(), resolveRequestClientIp()]);
    const result = await startCardPayment({
      order,
      customerId: storeRow?.customer_id ?? null,
      callbackUrl: `${baseUrl}/api/payments/iyzico/callback?store=${encodeURIComponent(store.id)}`,
      buyerIp: ip,
    });
    embed = { checkoutFormContent: result.checkoutFormContent, paymentPageUrl: result.paymentPageUrl };
  } catch (error) {
    if (error instanceof CardPaymentUnavailableError) initError = error.message;
    else if (error instanceof IyzicoApiError || error instanceof IyzicoSignatureError) initError = `Ödeme başlatılamadı: ${error.message}`;
    else initError = "Ödeme başlatılamadı, lütfen tekrar deneyin.";
    console.error("[store/odeme] checkout form init failed:", error instanceof Error ? error.message : error);
  }

  const switchAction = switchPaymentMethodAction.bind(null, storeSlug, orderId);
  const showFailure = sp.hata !== undefined;

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="py-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Kart ile Ödeme</h1>
            <p className="mt-1 text-sm text-[#A3A3A3]">
              Sipariş <span className={`${storefrontMonoClasses} text-[#F5F5F5]`}>#{order.order_number}</span> · Ödenecek tutar{" "}
              <span className={`${storefrontMonoClasses} font-semibold text-[#D95F00]`}>{formatPrice(total)}</span>
            </p>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-[#A3A3A3]">
            <ShieldCheck size={14} className="text-[#3FA34D]" aria-hidden="true" />
            Kart bilgileriniz iyzico&apos;nun güvenli alanında işlenir, bu siteye kaydedilmez.
          </p>
        </div>

        {showFailure ? (
          <div className="mt-6 rounded-[14px] border border-red-500/40 bg-red-500/10 p-4">
            <p className="text-sm font-semibold text-red-300">Ödeme tamamlanamadı</p>
            <p className="mt-1 text-sm text-[#F5F5F5]">
              {sp.hata === "yontem" ? "Geçerli bir ödeme yöntemi seçin." : order.payment_error ?? "Ödeme bankanız tarafından onaylanmadı."}
            </p>
            <p className="mt-2 text-xs text-[#A3A3A3]">
              Aşağıdaki formla tekrar deneyebilir ya da en altta başka bir ödeme yöntemine geçebilirsiniz — siparişiniz korunur.
            </p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <div className="rounded-[14px] border border-[#292929] bg-[#171717] p-4 sm:p-6">
            {embed ? (
              <IyzicoCheckoutEmbed checkoutFormContent={embed.checkoutFormContent} paymentPageUrl={embed.paymentPageUrl} />
            ) : (
              <div>
                <p role="alert" className="text-sm text-red-300">
                  {initError}
                </p>
                <a href={`${storeBase(storeSlug)}/odeme/${orderId}`} className={`${storefrontButtonOutlineClasses} mt-4 inline-flex`}>
                  Tekrar Dene
                </a>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-[14px] border border-[#292929] bg-[#171717] p-5">
              <p className={`${storefrontMonoClasses} text-sm font-semibold text-[#F5F5F5]`}>Sipariş Özeti</p>
              <div className="mt-3 flex justify-between text-sm text-[#A3A3A3]">
                <span>Ara Toplam</span>
                <span className={storefrontMonoClasses}>{formatPrice(Number(order.subtotal))}</span>
              </div>
              {Number(order.discount_amount) > 0 ? (
                <div className="mt-2 flex justify-between text-sm text-emerald-400">
                  <span>İndirim</span>
                  <span className={storefrontMonoClasses}>-{formatPrice(Number(order.discount_amount))}</span>
                </div>
              ) : null}
              {/* Faz 31 */}
              {Number(order.shipping_fee) > 0 ? (
                <div className="mt-2 flex justify-between text-sm text-[#A3A3A3]">
                  <span>Kargo</span>
                  <span className={storefrontMonoClasses}>{formatPrice(Number(order.shipping_fee))}</span>
                </div>
              ) : null}
              {Number(order.cod_fee) > 0 ? (
                <div className="mt-2 flex justify-between text-sm text-[#A3A3A3]">
                  <span>Kapıda ödeme ücreti</span>
                  <span className={storefrontMonoClasses}>{formatPrice(Number(order.cod_fee))}</span>
                </div>
              ) : null}
              <hr className="my-3 border-[#292929]" />
              <div className="flex items-center justify-between">
                <span className={`${storefrontMonoClasses} text-sm font-semibold text-[#F5F5F5]`}>Genel Toplam</span>
                <span className={`${storefrontMonoClasses} text-xl font-semibold text-[#D95F00]`}>{formatPrice(total)}</span>
              </div>
            </div>

            {/* Başka yöntem seç — aynı sipariş, ikinci sipariş açılmaz (switchPaymentMethodAction). */}
            <form action={switchAction} className="rounded-[14px] border border-[#292929] bg-[#171717] p-5">
              <p className="text-sm font-medium text-[#F5F5F5]">Kart yerine başka yöntemle devam et</p>
              <p className="mt-1 text-xs text-[#A3A3A3]">Siparişiniz aynı kalır; yalnızca ödeme yöntemi değişir.</p>
              <div className="mt-3 space-y-2">
                {PAYMENT_METHODS.map((method, index) => {
                  const Icon = ALT_METHOD_ICONS[method];
                  return (
                    <label key={method} className="flex items-center gap-3 rounded-[10px] border border-[#3A3A3A] p-3 text-sm text-[#F5F5F5] hover:border-[#D95F00]/60">
                      <input type="radio" name="paymentMethod" value={method} defaultChecked={index === 0} className={storefrontRadioClasses} />
                      <Icon size={16} className="text-[#A3A3A3]" aria-hidden="true" />
                      {method}
                    </label>
                  );
                })}
              </div>
              <button type="submit" className={`${storefrontButtonOutlineClasses} mt-4 w-full`}>
                Bu yöntemle siparişi tamamla
              </button>
            </form>

            <Link href={sepetPath} className="block text-center text-xs text-[#A3A3A3] underline-offset-2 hover:text-[#F5F5F5] hover:underline">
              ← Sepete dön
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
