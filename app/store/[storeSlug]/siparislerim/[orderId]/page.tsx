import type { Metadata } from "next";
import { orderGrandTotal } from "@/lib/commerce/shipping-fee";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { resolveCustomerReturnAccess } from "@/lib/commerce/returns/access";
import { eligibilityFor } from "@/lib/commerce/returns/service";
import { RETURN_KIND_LABELS, RETURN_REASON_LABELS, RETURN_STATUS_LABELS, canTransition } from "@/lib/commerce/returns/state";
import { MIN_RETURN_WINDOW_DAYS } from "@/lib/commerce/returns/eligibility";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status-labels";
import { formatPrice } from "@/lib/utils/format-price";
import { storeHref } from "@/lib/sites/store-href";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { createReturnRequestAction, markHandedToCarrierAction, withdrawReturnAction } from "./actions";
import { ReturnRequestForm } from "./return-request-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Sipariş detayı" },
  robots: { index: false, follow: false },
};

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" });
}

/**
 * Faz 30 Kısım B — sipariş detayı + iptal/iade talebi (üye ya da imzalı
 * misafir jetonu; bkz. lib/commerce/returns/access.ts). Arama motorlarına
 * kapalı (noindex + robots /siparislerim).
 */
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>;
  searchParams: Promise<{ t?: string; talep?: string; kargo?: string; geri?: string; hata?: string }>;
}) {
  const { storeSlug, orderId } = await params;
  const sp = await searchParams;
  const access = await resolveCustomerReturnAccess(storeSlug, orderId, sp.t ?? null);
  if (!access) notFound();

  const { context, settings, token } = access;
  const { order } = context;
  const eligibility = eligibilityFor(context, settings);
  const windowDays = Math.max(MIN_RETURN_WINDOW_DAYS, settings.returnWindowDays);
  const net = orderGrandTotal({ subtotal: order.subtotal, discount_amount: order.discountAmount, shipping_fee: order.shippingFee, cod_fee: order.codFee });

  const steps: Array<{ label: string; done: boolean; at: string | null }> = [
    { label: "Sipariş alındı", done: true, at: order.createdAt },
    { label: "Onaylandı", done: ["confirmed", "preparing", "shipped", "completed"].includes(order.status), at: null },
    { label: "Kargoya verildi", done: ["shipped", "completed"].includes(order.status), at: order.shippedAt },
    { label: "Teslim edildi", done: order.status === "completed", at: order.deliveredAt },
  ];

  const returnLines = context.lines.map((line) => ({
    id: line.id,
    label: [line.productName, line.variantLabel, ...line.addonLabels].filter(Boolean).join(" · ") + ` (${line.quantity} adet)`,
    remaining: Math.max(0, line.quantity - line.returnedQuantity),
    personalized: line.personalized,
  }));

  const boundCreate = createReturnRequestAction.bind(null, storeSlug, orderId, token);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="max-w-3xl py-10">
        <Link href={storeHref(storeSlug, "/siparislerim")} className="text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:underline">
          ← Siparişlerim
        </Link>
        <h1 className={`${storefrontDisplayClasses} mt-2 text-2xl font-bold tracking-tight text-[#F5F5F5]`}>Sipariş #{order.orderNumber}</h1>
        <p className="mt-1 text-sm text-[#A3A3A3]">
          {ORDER_STATUS_LABELS[order.status]} · {PAYMENT_STATUS_LABELS[order.paymentStatus]} · {formatPrice(net)}
        </p>

        {sp.talep ? (
          <div role="status" className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            <p className="font-semibold">Talebiniz bize ulaştı. Talep numaranız: #{sp.talep}</p>
            <p className="mt-1">Talebinizi inceleyip bu sayfada ve varsa e-posta adresinize bilgi vereceğiz. Bu sayfadan talebinizin durumunu izleyebilirsiniz.</p>
          </div>
        ) : null}
        {sp.kargo ? <p className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">Kargoya teslim bilginiz kaydedildi.</p> : null}
        {sp.geri ? <p className="mt-6 rounded-lg border border-[#292929] p-3 text-sm text-[#A3A3A3]">Talebiniz geri çekildi.</p> : null}
        {sp.hata ? <p className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">İşlem yapılamadı; sayfayı yenileyip tekrar deneyin.</p> : null}

        <ol className="mt-8 grid gap-3 sm:grid-cols-4" aria-label="Sipariş durumu">
          {steps.map((step) => (
            <li key={step.label} className={`rounded-lg border p-3 ${step.done ? "border-[#D95F00]/60 bg-[#D95F00]/10" : "border-[#292929]"}`}>
              <p className={`text-sm font-semibold ${step.done ? "text-[#F5F5F5]" : "text-[#737373]"}`}>{step.label}</p>
              {step.at ? <p className="mt-1 text-xs text-[#A3A3A3]">{formatDate(step.at)}</p> : null}
            </li>
          ))}
        </ol>

        <section className="mt-8 rounded-lg border border-[#292929] bg-[#171717] p-4">
          <h2 className="text-sm font-semibold text-[#F5F5F5]">Ürünler</h2>
          <ul className="mt-3 divide-y divide-[#292929]">
            {context.lines.map((line) => (
              <li key={line.id} className="flex justify-between gap-3 py-2 text-sm text-[#D4D4D4]">
                <span>
                  {line.productName}
                  {line.variantLabel ? ` · ${line.variantLabel}` : ""}
                  {line.addonLabels.length ? ` · ${line.addonLabels.join(", ")}` : ""} × {line.quantity}
                  {line.returnedQuantity ? <span className="ml-2 text-xs text-amber-400">({line.returnedQuantity} adet talepte/iade)</span> : null}
                </span>
                <span>{formatPrice(line.lineTotal)}</span>
              </li>
            ))}
          </ul>
          {order.carrier && order.trackingNumber ? (
            <p className="mt-3 text-xs text-[#A3A3A3]">
              Kargo: {order.carrier} · Takip no: {order.trackingNumber}
            </p>
          ) : null}
        </section>

        {context.returns.length > 0 ? (
          <section className="mt-8 space-y-3">
            <h2 className="text-sm font-semibold text-[#F5F5F5]">İptal ve iade talepleri</h2>
            {context.returns.map((r) => (
              <div key={r.id} className="rounded-lg border border-[#292929] bg-[#171717] p-4 text-sm text-[#D4D4D4]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-[#F5F5F5]">
                    {RETURN_KIND_LABELS[r.kind]} talebi #{r.returnNumber}
                  </p>
                  <span className="rounded-full bg-[#262626] px-2 py-0.5 text-xs">{RETURN_STATUS_LABELS[r.status]}</span>
                </div>
                <p className="mt-1 text-xs text-[#A3A3A3]">
                  {formatDate(r.requestedAt)} · {RETURN_REASON_LABELS[r.reason]}
                  {r.refundAmount > 0 ? ` · İade tutarı: ${formatPrice(r.refundAmount)}` : ""}
                </p>
                {r.status === "rejected" && r.rejectionReason ? <p className="mt-2 text-xs text-red-300">Gerekçe: {r.rejectionReason}</p> : null}
                {r.kind === "return" && r.status === "approved" ? (
                  <div className="mt-3 space-y-1 rounded-md border border-[#D95F00]/40 bg-[#D95F00]/5 p-3 text-xs">
                    {r.returnCarrierName ? <p>Kargo firması: <strong className="text-[#F5F5F5]">{r.returnCarrierName}</strong></p> : null}
                    {r.returnCode ? <p>İade kodu: <strong className="font-mono text-[#F5F5F5]">{r.returnCode}</strong></p> : null}
                    {r.returnInstructions ? <p className="whitespace-pre-line">{r.returnInstructions}</p> : null}
                    <p className="text-[#A3A3A3]">İade kargo ücreti mağazaya aittir.</p>
                    {r.handedToCarrierAt ? (
                      <p className="text-emerald-300">Kargoya teslim: {formatDate(r.handedToCarrierAt)}</p>
                    ) : (
                      <form action={markHandedToCarrierAction.bind(null, storeSlug, orderId, token, r.id)} className="pt-2">
                        <button type="submit" className="inline-flex h-9 items-center rounded-lg bg-[#D95F00] px-3 text-xs font-semibold text-white hover:bg-[#B34C00]">
                          Kargoya teslim ettim
                        </button>
                      </form>
                    )}
                  </div>
                ) : null}
                {r.status === "refunded" && r.refundedAt ? <p className="mt-2 text-xs text-emerald-300">Ödeme iadesi: {formatDate(r.refundedAt)}</p> : null}
                {canTransition(r.kind, r.status, "cancelled_by_customer") && !r.handedToCarrierAt ? (
                  <form action={withdrawReturnAction.bind(null, storeSlug, orderId, token, r.id)} className="mt-2">
                    <button type="submit" className="text-xs text-[#A3A3A3] underline-offset-2 hover:text-[#F5F5F5] hover:underline">
                      Talebi geri çek
                    </button>
                  </form>
                ) : null}
              </div>
            ))}
          </section>
        ) : null}

        <section className="mt-8 space-y-3">
          {eligibility.cancel.allowed ? (
            <ReturnRequestForm kind="cancel" lines={returnLines} askIban={eligibility.refundMethod.cancel === "iban"} action={boundCreate} />
          ) : null}
          {eligibility.return.allowed ? (
            <>
              <ReturnRequestForm kind="return" lines={returnLines} askIban={eligibility.refundMethod.return === "iban"} action={boundCreate} />
              <p className="text-xs text-[#737373]">
                Cayma süresi ürünü teslim aldığınız günden itibaren {windowDays} gündür. İade kargosu mağazanın anlaşmalı firmasıyla, ücretsiz yapılır.
              </p>
            </>
          ) : null}
          {!eligibility.cancel.allowed && !eligibility.return.allowed ? (
            <p className="text-xs text-[#737373]">
              {["pending", "confirmed", "preparing"].includes(order.status) ? eligibility.cancel.reason : eligibility.return.reason}
            </p>
          ) : null}
        </section>
      </Container>
    </div>
  );
}
