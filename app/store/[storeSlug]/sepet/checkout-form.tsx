"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Space_Grotesk } from "next/font/google";
import { Check } from "lucide-react";
import { storefrontInputClasses, storefrontRadioClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses, storefrontButtonOutlineClasses } from "@/lib/utils/storefront-button-classes";
import { useCart, type CartItem } from "@/components/commerce/public/cart/cart-context";
import { formatPrice } from "@/lib/utils/format-price";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/validation/order";
import { PROVINCES, ProvinceDistrictSelect, findProvinceByName } from "@/components/commerce/public/location-select";
import { createOrderAction } from "./actions";
import { initialCheckoutFormState } from "./form-state";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

function toWireCartLine(item: CartItem) {
  return {
    productSlug: item.productSlug,
    variantId: item.variantId,
    addonIds: item.addonIds,
    quantity: item.quantity,
  };
}

/** "Siparişlerim" devir metni — opsiyonel kopyala butonu, sipariş kodunu kaydetmeyi kolaylaştırmak için. navigator.clipboard yoksa (çok eski tarayıcı/http) sessizce hiçbir şey yapmaz, hata fırlatmaz. */
function OrderCodeCopyButton({ orderNumber }: { orderNumber: number }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard
          ?.writeText(String(orderNumber))
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          })
          .catch(() => {});
      }}
      className="shrink-0 text-xs font-medium text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline"
    >
      {copied ? "Kopyalandı ✓" : "Kodu Kopyala"}
    </button>
  );
}

type Step = 1 | 2;

/**
 * FAZ 5.1 — see sepet/page.tsx's loadInitialCustomer for how this is
 * sourced. FAZ 5.1b — address fields added; addressCity/addressDistrict
 * are NAMES (e.g. "İstanbul"), not ids, same as everywhere else this data
 * crosses a server/client boundary (orders.address_city, store_customers
 * .address_city) — findProvinceByName resolves a name back to an id for
 * seeding provinceId/districtId's own useState below.
 */
export interface InitialCustomer {
  name: string;
  phone: string;
  email: string;
  addressCity: string;
  addressDistrict: string;
  addressNeighborhood: string;
  addressLine: string;
}

/** FAZ 6.2 — see sepet/page.tsx's loadCheckoutPrefill for how this is sourced (migration 0033's store_customer_addresses). */
export interface SavedAddress {
  id: string;
  label: string | null;
  recipientName: string | null;
  phone: string | null;
  addressCity: string;
  addressDistrict: string;
  addressNeighborhood: string | null;
  addressLine: string;
  isDefault: boolean;
}

/**
 * FAZ 2.6 — 2-step checkout wizard, replacing Faz 2's single-screen form.
 * Step 1 ("Teslimat Bilgisi") collects contact + il/ilçe (cascading
 * <select>, from PROVINCES above) + mahalle (required free text, not a
 * dropdown) + address line + optional note, all in plain useState — no
 * form library, consistent with this codebase's "minimal JS" default
 * elsewhere. Step 2 ("Ödeme Yöntemi") is the only step that actually
 * renders a real <form action={formAction}> — step 1's fields are carried
 * over as hidden inputs there, so nothing typed in step 1 is lost when
 * moving to step 2 or back.
 *
 * Client-side "can't continue" checks in handleContinue are a UX
 * convenience only, not the real validation boundary — checkoutFormSchema
 * (lib/validation/order.ts) is what createOrderAction actually enforces
 * server-side; a customer with JS disabled or a tampered client still
 * can't bypass it.
 *
 * TASARIM — akordeon adım akışı (Shopify tarzı checkout'lardan ilham
 * alındı, hiçbir şey birebir kopyalanmadı — koyu tema token'larımıza
 * uyarlandı). `step` state'i (1|2) AYNI kaldı, SADECE render biçimi
 * değişti: tek, büyük, bordürlü bir "form kutusu" içinde iki adımdan
 * birini göstermek yerine, artık İKİ adım da aynı akan dikey yapının
 * parçası (ince `border-t` çizgileriyle ayrılan bölümler, dışarıda tek
 * bir kutu YOK). Aktif adım (step ile eşleşen) tam açık render oluyor
 * (numaralı rozet + tüm alanlar); TAMAMLANAN adım (step 2'deyken adım 1)
 * küçük bir özet satırına daralıyor (✓ ikonu + ad/adres özeti + "Değiştir"
 * linki) — tıklanınca setStep(1) ile yeniden açılıyor, aynı mevcut state
 * korunarak (hiçbir alan sıfırlanmıyor). Adım 2 henüz ULAŞILMAMIŞSA
 * (step === 1) hiç render edilmiyor — "kilitli/gelecek adım" placeholder'ı
 * YOK, sade tutuldu.
 */
