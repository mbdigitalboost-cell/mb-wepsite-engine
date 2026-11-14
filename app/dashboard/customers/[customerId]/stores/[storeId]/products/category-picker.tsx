"use client";

import { useState } from "react";
import { Star } from "lucide-react";

export interface CategoryPickerOption {
  id: string;
  /** "SİLAH KILIFLARI › Glock" gibi, üst kategori adıyla birlikte. */
  label: string;
}

/**
 * Faz 27 — ürün formunda çoklu kategori seçimi. Her kategori bir checkbox;
 * işaretli olanların yanında ★ (ana kategori, tek). İlk işaretlenen
 * otomatik ana olur; ana kategorinin işareti kaldırılırsa kalan ilk seçili
 * ana olur.
 *
 * Gönderilen alanlar: her seçili kategori için `categoryIds`, ana için
 * `primaryCategoryId`, ve geriye dönük uyumluluk için `categoryId` = ana
 * (productFormSchema ve category_id aynası bunu bekliyor). `form` prop'u
 * tek sayfa düzende (Faz 27 Kısım B) alanları dışarıdaki forma bağlar.
 */
export function CategoryPicker({
  options,
  initialSelectedIds,
  initialPrimaryId,
  form,
}: {
  options: CategoryPickerOption[];
  initialSelectedIds: string[];
  initialPrimaryId: string | null;
  form?: string;
}) {
  const [selected, setSelected] = useState<string[]>(initialSelectedIds);
  const [primary, setPrimary] = useState<string | null>(initialPrimaryId ?? initialSelectedIds[0] ?? null);
  const [filter, setFilter] = useState("");

  function toggle(id: string) {
    const wasSelected = selected.includes(id);
    const next = wasSelected ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    if (wasSelected && primary === id) setPrimary(next[0] ?? null);
    if (!wasSelected && !primary) setPrimary(id);
  }

  const visible = filter.trim()
    ? options.filter((o) => o.label.toLocaleLowerCase("tr").includes(filter.trim().toLocaleLowerCase("tr")))
    : options;

  return (
    <div>
      {selected.map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} form={form} />
      ))}
      <input type="hidden" name="primaryCategoryId" value={primary ?? ""} form={form} />
      <input type="hidden" name="categoryId" value={primary ?? ""} form={form} />

      {options.length > 8 ? (
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Kategori ara…"
          className="mb-2 w-full rounded-md border border-black/15 bg-white px-3 py-1.5 text-sm text-foreground focus-visible:border-[#B34C00] focus-visible:outline-none"
        />
      ) : null}

      {options.length === 0 ? (
        <p className="text-xs text-foreground/50">Henüz kategori yok.</p>
      ) : (
        <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
          {visible.map((option) => {
            const isSelected = selected.includes(option.id);
            const isPrimary = isSelected && primary === option.id;
            return (
              <li key={option.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-black/[0.03]">
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(option.id)} className="h-4 w-4 rounded border-black/20 accent-[#B34C00]" />
                  <span className="truncate">{option.label}</span>
                </label>
                {isSelected ? (
                  <button
                    type="button"
                    onClick={() => setPrimary(option.id)}
                    aria-label={isPrimary ? `${option.label} ana kategori` : `${option.label} ana kategori yap`}
                    aria-pressed={isPrimary}
                    title={isPrimary ? "Ana kategori (breadcrumb ve SEO bunu kullanır)" : "Ana kategori yap"}
                    className={`shrink-0 rounded p-0.5 ${isPrimary ? "text-[#B34C00]" : "text-foreground/30 hover:text-[#B34C00]"}`}
                  >
                    <Star size={15} fill={isPrimary ? "currentColor" : "none"} aria-hidden="true" />
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-2 text-xs text-foreground/50">
        {selected.length === 0
          ? "Kategori seçilmedi."
          : `${selected.length} kategori · ★ ana kategori (breadcrumb ve SEO)`}
      </p>
    </div>
  );
}
