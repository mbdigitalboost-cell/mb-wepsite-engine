"use client";

import { useMemo } from "react";
import { inputClasses } from "@/lib/utils/input-classes";
import turkeyLocationsData from "@/lib/data/turkey-locations.json";

export interface Province {
  id: number;
  name: string;
  districts: { id: number; name: string }[];
}

// lib/data/turkey-locations.README.md — il/ilçe only (~32KB), MIT-licensed,
// sourced from onurusluca/turkey-geo-api. Mahalle is deliberately NOT a
// third cascading level here — see that README for the size trade-off.
export const PROVINCES: Province[] = (turkeyLocationsData as Province[])
  .slice()
  .sort((a, b) => a.name.localeCompare(b.name, "tr"));

/** Used by callers that need the province/district NAME (not id) for an initial useState seed — see checkout-form.tsx and signup-form.tsx. */
export function findProvinceByName(name: string | undefined): Province | null {
  if (!name) return null;
  return PROVINCES.find((p) => p.name === name) ?? null;
}

/**
 * FAZ 5.1b — extracted from checkout-form.tsx's own inline il/ilçe select
 * markup so app/store/[storeSlug]/hesap/kayit/signup-form.tsx can reuse the
 * exact same cascading-select behavior instead of duplicating it (spec's
 * own "ortak bir bileşene çıkarmak istersen iyi olur"). Fully controlled —
 * the parent owns provinceId/districtId state (and therefore the resolved
 * province/district NAME for its own hidden `addressCity`/`addressDistrict`
 * inputs), this component only renders the two <select>s and resets
 * districtId to "" whenever province changes.
 */
export function ProvinceDistrictSelect({
  idPrefix,
  provinceId,
  districtId,
  onProvinceIdChange,
  onDistrictIdChange,
}: {
  idPrefix: string;
  provinceId: string;
  districtId: string;
  onProvinceIdChange: (id: string) => void;
  onDistrictIdChange: (id: string) => void;
}) {
  const selectedProvince = useMemo(() => PROVINCES.find((p) => String(p.id) === provinceId) ?? null, [provinceId]);
  const districts = useMemo(
    () => (selectedProvince ? [...selectedProvince.districts].sort((a, b) => a.name.localeCompare(b.name, "tr")) : []),
    [selectedProvince],
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label htmlFor={`${idPrefix}-province`} className="mb-1.5 block text-sm font-medium text-foreground">
          İl
        </label>
        <select
          id={`${idPrefix}-province`}
          value={provinceId}
          onChange={(e) => {
            onProvinceIdChange(e.target.value);
            onDistrictIdChange("");
          }}
          className={inputClasses}
        >
          <option value="">Seçin</option>
          {PROVINCES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${idPrefix}-district`} className="mb-1.5 block text-sm font-medium text-foreground">
          İlçe
        </label>
        <select
          id={`${idPrefix}-district`}
          value={districtId}
          onChange={(e) => onDistrictIdChange(e.target.value)}
          disabled={!provinceId}
          className={inputClasses}
        >
          <option value="">{provinceId ? "Seçin" : "Önce il seçin"}</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