export function CheckoutForm({
  storeSlug,
  initialCustomer,
  savedAddresses,
}: {
  storeSlug: string;
  initialCustomer: InitialCustomer | null;
  savedAddresses: SavedAddress[];
}) {
  const { items, clear } = useCart();
  const [state, formAction, isPending] = useActionState(createOrderAction.bind(null, storeSlug), initialCheckoutFormState);
  const clearedForOrderNumber = useRef<number | null>(null);

  const [step, setStep] = useState<Step>(1);

  // FAZ 6.2 — savedAddresses is already sorted default-first, newest-next
  // (see loadCheckoutPrefill), so [0] is always the sensible "pick this
  // one" pre-selection when a default was deleted but other addresses
  // remain. Empty when there are none — every "??"/"||" fallback below
  // then falls straight through to Faz 5.1b's own initialCustomer-based
  // seeding, unchanged, exactly per this phase's own "kayıtlı adresi
  // YOKSA mevcut davranış AYNEN kalsın" instruction.
  const defaultAddress = useMemo(() => savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0] ?? null, [savedAddresses]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(defaultAddress ? defaultAddress.id : "new");

  const [customerName, setCustomerName] = useState(defaultAddress?.recipientName || initialCustomer?.name || "");
  const [customerPhone, setCustomerPhone] = useState(defaultAddress?.phone || initialCustomer?.phone || "");
  const [customerEmail, setCustomerEmail] = useState(initialCustomer?.email ?? "");
  // FAZ 5.1b — seeded from a NAME field (findProvinceByName resolves the
  // name to an id, only used to seed provinceId/districtId's own useState
  // below — neither initialCustomer nor defaultAddress change after this
  // component mounts, so this effectively only ever runs once).
  const seedAddressCity = defaultAddress?.addressCity ?? initialCustomer?.addressCity;
  const seedAddressDistrict = defaultAddress?.addressDistrict ?? initialCustomer?.addressDistrict;
  const initialProvince = useMemo(() => findProvinceByName(seedAddressCity), [seedAddressCity]);
  const [provinceId, setProvinceId] = useState(initialProvince ? String(initialProvince.id) : "");
  const [districtId, setDistrictId] = useState(() => {
    const district = initialProvince?.districts.find((d) => d.name === seedAddressDistrict);
    return district ? String(district.id) : "";
  });
  const [addressNeighborhood, setAddressNeighborhood] = useState(
    defaultAddress?.addressNeighborhood ?? initialCustomer?.addressNeighborhood ?? "",
  );
  const [addressLine, setAddressLine] = useState(defaultAddress?.addressLine ?? initialCustomer?.addressLine ?? "");
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PAYMENT_METHODS[0]);
  const [step1Error, setStep1Error] = useState<string | null>(null);

  const selectedProvince = useMemo(() => PROVINCES.find((p) => String(p.id) === provinceId) ?? null, [provinceId]);
  const districts = useMemo(
    () => (selectedProvince ? [...selectedProvince.districts].sort((a, b) => a.name.localeCompare(b.name, "tr")) : []),
    [selectedProvince],
  );
  const selectedDistrict = useMemo(
    () => districts.find((d) => String(d.id) === districtId) ?? null,
    [districts, districtId],
  );

  useEffect(() => {
    if (state.status === "success" && state.orderNumber !== null && clearedForOrderNumber.current !== state.orderNumber) {
      clearedForOrderNumber.current = state.orderNumber;
      clear();
    }
  }, [state.status, state.orderNumber, clear]);

  // Checked BEFORE the empty-cart case below on purpose: clear() (in the
  // effect above) empties the cart the instant an order succeeds, so
  // items.length is already 0 by the time this renders — without this
  // ordering the confirmation would never be reachable, immediately
  // replaced by "cart is empty" on the very next render.
  if (state.status === "success" && state.orderNumber !== null) {
    return (
      <div className="mt-6 rounded-lg border border-[#292929] bg-[#171717] p-4">
        <h2 className={`${spaceGrotesk.className} text-sm font-bold text-[#F5F5F5]`}>Siparişiniz Alındı</h2>

        {/*
          "Siparişlerim" devir metni — orders.order_number zaten global
          unique olduğu için YENİ bir kolon/kod ÜRETİLMEDİ, var olan
          sipariş numarası "sipariş kodu" olarak kullanılıyor. Önceden
          burada sadece düz metinle gösteriliyordu, müşteriye SAKLAMASI
          gerektiği hiç söylenmiyordu — şimdi ayrı, turuncu vurgulu bir
          blokta, "Siparişlerim" sorgusunda neye ihtiyaç duyacağı AÇIKÇA
          belirtilerek gösteriliyor.
        */}
        <div className="mt-3 rounded-md border border-[#D95F00]/40 bg-[#D95F00]/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#D95F00]">Sipariş Kodunuz</p>
          <div className="mt-1.5 flex items-center justify-between gap-3">
            <span className={`${spaceGrotesk.className} text-2xl font-bold text-[#F5F5F5]`}>#{state.orderNumber}</span>
            <OrderCodeCopyButton orderNumber={state.orderNumber} />
          </div>
          <p className="mt-2 text-xs text-[#A3A3A3]">
            Bu kodu ve sipariş verirken girdiğiniz telefon numarasını &quot;Siparişlerim&quot; bölümünde sipariş
            durumunuzu sorgulamak için kullanabilirsiniz — lütfen kaydedin.
          </p>
        </div>

        {/* "Aboneler" indirim sistemi — server'ın (createOrderAction) gerçekten uyguladığı indirim, client'ın kendi tahmini değil. */}
        {state.discountAmount && state.discountAmount > 0 ? (
          <p className="mt-3 text-sm text-emerald-400">
            {state.discountCode ? `"${state.discountCode}" kodu ile ` : ""}
            {formatPrice(state.discountAmount)} indirim uygulandı.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-[#A3A3A3]">
          Siparişinizi onaylamak için sizi arayacağız. Sorularınız için mağazayla iletişime geçebilirsiniz.
        </p>
      </div>
    );
  }

  // Nothing to check out — cart-list.tsx's own "Sepetiniz boş" message
  // already covers this case, this component adds nothing to it.
  if (items.length === 0) return null;

  /**
   * FAZ 6.2 — picking a different saved address (or "Yeni adres gir")
   * fills the fields, which then stay fully editable — this function only
   * sets initial values for the chosen option, it doesn't lock anything.
   * Selecting "Yeni adres gir" clears only the ADDRESS fields (il/ilçe/
   * mahalle/adres); name/phone/email are left as they are — switching to
   * a new delivery address doesn't imply the shopper's own name/phone
   * changed too.
   */
  function handleAddressChoice(id: string) {
    setSelectedAddressId(id);

    if (id === "new") {
      setProvinceId("");
      setDistrictId("");
      setAddressNeighborhood("");
      setAddressLine("");
      return;
    }

    const address = savedAddresses.find((a) => a.id === id);
    if (!address) return;

    setCustomerName(address.recipientName ?? "");
    setCustomerPhone(address.phone ?? "");
    const province = findProvinceByName(address.addressCity);
    setProvinceId(province ? String(province.id) : "");
    const district = province?.districts.find((d) => d.name === address.addressDistrict);
    setDistrictId(district ? String(district.id) : "");
    setAddressNeighborhood(address.addressNeighborhood ?? "");
    setAddressLine(address.addressLine);
  }

  function handleContinue() {
    if (!customerPhone.trim() || !provinceId || !districtId || !addressNeighborhood.trim() || !addressLine.trim()) {
      setStep1Error("Lütfen telefon, il, ilçe, mahalle ve adres alanlarını doldurun.");
      return;
    }
    setStep1Error(null);
    setStep(2);
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

  // Adım 1 tamamlanıp daraltıldığında gösterilen özet — sadece dolu
  // parçalar birleştiriliyor, "undefined"/bomboş virgül artığı yok.
  const step1Summary = [customerName, [addressNeighborhood, selectedDistrict?.name, selectedProvince?.name].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="mt-6">
      {/* Adım 1 — Teslimat Bilgisi */}
      <div className="border-t border-[#292929] pt-6">
        {step === 1 ? (
          <div>
            <div className="flex items-center gap-2.5">
              <span className={`${spaceGrotesk.className} flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D95F00] text-xs font-bold text-white`}>
                1
              </span>
              <h2 className={`${spaceGrotesk.className} text-base font-bold text-[#F5F5F5]`}>Teslimat Bilgisi</h2>
            </div>

            <div className="mt-5 space-y-4">
              {step1Error ? (
                <p role="alert" className="text-sm text-red-400">
                  {step1Error}
                </p>
              ) : null}

              {savedAddresses.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-[#F5F5F5]">Teslimat Adresi</p>
                  {savedAddresses.map((address) => (
                    <label
                      key={address.id}
                      className="flex items-start gap-2 rounded-md border border-[#292929] p-3 text-sm hover:border-[#D95F00]"
                    >
                      <input
                        type="radio"
                        name="savedAddressChoice"
                        checked={selectedAddressId === address.id}
                        onChange={() => handleAddressChoice(address.id)}
                        className={`mt-0.5 ${storefrontRadioClasses}`}
                      />
                      <span>
                        <span className="font-medium text-[#F5F5F5]">{address.label || `${address.addressCity} adresi`}</span>
                        {address.isDefault ? <span className="ml-2 text-xs text-[#D95F00]">Varsayılan</span> : null}
                        <br />
                        <span className="text-[#A3A3A3]">
                          {address.addressDistrict}, {address.addressCity}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 rounded-md border border-[#292929] p-3 text-sm text-[#F5F5F5] hover:border-[#D95F00]">
                    <input
                      type="radio"
                      name="savedAddressChoice"
                      checked={selectedAddressId === "new"}
                      onChange={() => handleAddressChoice("new")}
                      className={storefrontRadioClasses}
                    />
                    Yeni adres gir
                  </label>
                </div>
              ) : null}
    
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="checkout-customerName" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                    Ad Soyad
                  </label>
                  <input
                    id="checkout-customerName"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={storefrontInputClasses}
                  />
                </div>
                <div>
                  <label htmlFor="checkout-customerPhone" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                    Telefon
                  </label>
                  <input
                    id="checkout-customerPhone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className={storefrontInputClasses}
                  />
                </div>
              </div>
    
              <div>
                <label htmlFor="checkout-customerEmail" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                  E-posta <span className="text-[#A3A3A3]">(opsiyonel)</span>
                </label>
                <input
                  id="checkout-customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className={storefrontInputClasses}
                />
              </div>
    
              <ProvinceDistrictSelect
                idPrefix="checkout"
                provinceId={provinceId}
                districtId={districtId}
                onProvinceIdChange={setProvinceId}
                onDistrictIdChange={setDistrictId}
              />
    
              <div>
                <label htmlFor="checkout-neighborhood" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                  Mahalle
                </label>
                <input
                  id="checkout-neighborhood"
                  type="text"
                  value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  placeholder="ör. Caferağa Mahallesi"
                  className={storefrontInputClasses}
                />
              </div>
    
              <div>
                <label htmlFor="checkout-addressLine" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                  Adres (Sokak / Bina / Daire No)
                </label>
                <textarea
                  id="checkout-addressLine"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  rows={2}
                  className={storefrontInputClasses}
                />
              </div>
    
              <div>
                <label htmlFor="checkout-note" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                  Not <span className="text-[#A3A3A3]">(opsiyonel)</span>
                </label>
                <textarea id="checkout-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={storefrontInputClasses} />
              </div>

              <button type="button" onClick={handleContinue} className={`${spaceGrotesk.className} ${storefrontButtonClasses}`}>
                Devam Et
              </button>
            </div>
          </div>
        ) : (
          // Tamamlandı — daraltılmış özet satırı + "Değiştir". Tıklanınca
          // setStep(1) ile yeniden açılıyor, mevcut state (ad/adres/vb.)
          // AYNEN korunuyor, hiçbir alan sıfırlanmıyor.
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#D95F00] text-[#D95F00]">
                <Check size={13} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-medium text-[#F5F5F5]">Teslimat Bilgisi</p>
                {step1Summary ? <p className="mt-0.5 text-xs text-[#A3A3A3]">{step1Summary}</p> : null}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-medium text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline"
            >
              Değiştir
            </button>
          </div>
        )}
      </div>

      {/* Adım 2 — Ödeme Yöntemi. Adım 1 tamamlanmadan HİÇ render edilmiyor (kilitli/gelecek adım placeholder'ı yok, sade tutuldu). */}
      {step === 2 ? (
        <div className="border-t border-[#292929] pt-6">
          <div className="flex items-center gap-2.5">
            <span className={`${spaceGrotesk.className} flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#D95F00] text-xs font-bold text-white`}>
              2
            </span>
            <h2 className={`${spaceGrotesk.className} text-base font-bold text-[#F5F5F5]`}>Ödeme Yöntemi</h2>
          </div>

          <form action={formAction} className="mt-5 space-y-4">
            <input type="hidden" name="cartItems" value={JSON.stringify(items.map(toWireCartLine))} />
            <input type="hidden" name="customerName" value={customerName} />
            <input type="hidden" name="customerPhone" value={customerPhone} />
            <input type="hidden" name="customerEmail" value={customerEmail} />
            <input type="hidden" name="addressCity" value={selectedProvince?.name ?? ""} />
            <input type="hidden" name="addressDistrict" value={selectedDistrict?.name ?? ""} />
            <input type="hidden" name="addressNeighborhood" value={addressNeighborhood} />
            <input type="hidden" name="addressLine" value={addressLine} />
            <input type="hidden" name="note" value={note} />

            {state.status === "error" && state.error ? (
              <p role="alert" className="text-sm text-red-400">
                {state.error}
              </p>
            ) : null}

            <div>
              <p className="mb-1.5 text-sm font-medium text-[#F5F5F5]">Ödeme Yöntemi</p>
              <p className="mb-2 text-xs text-[#A3A3A3]">Bilgi amaçlıdır — online ödeme alt yapısı henüz eklenmedi.</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map((method) => (
                  <label key={method} className="flex items-center gap-2 text-sm text-[#F5F5F5]">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={paymentMethod === method}
                      onChange={() => setPaymentMethod(method)}
                      className={storefrontRadioClasses}
                    />
                    {method}
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-md border border-[#292929] p-3">
              <h3 className="text-xs font-medium text-[#A3A3A3]">Sipariş Özeti</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {items.map((item) => (
                  <li key={item.lineId} className="flex justify-between gap-3">
                    <span className="text-[#A3A3A3]">
                      {item.productName}
                      {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                    </span>
                    <span className="whitespace-nowrap text-[#F5F5F5]">{formatPrice(item.unitPrice * item.quantity)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-2 flex justify-between border-t border-[#292929] pt-2 text-sm font-semibold text-[#F5F5F5]">
                <span>Toplam</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
            </div>

            {/*
              "Aboneler" indirim sistemi — kod GERÇEKTEN geçerli mi/aktif mi/
              bu mağazaya mı ait, sadece siparişi tamamen gönderip
              createOrderAction çalıştığında server-side doğrulanıyor (burada
              ayrı bir "kodu uygula" ön-kontrolü YOK — ek bir Server Action
              round-trip'i bu fazın kapsamı dışında). Geçersiz bir kod, formu
              tekrar hatayla (yukarıdaki state.error) döndürür, sipariş
              OLUŞTURULMAZ — indirimsiz sessizce devam etmez.
            */}
            <div>
              <label htmlFor="discountCode" className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
                İndirim Kodu <span className="font-normal text-[#A3A3A3]">(varsa)</span>
              </label>
              <input id="discountCode" name="discountCode" type="text" className={storefrontInputClasses} placeholder="Örn. HOSGELDIN10" />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isPending}
                className={`${spaceGrotesk.className} ${storefrontButtonOutlineClasses}`}
              >
                Geri
              </button>
              <button type="submit" disabled={isPending} className={`${spaceGrotesk.className} ${storefrontButtonClasses}`}>
                {isPending ? "Gönderiliyor..." : "Siparişi Onayla"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
