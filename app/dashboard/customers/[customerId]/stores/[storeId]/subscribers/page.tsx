import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStoreSubscribers, type SubscriberRow } from "@/lib/commerce/subscribers";
import { formatPrice } from "@/lib/utils/format-price";
import { inputClasses } from "@/lib/utils/input-classes";
import { serverEnv } from "@/lib/config/env";
import {
  createDiscountAction,
  deactivateDiscountAction,
  sendSubscriberEmailAction,
  sendSubscriberWhatsappAction,
} from "./actions";
import type { CustomerDiscountType, CustomerDiscountValueType } from "@/lib/supabase/types";

interface ActiveDiscountRow {
  id: string;
  store_customer_id: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  discount_type: CustomerDiscountType;
  code: string | null;
  value_type: CustomerDiscountValueType;
  value: number;
}

const SUCCESS_MESSAGES: Record<string, string> = {
  "discount-created": "İndirim tanımlandı.",
  "discount-deactivated": "İndirim devre dışı bırakıldı.",
  "email-sent": "E-posta gönderildi.",
  "whatsapp-sent": "WhatsApp mesajı gönderildi.",
};

const ERROR_MESSAGES: Record<string, string> = {
  form: "Form eksik veya geçersiz.",
  "guest-auto": "Misafir bir abone için sadece \"kod\" tipi indirim tanımlanabilir (otomatik indirim, sadece kayıtlı hesaplar için).",
  "code-taken": "Bu kod bu mağazada zaten kullanılıyor, farklı bir kod deneyin.",
  "create-failed": "İndirim oluşturulamadı.",
  "deactivate-failed": "İndirim devre dışı bırakılamadı.",
  "email-not-sent": "E-posta gönderilemedi (sağlayıcı yapılandırılmamış olabilir).",
  "whatsapp-not-sent": "WhatsApp mesajı gönderilemedi (sağlayıcı yapılandırılmamış olabilir).",
};

/**
 * GENEL admin özelliği — "Aboneler". Siparişler sayfasıyla (../orders/page.tsx)
 * BİREBİR aynı auth/route deseni: requireStoreEditorAccess (müşteri PII'si
 * taşıyor, aynı tier), aynı customerId/storeId scoping. Herhangi bir mağaza
 * için çalışır, Taktikalp46'ya özel hiçbir şey yok.
 *
 * Liste + dedup mantığı lib/commerce/subscribers.ts'te (kayıtlı hesap +
 * eşleşen misafir siparişleri TEK satırda, kalan misafirler kendi
 * satırlarında — o dosyanın kendi doc comment'i). Sipariş sayısı/toplam
 * harcama GERÇEK orders satırlarından; hiç veri yoksa boş bir tablo
 * gösterilir, uydurma satır YOK.
 */
