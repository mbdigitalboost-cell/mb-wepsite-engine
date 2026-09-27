"use client";

import { useId, useState } from "react";
import { inputClasses } from "@/lib/utils/input-classes";

const PERCENT_PRESETS = [5, 10, 15];

/**
 * Faz 12 devamı — yüzde tipi seçiliyken %5/%10/%15 hızlı seçim butonları
 * (value alanını doldurur), serbest değer girme YİNE mümkün (zorunlu preset
 * değil, sadece kolaylık — görevin kendi talimatı). Client component olmak
 * zorunda: "value alanını doldur" davranışı, sayfa yeniden yüklenmeden bir
 * input'un değerini değiştirmek anlamına geliyor, bu da bu admin panelinin
 * genelde tercih ettiği sıfır-JS server-rendered form deseninin dışında
 * kalan tek yer. `name="valueType"`/`name="value"` gerçek form alanları
 * olarak kalıyor — bu client component'in içinde olmaları, çevreleyen
 * server-rendered `<form action={...}>`'ın normal şekilde submit etmesini
 * etkilemiyor.
 */
export function DiscountValueFields() {
  const [valueType, setValueType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const valueInputId = useId();

  return (
    <>
      <select
        name="valueType"
        value={valueType}
        onChange={(e) => setValueType(e.target.value as "percentage" | "fixed")}
        className={inputClasses}
      >
        <option value="percentage">Yüzde (%)</option>
        <option value="fixed">Sabit (TL)</option>
      </select>

      <div>
        <input
          id={valueInputId}
          name="value"
          type="number"
          min="0"
          step="0.01"
          placeholder="Değer"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClasses}
        />
        {valueType === "percentage" ? (
          <div className="mt-1.5 flex gap-1.5">
            {PERCENT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setValue(String(preset))}
                className="rounded-md border border-black/15 px-2.5 py-1 text-xs text-foreground/70 hover:border-black/30 hover:text-foreground"
              >
                %{preset}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </>
  );
}
