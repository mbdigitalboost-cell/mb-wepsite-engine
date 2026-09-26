"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { useCart, type CartItem } from "@/components/commerce/public/cart/cart-context";
import { formatPrice } from "@/lib/utils/format-price";
import { PAYMENT_METHODS, type PaymentMethod } from "@/lib/validation/order";
import { PROVINCES, ProvinceDistrictSelect, findProvinceByName } from "@/components/commerce/public/location-select";
import { createOrderAction } from "./actions";
import { initialCheckoutFormState } from "./form-state";

function toWireCartLine(item: CartItem) {
  return {
    productSlug: item.productSlug,
    variantId: item.variantId,
    addonIds: item.addonIds,
    quantity: item.quantity,
  };
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
      <div className="mt-6 rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold text-foreground">Siparişiniz Alındı</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Sipariş No: <span className="font-medium text-foreground">#{state.orderNumber}</span>
        </p>
        <p className="mt-1 text-sm text-foreground/70">
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

  return (
    <div className="mt-6 rounded-lg border border-black/10 p-4">
      <div className="mb-4 flex items-center gap-2 text-xs text-foreground/50">
        <span className={step === 1 ? "font-semibold text-foreground" : undefined}>1. Teslimat Bilgisi</span>
        <span aria-hidden="true">→</span>
        <span className={step === 2 ? "font-semibold text-foreground" : undefined}>2. Ödeme Yöntemi</span>
      </div>

      {step === 1 ? (
        <div className="space-y-4">
          {step1Error ? (
            <p role="alert" className="text-sm text-red-600">
              {step1Error}
            </p>
          ) : null}

          {savedAddresses.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">Teslimat Adresi</p>
              {savedAddresses.map((address) => (
                <label
                  key={address.id}
                  className="flex items-start gap-2 rounded-md border border-black/10 p-3 text-sm hover:border-black/20"
                >
                  <input
                    type="radio"
                    name="savedAddressChoice"
                    checked={selectedAddressId === address.id}
                    onChange={() => handleAddressChoice(address.id)}
                    className="mt-0.5 h-4 w-4 border-black/20"
                  />
                  <span>
                    <span className="font-medium text-foreground">{address.label || `${address.addressCity} adresi`}</span>
                    {address.isDefault ? <span className="ml-2 text-xs text-brand-accent">Varsayılan</span> : null}
                    <br />
                    <span className="text-foreground/60">
                      {address.addressDistrict}, {address.addressCity}
                    </span>
                  </span>
                </label>
              ))}
              <label className="flex items-center gap-2 rounded-md border border-black/10 p-3 text-sm hover:border-black/20">
                <input
                  type="radio"
                  name="savedAddressChoice"
                  checked={selectedAddressId === "new"}
                  onChange={() => handleAddressChoice("new")}
                  className="h-4 w-4 border-black/20"
                />
                Yeni adres gir
              </label>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="checkout-customerName" className="mb-1.5 block text-sm font-medium text-foreground">
                Ad Soyad
              </label>
              <input
                id="checkout-customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={inputClasses}
              />
            </div>
            <div>
              <label htmlFor="checkout-customerPhone" className="mb-1.5 block text-sm font-medium text-foreground">
                Telefon
              </label>
              <input
                id="checkout-customerPhone"
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className={inputClasses}
              />
            </div>
          </div>

          <div>
            <label htmlFor="checkout-customerEmail" className="mb-1.5 block text-sm font-medium text-foreground">
              E-posta <span className="text-foreground/40">(opsiyonel)</span>
            </label>
            <input
              id="checkout-customerEmail"
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={inputClasses}
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
            <label htmlFor="checkout-neighborhood" className="mb-1.5 block text-sm font-medium text-foreground">
              Mahalle
            </label>
            <input
              id="checkout-neighborhood"
              type="text"
              value={addressNeighborhood}
              onChange={(e) => setAddressNeighborhood(e.target.value)}
              placeholder="ör. Caferağa Mahallesi"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="checkout-addressLine" className="mb-1.5 block text-sm font-medium text-foreground">
              Adres (Sokak / Bina / Daire No)
            </label>
            <textarea
              id="checkout-addressLine"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              rows={2}
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="checkout-note" className="mb-1.5 block text-sm font-medium text-foreground">
              Not <span className="text-foreground/40">(opsiyonel)</span>
            </label>
            <textarea id="checkout-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className={inputClasses} />
          </div>

          <Button type="button" size="md" onClick={handleContinue}>
            Devam Et
          </Button>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
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
            <p role="alert" className="text-sm text-red-600">
              {state.error}
            </p>
          ) : null}

          <div>
            <p className="mb-1.5 text-sm font-medium text-foreground">Ödeme Yöntemi</p>
            <p className="mb-2 text-xs text-foreground/50">Bilgi amaçlıdır — online ödeme alt yapısı henüz eklenmedi.</p>
            <div className="space-y-2">
              {PAYMENT_METHODS.map((method) => (
                <label key={method} className="flex items-center gap-2 text-sm text-foreground/80">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method}
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                    className="h-4 w-4 border-black/20"
                  />
                  {method}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-black/10 p-3">
            <h3 className="text-xs font-medium text-foreground/60">Sipariş Özeti</h3>
            <ul className="mt-2 space-y-1 text-sm">
              {items.map((item) => (
                <li key={item.lineId} className="flex justify-between gap-3">
                  <span className="text-foreground/80">
                    {item.productName}
                    {item.variantLabel ? ` (${item.variantLabel})` : ""} × {item.quantity}
                  </span>
                  <span className="whitespace-nowrap text-foreground">{formatPrice(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex justify-between border-t border-black/10 pt-2 text-sm font-semibold text-foreground">
              <span>Toplam</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" size="md" variant="outline" onClick={() => setStep(1)} disabled={isPending}>
              Geri
            </Button>
            <Button type="submit" size="md" disabled={isPending}>
              {isPending ? "Gönderiliyor..." : "Siparişi Onayla"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
