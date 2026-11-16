import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { OrdersTabs } from "@/components/dashboard/orders-tabs";
import { RETURN_KIND_LABELS, RETURN_REASON_LABELS, RETURN_STATUS_LABELS } from "@/lib/commerce/returns/state";
import { refundDaysLeft } from "@/lib/commerce/returns/eligibility";
import { maskIban } from "@/lib/commerce/returns/iban";
import { getReturnSettings, loadReturnOrderContext } from "@/lib/commerce/returns/service";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce/order-status-labels";
import { formatPrice } from "@/lib/utils/format-price";
import {
  approveReturnAction,
  closeReturnAction,
  markReceivedAction,
  refundReturnAction,
  rejectReturnAction,
  revealIbanAction,
} from "../actions";
import { ConfirmSubmitButton } from "../confirm-submit-button";
import { RevealIban } from "../reveal-iban";

const ERRORS: Record<string, string> = {
  durum: "Talep bu işlem için uygun durumda değil (başka bir sekmede işlenmiş olabilir). Sayfayı yenileyin.",
  siparis: "Sipariş bulunamadı.",
  kargoda: "Sipariş kargoya verilmiş ya da iptal edilemez durumda; iptal yerine iade süreci gerekir.",
  gerekce: "Reddetmek için gerekçe yazın.",
  referans: "İadeyi işaretlemek için dekont/işlem referansı girin.",
  yontem: "Bu talep iyzico ile iade edilemez (kartla ödenmemiş ya da ödeme kimliği yok).",
  "iyzico-kapali": "iyzico entegrasyonu aktif değil. İadeyi iyzico panelinden yapıp referansla elle işaretleyebilirsiniz.",
  tutar: "Geçersiz iade tutarı (0'dan büyük ve müşterinin ödediği toplamdan − önceki iadelerden fazla olamaz).",
  "tutar-gerekce": "İade tutarını değiştirdiyseniz gerekçesini yazın.",
  iyzico: "iyzico iadesi tamamlanamadı; talebin durumu değişmedi.",
};
const OKS: Record<string, string> = {
  onay: "Talep onaylandı.",
  red: "Talep reddedildi.",
  geldi: "Ürünün geldiği kaydedildi.",
  iade: "Ödeme iadesi kaydedildi.",
  kapandi: "Talep kapatıldı.",
};

function dt(value: string | null): string {
  return value ? new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "medium", timeStyle: "short" }) : "—";
}

