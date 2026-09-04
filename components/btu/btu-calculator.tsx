"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { btuCalculatorSchema } from "@/lib/validation/btu";
import { calculateBtu } from "@/lib/btu/calculate";
import {
  REGIONS,
  REGION_LABELS,
  FACADES,
  FACADE_LABELS,
  SUN_EXPOSURE_LEVELS,
  SUN_EXPOSURE_LABELS,
  INSULATION_LEVELS,
  INSULATION_LABELS,
  HEAT_GENERATING_EQUIPMENT,
  HEAT_GENERATING_EQUIPMENT_LABELS,
  type BtuCalculationResult,
} from "@/lib/btu/types";

const inputClasses =
  "w-full rounded-[var(--radius-brand)] border border-white/15 bg-transparent px-4 py-3 text-sm text-white placeholder:text-white/40 focus-visible:border-brand-primary focus-visible:outline-none";

const numberFormatter = new Intl.NumberFormat("tr-TR");

function formatBtu(value: number): string {
  return `${numberFormatter.format(Math.round(value))} BTU/h`;
}

interface ExtraInfo {
  regionLabel: string;
  facadeLabel: string;
  sunExposureLabel: string;
  insulationLabel: string;
  ceilingHeightMeters: number;
  windowCount: number;
  equipmentLabels: string[];
}

