"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { PROVINCES, ProvinceDistrictSelect } from "@/components/commerce/public/location-select";
import { signupAction } from "../actions";
import { initialStoreSignupState } from "../form-state";

/**
 * FAZ 5.1b — il/ilçe/mahalle/adres fields added, same set + same
 * required-ness as checkout-form.tsx's own "Teslimat Bilgisi" step (per
 * spec: "checkout-form.tsx'teki 'Teslimat Bilgisi' adımıyla AYNI alan
 * seti ve AYNI zorunluluk kuralları"). province/district are submitted as
 * hidden inputs carrying the resolved NAME (not id) — same reasoning as
 * checkout-form.tsx's own hidden addressCity/addressDistrict inputs:
 * that's the shape storeSignupFormSchema (and every other address field
 * in this schema) actually expects.
 */
export function SignupForm({ storeSlug }: { storeSlug: string }) {
  const [state, formAction, pending] = useActionState(signupAction.bind(null, storeSlug), initialStoreSignupState);
  const formId = useId();

  const [provinceId, setProvinceId] = useState("");
  const [districtId, setDistrictId] = useState("");

  const selectedProvince = useMemo(() => PROVINCES.find((p) => String(p.id) === provinceId) ?? null, [provinceId]);
  const districts = useMemo(
    () => (selectedProvince ? selectedProvince.districts : []),
    [selectedProvince],
  );
  const selectedDistrict = useMemo(
    () => districts.find((d) => String(d.id) === districtId) ?? null,
    [districts, districtId],
  );

  if (state.status === "confirm_email") {
    return (
      <div className="rounded-lg border border-black/10 p-4">
        <h2 className="text-sm font-semibold text-foreground">E-postanızı Kontrol Edin</h2>
        <p className="mt-2 text-sm text-foreground/70">
          Hesabınızı onaylamak için size bir e-posta gönderdik. Onay bağlantısına tıkladıktan sonra giriş
          yapabilirsiniz.
        </p>
        <Link
          href={`/store/${storeSlug}/hesap/giris`}
          className="mt-3 inline-block text-sm text-brand-accent underline-offset-2 hover:underline"
        >
          Giriş sayfasına git
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="addressCity" value={selectedProvince?.name ?? ""} />
      <input type="hidden" name="addressDistrict" value={selectedDistrict?.name ?? ""} />

      <div>
        <label htmlFor={`${formId}-fullName`} className="mb-1.5 block text-sm font-medium text-foreground">
          Ad Soyad
        </label>
        <input
          id={`${formId}-fullName`}
          name="fullName"
          type="text"
          required
          autoComplete="name"
          autoFocus
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-foreground">
          E-posta
        </label>
        <input id={`${formId}-email`} name="email" type="email" required autoComplete="email" className={inputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-foreground">
          Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={inputClasses}
        />
      </div>

      <ProvinceDistrictSelect
        idPrefix={`${formId}-signup`}
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
          required
          placeholder="ör. Caferağa Mahallesi"
          className={inputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-addressLine`} className="mb-1.5 block text-sm font-medium text-foreground">
          Adres (Sokak / Bina / Daire No)
        </label>
        <textarea id={`${formId}-addressLine`} name="addressLine" required rows={2} className={inputClasses} />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="w-full justify-center">
        {pending ? "Kayıt oluşturuluyor..." : "Hesap Oluştur"}
      </Button>

      <p className="text-center text-xs text-foreground/50">
        Zaten hesabınız var mı?{" "}
        <Link href={`/store/${storeSlug}/hesap/giris`} className="text-brand-accent underline-offset-2 hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