const inputClasses = "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/** Faz 30 Kısım C — talep detayı ve aksiyonları. */
export default async function ReturnDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string; returnId: string }>;
  searchParams: Promise<{ ok?: string; hata?: string; mesaj?: string }>;
}) {
  const { customerId, storeId, returnId } = await params;
  const sp = await searchParams;
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: customer }, { data: record }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("customers").select("name").eq("id", customerId).maybeSingle(),
    supabase.from("order_returns").select("*").eq("id", returnId).eq("store_id", storeId).maybeSingle(),
  ]);
  if (!store || !record) notFound();

  const context = await loadReturnOrderContext(storeId, record.order_id);
  if (!context) notFound();
  const settings = await getReturnSettings(storeId);
  const { data: bank } = await createSupabaseAdminClient()
    .from("order_return_bank_details")
    .select("iban")
    .eq("return_id", returnId)
    .eq("store_id", storeId)
    .maybeSingle();
  const { data: history } = await supabase
    .from("audit_logs")
    .select("action, created_at")
    .eq("entity_id", returnId)
    .order("created_at", { ascending: true });

  const base = `/dashboard/customers/${customerId}/stores/${storeId}`;
  const scope = `${customer?.name ?? "?"} · ${store.name}`;
  const amount = Number(record.refund_amount);
  const itemsById = new Map(context.lines.map((line) => [line.id, line]));
  const returnItems = context.returns.find((r) => r.id === returnId)?.items ?? [];
  const anyPersonalized = returnItems.some((item) => itemsById.get(item.orderItemId)?.personalized);
  const counting = ["approved", "received"].includes(record.status) && record.refund_method !== "none" && amount > 0;
  const daysLeft = counting ? refundDaysLeft(record.handed_to_carrier_at ?? (record.kind === "cancel" ? record.decided_at : null), record.received_at) : null;
  const awaitingRefund = (record.kind === "cancel" && record.status === "approved") || (record.kind === "return" && record.status === "received");
  const label = `${RETURN_KIND_LABELS[record.kind]} talebi #${record.return_number} (Sipariş #${context.order.orderNumber})`;

  return (
    <div>
      <Link href={`${base}/returns`} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← İptal &amp; İade
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        {RETURN_KIND_LABELS[record.kind]} talebi #{record.return_number}
      </h1>
      <OrdersTabs customerId={customerId} storeId={storeId} active="returns" />

      {sp.ok && OKS[sp.ok] ? <p className="mt-4 rounded-lg border border-green-300 bg-green-50/60 px-4 py-3 text-sm text-green-900">{OKS[sp.ok]}</p> : null}
      {sp.hata ? (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50/60 px-4 py-3 text-sm text-red-900">
          {ERRORS[sp.hata] ?? "İşlem yapılamadı."}
          {sp.mesaj ? ` (${sp.mesaj})` : ""}
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-black/10 p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-black/5 px-2 py-0.5 text-xs font-medium">{RETURN_STATUS_LABELS[record.status]}</span>
              {daysLeft !== null ? (
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${daysLeft <= 3 ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-900"}`}>
                  {daysLeft < 0 ? `Yasal ödeme süresi ${-daysLeft} gün aşıldı` : `Ödeme iadesi için ${daysLeft} gün kaldı`}
                </span>
              ) : null}
            </div>
            <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-1">
              <dt className="text-foreground/60">Sipariş</dt>
              <dd>
                <Link href={`${base}/orders/${context.order.id}`} className="text-brand-accent hover:underline">
                  #{context.order.orderNumber}
                </Link>{" "}
                · {ORDER_STATUS_LABELS[context.order.status]} · {PAYMENT_STATUS_LABELS[context.order.paymentStatus]}
              </dd>
              <dt className="text-foreground/60">Müşteri</dt>
              <dd>
                {context.order.customerName} · {context.order.customerPhone}
                {context.order.customerEmail ? ` · ${context.order.customerEmail}` : ""}
              </dd>
              <dt className="text-foreground/60">Kanal</dt>
              <dd>{record.channel === "member" ? "Üye" : "Misafir (sipariş no + telefon)"}</dd>
              <dt className="text-foreground/60">Neden</dt>
              <dd>{RETURN_REASON_LABELS[record.reason]}</dd>
              {record.customer_note ? (
                <>
                  <dt className="text-foreground/60">Müşteri notu</dt>
                  <dd className="whitespace-pre-line">{record.customer_note}</dd>
                </>
              ) : null}
              <dt className="text-foreground/60">Ödeme yöntemi</dt>
              <dd>{context.order.paymentMethod ?? "—"}</dd>
              <dt className="text-foreground/60">İade yöntemi</dt>
              <dd>{record.refund_method === "iyzico" ? "Karta (iyzico)" : record.refund_method === "iban" ? "IBAN'a havale" : "İade edilecek ödeme yok"}</dd>
              <dt className="text-foreground/60">İade tutarı</dt>
              <dd className="font-semibold">{formatPrice(amount)}</dd>
              {context.order.shippingFee > 0 || context.order.codFee > 0 ? (
                <>
                  <dt className="text-foreground/60">Siparişte ücretler</dt>
                  <dd className="text-xs">
                    Kargo {formatPrice(context.order.shippingFee)}
                    {context.order.codFee > 0 ? ` · Kapıda ödeme ${formatPrice(context.order.codFee)}` : ""} — tam iadede tutara dahil, kısmi iadede
                    değil (aşağıdan gerekçeyle artırılabilir; hukuki danışmanınıza teyit ettirin).
                  </dd>
                </>
              ) : null}
              <dt className="text-foreground/60">Teslim tarihi</dt>
              <dd>{dt(context.order.deliveredAt)}</dd>
            </dl>
          </section>

          <section className="rounded-lg border border-black/10 p-4 text-sm">
            <h2 className="font-semibold">Kalemler</h2>
            <ul className="mt-2 divide-y divide-black/10">
              {returnItems.map((item) => {
                const line = itemsById.get(item.orderItemId);
                return (
                  <li key={item.orderItemId} className="flex justify-between gap-3 py-2">
                    <span>
                      {line?.productName}
                      {line?.variantLabel ? ` · ${line.variantLabel}` : ""}
                      {line?.addonLabels.length ? ` · ${line.addonLabels.join(", ")}` : ""} — {item.quantity}/{line?.quantity} adet
                      {line?.personalized ? <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">kişiye özel</span> : null}
                    </span>
                    <span>{formatPrice(item.refundAmount)}</span>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-xs text-foreground/60">Tutar sunucuda hesaplandı: kalem tutarı (ek ürünler dahil) − siparişteki indirimin oransal payı.</p>
          </section>

          {record.status === "requested" ? (
            <section className="rounded-lg border border-black/10 p-4 text-sm">
              <h2 className="font-semibold">Karar</h2>
              {record.kind === "return" ? (
                <form action={approveReturnAction.bind(null, customerId, storeId, returnId)} className="mt-3 grid gap-3">
                  <label>
                    Kargo firması
                    <input name="carrierName" defaultValue={settings.carrierName ?? ""} maxLength={120} className={inputClasses} />
                  </label>
                  <label>
                    İade kodu
                    <input name="returnCode" defaultValue={settings.returnCode ?? ""} maxLength={120} className={inputClasses} />
                  </label>
                  <label>
                    Müşteriye talimat
                    <textarea name="instructions" rows={4} defaultValue={settings.instructions ?? ""} maxLength={4000} className={inputClasses} />
                  </label>
                  <div>
                    <ConfirmSubmitButton label="Onayla ve iade kodunu gönder" confirmText={`${scope}\n\n${label} onaylansın mı? Müşteriye iade kodu ve talimat gösterilir.`} />
                  </div>
                </form>
              ) : (
                <form action={approveReturnAction.bind(null, customerId, storeId, returnId)} className="mt-3">
                  <p className="mb-2 text-xs text-foreground/60">
                    Onaylayınca sipariş iptal edilir; Basit Kargo&apos;daki barkodsuz kayıt silinir (barkod üretilmişse uyarı bırakılır).
                    {amount > 0 ? " Ardından ödeme iadesi adımı açılır." : " İade edilecek ödeme olmadığı için talep kapanır."}
                  </p>
                  <ConfirmSubmitButton label="İptali onayla" confirmText={`${scope}\n\n${label} onaylansın ve sipariş iptal edilsin mi?`} />
                </form>
              )}
              <form action={rejectReturnAction.bind(null, customerId, storeId, returnId)} className="mt-6 grid gap-2 border-t border-black/10 pt-4">
                <label>
                  Red gerekçesi (müşteriye gösterilir)
                  <textarea name="rejectionReason" rows={2} required maxLength={1000} className={inputClasses} />
                </label>
                <div>
                  <ConfirmSubmitButton variant="danger" label="Reddet" confirmText={`${scope}\n\n${label} reddedilsin mi?`} />
                </div>
              </form>
            </section>
          ) : null}

          {record.kind === "return" && record.status === "approved" ? (
            <section className="rounded-lg border border-black/10 p-4 text-sm">
              <h2 className="font-semibold">Ürün geldi mi?</h2>
              <p className="mt-1 text-xs text-foreground/60">
                Müşteri kargoya teslim: {record.handed_to_carrier_at ? dt(record.handed_to_carrier_at) : "henüz bildirilmedi"} · İade kodu: {record.return_code ?? "—"}
              </p>
              <form action={markReceivedAction.bind(null, customerId, storeId, returnId)} className="mt-3 grid gap-2">
                <label className="flex items-start gap-2">
                  <input type="checkbox" name="restock" defaultChecked={false} disabled={anyPersonalized} className="mt-1 h-4 w-4" />
                  <span>
                    Kalem adetlerini stoğa geri ekle
                    <span className="block text-xs text-foreground/60">
                      Satışta stok otomatik düşülmüyor; stoğu bu sipariş için elle düşürdüyseniz işaretleyin.{anyPersonalized ? " Kişiye özel kalem var — stoğa eklenmez." : ""}
                    </span>
                  </span>
                </label>
                <div>
                  <ConfirmSubmitButton label="Ürün geldi" confirmText={`${scope}\n\n${label}: ürünün mağazaya ulaştığı kaydedilsin mi?`} />
                </div>
              </form>
            </section>
          ) : null}

          {awaitingRefund ? (
            <section className="rounded-lg border border-black/10 p-4 text-sm">
              <h2 className="font-semibold">Ödeme iadesi — {formatPrice(amount)}</h2>
              {amount <= 0 || record.refund_method === "none" ? (
                <form action={closeReturnAction.bind(null, customerId, storeId, returnId)} className="mt-3">
                  <ConfirmSubmitButton label="İade edilecek ödeme yok — kapat" confirmText={`${scope}\n\n${label} para iadesi olmadan kapatılsın mı?`} />
                </form>
              ) : (
                <div className="mt-3 space-y-4">
                  {record.refund_method === "iyzico" ? (
                    <form action={refundReturnAction.bind(null, customerId, storeId, returnId)}>
                      <input type="hidden" name="mode" value="iyzico" />
                      <RefundAmountFields amount={amount} />
                      <ConfirmSubmitButton
                        label="iyzico ile karta iade et"
                        confirmText={`${scope}\n\n${label}: ${formatPrice(amount)} müşterinin kartına iyzico üzerinden iade edilecek. Devam edilsin mi?`}
                      />
                      <p className="mt-1 text-xs text-foreground/60">Hata olursa talebin durumu değişmez ve hata burada gösterilir.</p>
                    </form>
                  ) : null}
                  {record.refund_method === "iban" ? (
                    <div>
                      <p className="text-xs text-foreground/60">Müşterinin IBAN&apos;ı (kişisel veri):</p>
                      {bank ? <RevealIban masked={maskIban(bank.iban)} action={revealIbanAction.bind(null, customerId, storeId, returnId)} /> : <p>—</p>}
                    </div>
                  ) : null}
                  <form action={refundReturnAction.bind(null, customerId, storeId, returnId)} className="grid gap-2 border-t border-black/10 pt-3">
                    <input type="hidden" name="mode" value="manual" />
                    <RefundAmountFields amount={amount} />
                    <label>
                      {record.refund_method === "iban" ? "Havale dekont / işlem referansı" : "iyzico panelinden yapıldıysa işlem referansı"}
                      <input name="reference" required maxLength={200} className={inputClasses} />
                    </label>
                    <div>
                      <ConfirmSubmitButton
                        variant="outline"
                        label="İade edildi olarak işaretle"
                        confirmText={`${scope}\n\n${label}: ${formatPrice(amount)} iade edildi olarak işaretlensin mi?`}
                      />
                    </div>
                  </form>
                </div>
              )}
            </section>
          ) : null}
        </div>

        <aside className="space-y-4 text-sm">
          <section className="rounded-lg border border-black/10 p-4">
            <h2 className="font-semibold">Zaman çizelgesi</h2>
            <dl className="mt-2 grid grid-cols-[110px_1fr] gap-y-1 text-xs">
              <dt className="text-foreground/60">Talep</dt>
              <dd>{dt(record.requested_at)}</dd>
              <dt className="text-foreground/60">Karar</dt>
              <dd>{dt(record.decided_at)}</dd>
              <dt className="text-foreground/60">Kargoya teslim</dt>
              <dd>{dt(record.handed_to_carrier_at)}</dd>
              <dt className="text-foreground/60">Ürün geldi</dt>
              <dd>{dt(record.received_at)}</dd>
              <dt className="text-foreground/60">Para iadesi</dt>
              <dd>{dt(record.refunded_at)}</dd>
              {record.refund_reference ? (
                <>
                  <dt className="text-foreground/60">Referans</dt>
                  <dd className="break-all">{record.refund_reference}</dd>
                </>
              ) : null}
              {record.rejection_reason ? (
                <>
                  <dt className="text-foreground/60">Red gerekçesi</dt>
                  <dd>{record.rejection_reason}</dd>
                </>
              ) : null}
            </dl>
          </section>
          <section className="rounded-lg border border-black/10 p-4">
            <h2 className="font-semibold">Geçmiş</h2>
            {(history ?? []).length === 0 ? (
              <p className="mt-2 text-xs text-foreground/60">Kayıt yok.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-xs">
                {(history ?? []).map((h, index) => (
                  <li key={index}>
                    {dt(h.created_at)} · {h.action.replace("order_return.", "")}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Faz 31 — iade tutarını gerekçeyle artırma (ör. kısmi iadede kargo ücreti). Boş bırakılırsa hesaplanan tutar kullanılır. */
function RefundAmountFields({ amount }: { amount: number }) {
  return (
    <details className="mb-2 text-xs">
      <summary className="cursor-pointer text-foreground/60">Tutarı değiştir (gerekçeli)</summary>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label>
          İade tutarı (TL)
          <input name="amountOverride" inputMode="decimal" placeholder={amount.toFixed(2)} className={inputClasses} />
        </label>
        <label>
          Gerekçe
          <input name="overrideNote" maxLength={500} placeholder="Ör. kargo ücreti de iade edildi" className={inputClasses} />
        </label>
      </div>
    </details>
  );
}