export default async function StoreSubscribersPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreEditorAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const [subscribers, { data: activeDiscountRows }] = await Promise.all([
    getStoreSubscribers(supabase, storeId),
    supabase
      .from("customer_discounts")
      .select("id, store_customer_id, guest_email, guest_phone, discount_type, code, value_type, value")
      .eq("store_id", storeId)
      .eq("is_active", true),
  ]);

  const activeDiscounts = (activeDiscountRows ?? []) as ActiveDiscountRow[];
  const discountByStoreCustomerId = new Map(
    activeDiscounts.filter((d) => d.store_customer_id).map((d) => [d.store_customer_id as string, d]),
  );
  const discountByGuestKey = new Map(
    activeDiscounts
      .filter((d) => !d.store_customer_id)
      .map((d) => [(d.guest_phone ?? d.guest_email ?? "").toLowerCase(), d]),
  );

  function findDiscountFor(row: SubscriberRow): ActiveDiscountRow | null {
    if (row.kind === "registered" && row.storeCustomerId) {
      return discountByStoreCustomerId.get(row.storeCustomerId) ?? null;
    }
    const key = (row.phone ?? row.email ?? "").toLowerCase();
    return discountByGuestKey.get(key) ?? null;
  }

  const emailConfigured = Boolean(serverEnv.resendApiKey);
  const whatsappConfigured = Boolean(serverEnv.metaWhatsappAccessToken && serverEnv.metaWhatsappPhoneNumberId);

  const createDiscount = createDiscountAction.bind(null, customerId, storeId);
  const deactivateDiscount = deactivateDiscountAction.bind(null, customerId, storeId);
  const sendEmail = sendSubscriberEmailAction.bind(null, customerId, storeId);
  const sendWhatsapp = sendSubscriberWhatsappAction.bind(null, customerId, storeId);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Aboneler</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Kayıtlı hesaplar ve misafir siparişlerden gelen mağaza müşterileri. Sipariş sayısı/toplam harcama gerçek
        siparişlerden hesaplanır.
      </p>

      {!emailConfigured || !whatsappConfigured ? (
        <p className="mt-3 rounded-md border border-black/10 bg-black/[0.02] p-3 text-xs text-foreground/60">
          {!emailConfigured ? "E-posta sağlayıcısı henüz yapılandırılmadı. " : ""}
          {!whatsappConfigured ? "WhatsApp sağlayıcısı henüz yapılandırılmadı." : ""}
        </p>
      ) : null}

      {sp.success && SUCCESS_MESSAGES[sp.success] ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {SUCCESS_MESSAGES[sp.success]}
        </p>
      ) : null}
      {sp.error ? (
        <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {ERROR_MESSAGES[sp.error] ?? "Bir hata oluştu."}
        </p>
      ) : null}

      {subscribers.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Henüz abone yok.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {subscribers.map((row) => {
            const discount = findDiscountFor(row);
            return (
              <li key={row.key} className="rounded-lg border border-black/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {row.name || "(isim yok)"}{" "}
                      <span className="ml-1 rounded-full border border-black/10 px-2 py-0.5 text-[11px] font-normal text-foreground/60">
                        {row.kind === "registered" ? "Kayıtlı hesap" : "Misafir"}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-foreground/60">
                      {row.email ?? "-"} · {row.phone ?? "-"}
                    </p>
                  </div>
                  <div className="text-right text-xs text-foreground/60">
                    <p>{row.orderCount} sipariş</p>
                    <p className="mt-0.5">{formatPrice(row.totalSpend)} toplam</p>
                  </div>
                </div>

                {discount ? (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-black/10 bg-black/[0.02] p-2.5 text-xs">
                    <span className="text-foreground/80">
                      Aktif indirim: {discount.value_type === "percentage" ? `%${discount.value}` : formatPrice(Number(discount.value))}{" "}
                      ({discount.discount_type === "code" ? `kod: ${discount.code}` : "otomatik"})
                    </span>
                    <form action={deactivateDiscount.bind(null, discount.id)}>
                      <button type="submit" className="text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                        Kaldır
                      </button>
                    </form>
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  {!discount ? (
                    <details className="w-full">
                      <summary className="cursor-pointer text-foreground/70 hover:text-foreground">İndirim Tanımla</summary>
                      <form action={createDiscount} className="mt-3 grid max-w-md gap-2.5 rounded-md border border-black/10 p-3">
                        <input type="hidden" name="targetKind" value={row.kind} />
                        {row.kind === "registered" ? (
                          <input type="hidden" name="storeCustomerId" value={row.storeCustomerId ?? ""} />
                        ) : (
                          <>
                            <input type="hidden" name="guestEmail" value={row.email ?? ""} />
                            <input type="hidden" name="guestPhone" value={row.phone ?? ""} />
                          </>
                        )}
                        <div className="grid grid-cols-2 gap-2.5">
                          <select name="discountType" defaultValue="code" className={inputClasses}>
                            <option value="code">Kod tipi</option>
                            {row.kind === "registered" ? <option value="auto">Otomatik</option> : null}
                          </select>
                          <select name="valueType" defaultValue="percentage" className={inputClasses}>
                            <option value="percentage">Yüzde (%)</option>
                            <option value="fixed">Sabit (TL)</option>
                          </select>
                        </div>
                        <input name="value" type="number" min="0" step="0.01" placeholder="Değer" required className={inputClasses} />
                        <input name="code" type="text" placeholder="Kod (boş bırakılırsa otomatik üretilir)" className={inputClasses} />
                        <div>
                          <label htmlFor={`expiresAt-${row.key}`} className="mb-1 block text-foreground/60">
                            Son geçerlilik tarihi (opsiyonel)
                          </label>
                          <input id={`expiresAt-${row.key}`} name="expiresAt" type="date" className={inputClasses} />
                        </div>
                        <button
                          type="submit"
                          className="rounded-md border border-black/15 px-3 py-1.5 text-foreground/80 hover:border-black/30"
                        >
                          Oluştur
                        </button>
                      </form>
                    </details>
                  ) : null}

                  <details>
                    <summary className="cursor-pointer text-foreground/70 hover:text-foreground">E-posta Gönder</summary>
                    {emailConfigured ? (
                      row.email ? (
                        <form action={sendEmail} className="mt-3 grid w-72 gap-2 rounded-md border border-black/10 p-3">
                          <input type="hidden" name="to" value={row.email} />
                          <input name="subject" type="text" placeholder="Konu" required className={inputClasses} />
                          <textarea name="message" placeholder="Mesaj" required rows={4} className={inputClasses} />
                          <button type="submit" className="rounded-md border border-black/15 px-3 py-1.5 text-foreground/80 hover:border-black/30">
                            Gönder
                          </button>
                        </form>
                      ) : (
                        <p className="mt-2 text-foreground/50">Bu abonenin e-posta adresi yok.</p>
                      )
                    ) : (
                      <p className="mt-2 text-foreground/50">E-posta sağlayıcısı henüz yapılandırılmadı.</p>
                    )}
                  </details>

                  <details>
                    <summary className="cursor-pointer text-foreground/70 hover:text-foreground">WhatsApp&apos;tan Mesaj At</summary>
                    {whatsappConfigured ? (
                      row.phone ? (
                        <form action={sendWhatsapp} className="mt-3 grid w-72 gap-2 rounded-md border border-black/10 p-3">
                          <input type="hidden" name="to" value={row.phone} />
                          <textarea name="message" placeholder="Mesaj" required rows={4} className={inputClasses} />
                          <button type="submit" className="rounded-md border border-black/15 px-3 py-1.5 text-foreground/80 hover:border-black/30">
                            Gönder
                          </button>
                        </form>
                      ) : (
                        <p className="mt-2 text-foreground/50">Bu abonenin telefon numarası yok.</p>
                      )
                    ) : (
                      <p className="mt-2 text-foreground/50">WhatsApp sağlayıcısı henüz yapılandırılmadı.</p>
                    )}
                  </details>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