export function BtuCalculator() {
  const formRef = useRef<HTMLFormElement>(null);
  const formId = useId();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<BtuCalculationResult | null>(null);
  const [extra, setExtra] = useState<ExtraInfo | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const values = {
      region: String(formData.get("region") ?? ""),
      widthMeters: String(formData.get("widthMeters") ?? ""),
      lengthMeters: String(formData.get("lengthMeters") ?? ""),
      ceilingHeightMeters: String(formData.get("ceilingHeightMeters") ?? ""),
      peopleCount: String(formData.get("peopleCount") ?? ""),
      facade: String(formData.get("facade") ?? ""),
      sunExposure: String(formData.get("sunExposure") ?? ""),
      insulationLevel: String(formData.get("insulationLevel") ?? ""),
      windowCount: String(formData.get("windowCount") ?? ""),
      heatGeneratingEquipment: formData.getAll("heatGeneratingEquipment").map(String),
    };

    const parsed = btuCalculatorSchema.safeParse(values);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === "string" && !errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setResult(null);
      setExtra(null);
      return;
    }

    setResult(calculateBtu(parsed.data));
    setExtra({
      regionLabel: REGION_LABELS[parsed.data.region],
      facadeLabel: FACADE_LABELS[parsed.data.facade],
      sunExposureLabel: SUN_EXPOSURE_LABELS[parsed.data.sunExposure],
      insulationLabel: INSULATION_LABELS[parsed.data.insulationLevel],
      ceilingHeightMeters: parsed.data.ceilingHeightMeters,
      windowCount: parsed.data.windowCount,
      equipmentLabels: parsed.data.heatGeneratingEquipment.map((key) => HEAT_GENERATING_EQUIPMENT_LABELS[key]),
    });
  }

  function handleReset() {
    formRef.current?.reset();
    setFieldErrors({});
    setResult(null);
    setExtra(null);
  }

  return (
    <div className="space-y-10">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${formId}-region`} className="mb-2 block text-sm font-medium text-white">
              Bölge
            </label>
            <select
              id={`${formId}-region`}
              name="region"
              defaultValue=""
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.region)}
            >
              <option value="">Seçiniz</option>
              {REGIONS.map((region) => (
                <option key={region} value={region}>
                  {REGION_LABELS[region]}
                </option>
              ))}
            </select>
            {fieldErrors.region ? <p className="mt-1 text-xs text-brand-primary">{fieldErrors.region}</p> : null}
          </div>

          <div>
            <label htmlFor={`${formId}-peopleCount`} className="mb-2 block text-sm font-medium text-white">
              Kişi Sayısı
            </label>
            <input
              id={`${formId}-peopleCount`}
              name="peopleCount"
              type="number"
              min={1}
              max={100}
              step={1}
              inputMode="numeric"
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.peopleCount)}
            />
            {fieldErrors.peopleCount ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.peopleCount}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-widthMeters`} className="mb-2 block text-sm font-medium text-white">
              Oda Genişliği (m)
            </label>
            <input
              id={`${formId}-widthMeters`}
              name="widthMeters"
              type="number"
              min={0.5}
              max={100}
              step={0.1}
              inputMode="decimal"
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.widthMeters)}
            />
            {fieldErrors.widthMeters ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.widthMeters}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-lengthMeters`} className="mb-2 block text-sm font-medium text-white">
              Oda Uzunluğu (m)
            </label>
            <input
              id={`${formId}-lengthMeters`}
              name="lengthMeters"
              type="number"
              min={0.5}
              max={100}
              step={0.1}
              inputMode="decimal"
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.lengthMeters)}
            />
            {fieldErrors.lengthMeters ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.lengthMeters}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-ceilingHeightMeters`} className="mb-2 block text-sm font-medium text-white">
              Tavan Yüksekliği (m)
            </label>
            <input
              id={`${formId}-ceilingHeightMeters`}
              name="ceilingHeightMeters"
              type="number"
              min={2}
              max={10}
              step={0.1}
              inputMode="decimal"
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.ceilingHeightMeters)}
            />
            {fieldErrors.ceilingHeightMeters ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.ceilingHeightMeters}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-windowCount`} className="mb-2 block text-sm font-medium text-white">
              Pencere Sayısı
            </label>
            <input
              id={`${formId}-windowCount`}
              name="windowCount"
              type="number"
              min={0}
              max={100}
              step={1}
              inputMode="numeric"
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.windowCount)}
            />
            {fieldErrors.windowCount ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.windowCount}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-facade`} className="mb-2 block text-sm font-medium text-white">
              Cephe
            </label>
            <select
              id={`${formId}-facade`}
              name="facade"
              defaultValue=""
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.facade)}
            >
              <option value="">Seçiniz</option>
              {FACADES.map((facade) => (
                <option key={facade} value={facade}>
                  {FACADE_LABELS[facade]}
                </option>
              ))}
            </select>
            {fieldErrors.facade ? <p className="mt-1 text-xs text-brand-primary">{fieldErrors.facade}</p> : null}
          </div>

          <div>
            <label htmlFor={`${formId}-sunExposure`} className="mb-2 block text-sm font-medium text-white">
              Güneş Alma Durumu
            </label>
            <select
              id={`${formId}-sunExposure`}
              name="sunExposure"
              defaultValue=""
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.sunExposure)}
            >
              <option value="">Seçiniz</option>
              {SUN_EXPOSURE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {SUN_EXPOSURE_LABELS[level]}
                </option>
              ))}
            </select>
            {fieldErrors.sunExposure ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.sunExposure}</p>
            ) : null}
          </div>

          <div>
            <label htmlFor={`${formId}-insulationLevel`} className="mb-2 block text-sm font-medium text-white">
              Yalıtım Durumu
            </label>
            <select
              id={`${formId}-insulationLevel`}
              name="insulationLevel"
              defaultValue=""
              className={inputClasses}
              aria-invalid={Boolean(fieldErrors.insulationLevel)}
            >
              <option value="">Seçiniz</option>
              {INSULATION_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {INSULATION_LABELS[level]}
                </option>
              ))}
            </select>
            {fieldErrors.insulationLevel ? (
              <p className="mt-1 text-xs text-brand-primary">{fieldErrors.insulationLevel}</p>
            ) : null}
          </div>
        </div>

        <div>
          <span className="mb-2 block text-sm font-medium text-white">
            Elektrikli / Isı Üreten Cihazlar <span className="text-white/40">(varsa işaretleyin, opsiyonel)</span>
          </span>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {HEAT_GENERATING_EQUIPMENT.map((equipment) => (
              <label key={equipment} className="flex items-center gap-2 text-sm text-white/80">
                <input
                  type="checkbox"
                  name="heatGeneratingEquipment"
                  value={equipment}
                  className="h-4 w-4 rounded border-white/25 bg-transparent"
                />
                {HEAT_GENERATING_EQUIPMENT_LABELS[equipment]}
              </label>
            ))}
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full sm:w-auto">
          Hesapla
        </Button>
      </form>

      {result && extra ? (
        <div className="rounded-[var(--radius-brand)] border border-white/15 p-6 sm:p-8">
          <p className="text-sm font-medium text-white/60">Yaklaşık Klima İhtiyacınız</p>
          <p className="mt-1 text-2xl font-semibold text-white">{formatBtu(result.breakdown.totalBtu)}</p>

          <p className="mt-6 text-sm font-medium text-white/60">Önerilen Standart Klima Kapasitesi</p>
          {result.recommendedCapacityBtu !== null ? (
            <p className="mt-1 text-2xl font-semibold text-brand-primary">
              {formatBtu(result.recommendedCapacityBtu)}
            </p>
          ) : (
            <p className="mt-1 text-base font-medium text-white">
              Bu alan için standart tek cihaz seçimi yerine profesyonel keşif önerilir.
            </p>
          )}

          <p className="mt-6 text-sm text-white/70">
            Bu sonuç, girdiğiniz bilgilere göre yapılan bir ÖN HESAPLAMADIR ve profesyonel keşifin yerini tutmaz.
            Tavan yüksekliği, cephe, güneş alma durumu, yalıtım, pencere sayısı ve ısı üreten cihazlar gibi
            koşullar gerçek ihtiyacı etkileyebilir; kesin kapasite seçimi için yerinde keşif önerilir.
          </p>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/10 pt-6 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-white/50">Alan</dt>
              <dd className="font-medium text-white">{numberFormatter.format(result.breakdown.areaSquareMeters)} m²</dd>
            </div>
            <div>
              <dt className="text-white/50">Bölge</dt>
              <dd className="font-medium text-white">{extra.regionLabel}</dd>
            </div>
            <div>
              <dt className="text-white/50">Bölge Katsayısı</dt>
              <dd className="font-medium text-white">{result.breakdown.regionCoefficient}</dd>
            </div>
            <div>
              <dt className="text-white/50">Alan Yükü</dt>
              <dd className="font-medium text-white">{formatBtu(result.breakdown.areaLoadBtu)}</dd>
            </div>
            <div>
              <dt className="text-white/50">Kişi Sayısı</dt>
              <dd className="font-medium text-white">{result.breakdown.peopleCount}</dd>
            </div>
            <div>
              <dt className="text-white/50">Kişi Yükü</dt>
              <dd className="font-medium text-white">{formatBtu(result.breakdown.peopleLoadBtu)}</dd>
            </div>
            <div>
              <dt className="text-white/50">Toplam</dt>
              <dd className="font-medium text-white">{formatBtu(result.breakdown.totalBtu)}</dd>
            </div>
            <div>
              <dt className="text-white/50">Önerilen Kapasite</dt>
              <dd className="font-medium text-white">
                {result.recommendedCapacityBtu !== null ? formatBtu(result.recommendedCapacityBtu) : "Standart aralık üzerinde"}
              </dd>
            </div>
          </dl>

          <div className="mt-6 border-t border-white/10 pt-6 text-sm text-white/60">
            <p className="font-medium text-white/70">Belirttiğiniz diğer koşullar (bilgi amaçlı, hesaba katılmadı)</p>
            <p className="mt-2">
              Tavan yüksekliği: {numberFormatter.format(extra.ceilingHeightMeters)} m · Cephe: {extra.facadeLabel} · Güneş alma:{" "}
              {extra.sunExposureLabel} · Yalıtım: {extra.insulationLabel} · Pencere sayısı: {extra.windowCount}
              {extra.equipmentLabels.length > 0 ? ` · Cihazlar: ${extra.equipmentLabels.join(", ")}` : ""}
            </p>
          </div>

          <Button type="button" variant="outline" size="sm" className="mt-6" onClick={handleReset}>
            Tekrar Hesapla
          </Button>
        </div>
      ) : null}
    </div>
  );
}
