"use client";

import { useActionState, useId, useMemo, useState } from "react";
import Link from "next/link";
import { Space_Grotesk } from "next/font/google";
import { storefrontInputClasses } from "@/lib/utils/storefront-input-classes";
import { storefrontButtonClasses } from "@/lib/utils/storefront-button-classes";
import { PROVINCES, ProvinceDistrictSelect } from "@/components/commerce/public/location-select";
import { signupAction } from "../actions";
import { initialStoreSignupState } from "../form-state";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], weight: ["700"] });

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
      <div className="rounded-lg border border-[#292929] bg-[#171717] p-4">
        <h2 className={`${spaceGrotesk.className} text-sm font-bold text-[#F5F5F5]`}>E-postanızı Kontrol Edin</h2>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          Hesabınızı onaylamak için size bir e-posta gönderdik. Onay bağlantısına tıkladıktan sonra giriş
          yapabilirsiniz.
        </p>
        <Link
          href={`/store/${storeSlug}/hesap/giris`}
          className="mt-3 inline-block text-sm text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline"
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
        <label htmlFor={`${formId}-fullName`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Ad Soyad
        </label>
        <input
          id={`${formId}-fullName`}
          name="fullName"
          type="text"
          required
          autoComplete="name"
          autoFocus
          className={storefrontInputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-email`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          E-posta
        </label>
        <input id={`${formId}-email`} name="email" type="email" required autoComplete="email" className={storefrontInputClasses} />
      </div>

      <div>
        <label htmlFor={`${formId}-password`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Şifre
        </label>
        <input
          id={`${formId}-password`}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className={storefrontInputClasses}
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
        <label htmlFor={`${formId}-neighborhood`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Mahalle
        </label>
        <input
          id={`${formId}-neighborhood`}
          name="addressNeighborhood"
          type="text"
          required
          placeholder="ör. Caferağa Mahallesi"
          className={storefrontInputClasses}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-addressLine`} className="mb-1.5 block text-sm font-medium text-[#F5F5F5]">
          Adres (Sokak / Bina / Daire No)
        </label>
        <textarea id={`${formId}-addressLine`} name="addressLine" required rows={2} className={storefrontInputClasses} />
      </div>

      {state.status === "error" && state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}

      <button type="submit" disabled={pending} className={`${spaceGrotesk.className} w-full ${storefrontButtonClasses}`}>
        {pending ? "Kayıt oluşturuluyor..." : "Hesap Oluştur"}
      </button>

      <p className="text-center text-xs text-[#A3A3A3]">
        Zaten hesabınız var mı?{" "}
        <Link href={`/store/${storeSlug}/hesap/giris`} className="text-[#D95F00] underline-offset-2 hover:text-[#F26A00] hover:underline">
          Giriş yapın
        </Link>
      </p>
    </form>
  );
}
