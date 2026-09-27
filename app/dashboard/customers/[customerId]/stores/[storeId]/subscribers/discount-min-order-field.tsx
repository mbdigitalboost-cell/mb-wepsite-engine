"use client";

import { useState } from "react";
import { inputClasses } from "@/lib/utils/input-classes";

const MIN_ORDER_PRESETS = [1000, 5000];

/**
 * Faz 12 devamı — "1000 TL üzeri"/"5000 TL üzeri" hızlı seçim butonları,
 * DiscountValueFields'ın %5/%10/%15 butonlarıyla aynı gerekçe/desen. Boş
 * bırakılırsa (ne buton tıklanır ne serbest değer girilir) actions.ts
 * bunu "şart yok" olarak yorumluyor (minOrderAmountRaw boş string).
 */
export function DiscountMinOrderField() {
  const [value, setValue] = useState("");

  return (
    <div>
      <input
        name="minOrderAmount"
        type="number"
        min="0"
        step="0.01"
        placeholder="Minimum sepet tutarı (opsiyonel)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={inputClasses}
      />
      <div className="mt-1.5 flex gap-1.5">
        {MIN_ORDER_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setValue(String(preset))}
            className="rounded-md border border-black/15 px-2.5 py-1 text-xs text-foreground/70 hover:border-black/30 hover:text-foreground"
          >
            {preset.toLocaleString("tr-TR")} TL üzeri
          </button>
        ))}
        {value ? (
          <button
            type="button"
            onClick={() => setValue("")}
            className="rounded-md border border-black/15 px-2.5 py-1 text-xs text-foreground/50 hover:border-black/30 hover:text-foreground"
          >
            Temizle
          </button>
        ) : null}
      </div>
    </div>
  );
}
