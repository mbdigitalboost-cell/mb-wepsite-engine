"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { initialCategoryProductsFormState, type CategoryProductsFormState } from "./form-state";

export interface AddableProduct {
  id: string;
  name: string;
  sku: string | null;
  isActive: boolean;
  alreadyInCategory: boolean;
}

/**
 * Faz 27 — "Ürün Ekle" seçim paneli. Tüm ürünler durumuyla (Yayında /
 * Yayında değil) listelenir; bu kategoride olanlar "zaten ekli" ve
 * seçilemez. Action page.tsx'te bind edilip prop olarak gelir.
 */
export function AddProductsPanel({
  action,
  products,
}: {
  action: (prevState: CategoryProductsFormState, formData: FormData) => Promise<CategoryProductsFormState>;
  products: AddableProduct[];
}) {
  const [state, formAction, pending] = useActionState(action, initialCategoryProductsFormState);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  const visible = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return products;
    return products.filter((p) => p.name.toLocaleLowerCase("tr").includes(q) || (p.sku ?? "").toLocaleLowerCase("tr").includes(q));
  }, [products, query]);

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#B34C00] px-4 text-sm font-semibold text-white hover:bg-[#8F3D00]"
        >
          <Plus size={16} aria-hidden="true" />
          Ürün Ekle
        </button>
        {state.success ? <p className="mt-2 text-xs text-green-700">{state.success}</p> : null}
      </div>
    );
  }

  return (
    <form
      action={async (formData) => {
        await formAction(formData);
        setSelected([]);
      }}
      className="rounded-lg border border-black/10 bg-white p-4"
    >
      {selected.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-foreground">Kategoriye ürün ekle</p>
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-foreground/50 hover:text-foreground">
          Kapat
        </button>
      </div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ürün adı ya da SKU ara…"
        className="mt-3 w-full rounded-md border border-black/15 px-3 py-2 text-sm text-foreground focus-visible:border-[#B34C00] focus-visible:outline-none"
      />
      <ul className="mt-3 max-h-80 divide-y divide-black/5 overflow-y-auto rounded-md border border-black/10">
        {visible.length === 0 ? <li className="p-3 text-sm text-foreground/50">Eşleşen ürün yok.</li> : null}
        {visible.map((product) => {
          const checked = selected.includes(product.id);
          return (
            <li key={product.id}>
              <label className={`flex items-center gap-3 px-3 py-2 text-sm ${product.alreadyInCategory ? "opacity-60" : "cursor-pointer hover:bg-black/[0.03]"}`}>
                <input
                  type="checkbox"
                  disabled={product.alreadyInCategory}
                  checked={product.alreadyInCategory || checked}
                  onChange={() => setSelected((prev) => (prev.includes(product.id) ? prev.filter((id) => id !== product.id) : [...prev, product.id]))}
                  className="h-4 w-4 rounded border-black/20 accent-[#B34C00]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-foreground">{product.name}</span>
                  {product.sku ? <span className="block font-mono text-[11px] text-foreground/50">{product.sku}</span> : null}
                </span>
                {product.alreadyInCategory ? (
                  <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] text-foreground/60">zaten ekli</span>
                ) : (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] ${product.isActive ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                  >
                    {product.isActive ? "Yayında" : "Yayında değil"}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      {state.error ? (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="mt-2 text-xs text-green-700">{state.success}</p> : null}
      <button
        type="submit"
        disabled={pending || selected.length === 0}
        className="mt-3 inline-flex h-9 items-center rounded-md bg-[#B34C00] px-4 text-sm font-semibold text-white hover:bg-[#8F3D00] disabled:opacity-50"
      >
        {pending ? "Ekleniyor…" : `${selected.length} ürünü ekle`}
      </button>
    </form>
  );
}
