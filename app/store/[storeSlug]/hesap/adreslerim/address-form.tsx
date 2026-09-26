"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { PROVINCES, ProvinceDistrictSelect, findProvinceByName } from "@/components/commerce/public/location-select";
import { addAddressAction, updateAddressAction } from "./actions";
import { initialAddressFormState } from "./form-state";

export interface AddressFormInitialValues {
  label: string;
  recipientName: string;
  phone: string;
  addressCity: string;
  addressDistrict: string;
  addressNeighborhood: string;
  addressLine: string;
}

/**
 * FAZ 6.2 — shared by both the "Yeni Adres Ekle" form (adreslerim/page.tsx)
 * and the edit page ([addressId]/duzenle/page.tsx) — same fields either
 * way, only the bound action and submit label differ. Uses the same
 * ProvinceDistrictSelect (components/commerce/public/location-select.tsx)
 * — and the exact same "resolve province/district id from a NAME for the
 * initial useState, keep a hidden input carrying the resolved name back
 * out" pattern — that sepet/checkout-form.tsx already established. Not
 * reimplemented, just applied here too.
 */
export function AddressForm({
  storeSlug,
  addressId,
  initialValues,
}: {
  storeSlug: string;
  /** Present only when editing an existing address. */
  addressId?: string;
  initialValues?: AddressFormInitialValues;
}) {
  const action = addressId ? updateAddressAction.bind(null, storeSlug, addressId) : addAddressAction.bind(null, storeSlug);
  const [state, formAction, pending] = useActionState(action, initialAddressFormState);
  const formId = useId();

  const initialProvince = useMemo(() => findProvinceByName(initialValues?.addressCity), [initialValues?.addressCity]);
  const [provinceId, setProvinceId] = useState(initialProvince ? String(initialProvince.id) : "");
  const [districtId, setDistrictId] = useState(() => {
    const district = initialProvince?.districts.find((d) => d.name === initialValues?.addressDistrict);
    return district ? String(district.id) : "";
  });

  const selectedProvince = useMemo(() => PROVINCES.find((p) => String(p.id) === provinceId) ?? null, [provinceId]);
  const selectedDistrict = useMemo(
    () => selectedProvince?.districts.find((d) => String(d.id) === districtId) ?? null,
    [selectedProvince, districtId],
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${formId}-label`} className="mb-1.5 block text-sm font-medium text-foreground">
            Etiket <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-label`}
            name="label"
            type="text"
            defaultValue={initialValues?.label}
            placeholder="ör. Ev, İş"
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-recipientName`} className="mb-1.5 block text-sm font-medium text-foreground">
            Alıcı Adı <span className="text-foreground/40">(opsiyonel)</span>
          </label>
          <input
            id={`${formId}-recipientName`}
            name="recipientName"
            type="text"
            defaultValue={initialValues?.recipientName}
            className={inputClasses}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${formId}-phone`} className="mb-1.5 block text-sm font-medium text-foreground">
          Telefon <span className="text-foreground/40">(opsiyonel)</span>
        </label>
        <input id={`${formId}-phone`} name="phone" type="tel" defaultValue={initialValues?.phone} className={inputClasses} />
      </div>

      <input type="hidden" name="addressCity" value={selectedProvince?.name ?? ""} />
      <input type="hidden" name="addressDistrict" value={selectedDistrict?.name ?? ""} />
      <ProvinceDistrictSelect
        idPrefix={formId}
        provinceId={provinceId}
        districtId={districtId}
        onProvinceIdChange={setProvinceId}
        onDistrictIdChange={setDistrictId}
      />

      <div>
        <label htmlFor={`${formId}-neighborhood`} className="mb-1.5 block text-sm font-medium text-foreground">
          Mahalle
        </label>
        <input
          id={`${formId}-neighborhood`}
          name="addressNeighborhood"
          type="text"
          defaultValue={initialValues?.addressNeighborhood}
          placeholder="ör. Caferağa Mahallesi"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-addressLine`} className="mb-1.5 block text-sm font-medium text-foreground">
          Adres (Sokak / Bina / Daire No)
        </label>
        <textarea
          id={`${formId}-addressLine`}
          name="addressLine"
          defaultValue={initialValues?.addressLine}
          rows={2}
          className={inputClasses}
        />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="md" disabled={pending}>
        {pending ? "Kaydediliyor..." : addressId ? "Adresi Güncelle" : "Adresi Kaydet"}
      </Button>
    </form>
  );
}
