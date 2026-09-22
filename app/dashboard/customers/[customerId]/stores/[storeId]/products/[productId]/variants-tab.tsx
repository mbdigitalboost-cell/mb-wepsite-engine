import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  createOptionGroupAction,
  updateOptionGroupAction,
  deleteOptionGroupAction,
  createOptionValueAction,
  deleteOptionValueAction,
  createProductVariantAction,
  updateProductVariantAction,
  deleteProductVariantAction,
  setVariantOptionValuesAction,
  removeVariantOptionValueAction,
} from "./variants/actions";
import { OptionGroupForm } from "./variants/option-group-form";
import { OptionValueForm } from "./variants/option-value-form";
import { ProductVariantForm } from "./variants/variant-form";
import { VariantOptionAssignmentForm } from "./variants/variant-option-assignment-form";
import { DeleteOptionGroupButton } from "./variants/delete-option-group-button";
import { DeleteVariantButton } from "./variants/delete-variant-button";

interface OptionGroupRow {
  id: string;
  name: string;
  sort_order: number;
}

interface OptionValueRow {
  id: string;
  option_group_id: string;
  value: string;
  sort_order: number;
}

interface ProductVariantRow {
  id: string;
  sku: string | null;
  name: string;
  price: number | null;
  compare_at_price: number | null;
  stock: number;
  is_active: boolean;
  sort_order: number;
}

/**
 * Moved verbatim from variants/page.tsx (single-screen tabbed product
 * form unification) into the product page's "Varyantlar" tab — same
 * queries, same actions, same form components, no logic changes. Only
 * the standalone route's own chrome (back link, `<h1>Varyantlar</h1>`,
 * the notFound() product lookup) was dropped, per the same reasoning as
 * images-tab.tsx.
 */
export async function VariantsTab({
  customerId,
  storeId,
  productId,
}: {
  customerId: string;
  storeId: string;
  productId: string;
}) {
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();

  const [{ data: optionGroupsData }, { data: variantsData }] = await Promise.all([
    supabase
      .from("option_groups")
      .select("id, name, sort_order")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("product_variants")
      .select("id, sku, name, price, compare_at_price, stock, is_active, sort_order")
      .eq("product_id", productId)
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
  ]);

  const optionGroups = (optionGroupsData ?? []) as OptionGroupRow[];
  const variants = (variantsData ?? []) as ProductVariantRow[];

  const groupIds = optionGroups.map((g) => g.id);
  const { data: optionValuesData } =
    groupIds.length > 0
      ? await supabase
          .from("option_values")
          .select("id, option_group_id, value, sort_order")
          .in("option_group_id", groupIds)
          .eq("store_id", storeId)
          .order("sort_order", { ascending: true })
      : { data: [] as OptionValueRow[] };
  const optionValues = (optionValuesData ?? []) as OptionValueRow[];

  const variantIds = variants.map((v) => v.id);
  const { data: assignmentsData } =
    variantIds.length > 0
      ? await supabase
          .from("variant_option_values")
          .select("variant_id, option_value_id")
          .in("variant_id", variantIds)
          .eq("store_id", storeId)
      : { data: [] as { variant_id: string; option_value_id: string }[] };
  const assignments = assignmentsData ?? [];

  const valueById = new Map(optionValues.map((v) => [v.id, v]));
  const groupNameById = new Map(optionGroups.map((g) => [g.id, g.name]));
  const groupsWithValues = optionGroups.map((group) => ({
    ...group,
    values: optionValues.filter((v) => v.option_group_id === group.id),
  }));

  const valueIdsByVariant = new Map<string, string[]>();
  for (const a of assignments) {
    const list = valueIdsByVariant.get(a.variant_id) ?? [];
    list.push(a.option_value_id);
    valueIdsByVariant.set(a.variant_id, list);
  }

  return (
    <div>
      <p className="text-sm text-foreground/60">
        Seçenek grupları (Renk, Beden gibi) ve bu gruplardan oluşan satılabilir varyantlar. store_editor+ ekleyip
        düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      {/* ================= OPTION GROUPS ================= */}
      <section className="mt-6">
        <h2 className="text-sm font-semibold tracking-tight">Seçenek Grupları</h2>

        {groupsWithValues.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">Henüz seçenek grubu eklenmemiş.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {groupsWithValues.map((group) => {
              const updateGroupAction = updateOptionGroupAction.bind(null, customerId, storeId, productId, group.id);
              const deleteGroupAction = deleteOptionGroupAction.bind(null, customerId, storeId, productId, group.id);
              const createValueAction = createOptionValueAction.bind(null, customerId, storeId, productId);

              return (
                <div key={group.id} className="rounded-lg border border-black/10 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-medium text-foreground">{group.name}</h3>
                    <DeleteOptionGroupButton groupName={group.name} action={deleteGroupAction} />
                  </div>

                  <details className="mt-1">
                    <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                      Düzenle
                    </summary>
                    <div className="mt-2 max-w-sm">
                      <OptionGroupForm
                        initialValues={{ name: group.name, sortOrder: group.sort_order }}
                        action={updateGroupAction}
                        submitLabel="Kaydet"
                      />
                    </div>
                  </details>

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {group.values.length === 0 ? (
                      <li className="text-xs text-foreground/50">Henüz değer yok.</li>
                    ) : (
                      group.values.map((v) => {
                        const deleteValueAction = deleteOptionValueAction.bind(
                          null,
                          customerId,
                          storeId,
                          productId,
                          group.id,
                          v.id,
                        );
                        return (
                          <li
                            key={v.id}
                            className="flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-1 text-xs text-foreground/80"
                          >
                            {v.value}
                            <form action={deleteValueAction}>
                              <button
                                type="submit"
                                aria-label={`${v.value} değerini sil`}
                                className="text-foreground/40 hover:text-red-600"
                              >
                                ×
                              </button>
                            </form>
                          </li>
                        );
                      })
                    )}
                  </ul>

                  <div className="mt-3">
                    <OptionValueForm optionGroupId={group.id} action={createValueAction} submitLabel="+ Değer" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 rounded-lg border border-dashed border-black/15 p-4">
          <h3 className="text-sm font-semibold tracking-tight">+ Seçenek Grubu</h3>
          <div className="mt-3 max-w-sm">
            <OptionGroupForm
              action={createOptionGroupAction.bind(null, customerId, storeId, productId)}
              submitLabel="+ Seçenek Grubu"
            />
          </div>
        </div>
      </section>

      {/* ================= VARIANTS ================= */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold tracking-tight">Varyantlar</h2>

        {variants.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/60">Henüz varyant oluşturulmamış.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {variants.map((variant) => {
              const valueIds = valueIdsByVariant.get(variant.id) ?? [];
              const selectedValueIdByGroupId: Record<string, string> = {};
              for (const vid of valueIds) {
                const val = valueById.get(vid);
                if (val) selectedValueIdByGroupId[val.option_group_id] = vid;
              }

              const updateVariantAction = updateProductVariantAction.bind(
                null,
                customerId,
                storeId,
                productId,
                variant.id,
              );
              const deleteVariantAction = deleteProductVariantAction.bind(
                null,
                customerId,
                storeId,
                productId,
                variant.id,
              );
              const setOptionValuesAction = setVariantOptionValuesAction.bind(
                null,
                customerId,
                storeId,
                productId,
                variant.id,
              );

              return (
                <li key={variant.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">
                        {variant.name}
                        {variant.sku ? <span className="ml-2 text-xs text-foreground/50">SKU: {variant.sku}</span> : null}
                      </p>
                      {valueIds.length > 0 ? (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {valueIds.map((vid) => {
                            const val = valueById.get(vid);
                            if (!val) return null;
                            const removeAction = removeVariantOptionValueAction.bind(
                              null,
                              customerId,
                              storeId,
                              productId,
                              variant.id,
                              vid,
                            );
                            return (
                              <div
                                key={vid}
                                className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-2.5 py-0.5 text-xs text-foreground/70"
                              >
                                {groupNameById.get(val.option_group_id)}: {val.value}
                                <form action={removeAction}>
                                  <button type="submit" aria-label="Kaldır" className="text-foreground/40 hover:text-red-600">
                                    ×
                                  </button>
                                </form>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 whitespace-nowrap text-xs text-foreground/60">
                      <span>
                        {variant.price !== null
                          ? Number(variant.price).toLocaleString("tr-TR", { style: "currency", currency: "TRY" })
                          : "Ürün fiyatı"}
                      </span>
                      <span>Stok: {variant.stock}</span>
                      <Badge variant={variant.is_active ? "solid" : "outline"}>
                        {variant.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </div>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                      Düzenle
                    </summary>
                    <div className="mt-3 space-y-5 rounded-md border border-black/10 p-3">
                      <ProductVariantForm
                        initialValues={{
                          sku: variant.sku ?? "",
                          name: variant.name,
                          price: variant.price === null ? "" : Number(variant.price),
                          compareAtPrice: variant.compare_at_price === null ? "" : Number(variant.compare_at_price),
                          stock: variant.stock,
                          sortOrder: variant.sort_order,
                        }}
                        initialIsActive={variant.is_active}
                        action={updateVariantAction}
                        submitLabel="Değişiklikleri Kaydet"
                      />

                      <VariantOptionAssignmentForm
                        optionGroups={groupsWithValues.map((g) => ({ id: g.id, name: g.name, values: g.values }))}
                        selectedValueIdByGroupId={selectedValueIdByGroupId}
                        action={setOptionValuesAction}
                      />

                      <DeleteVariantButton variantName={variant.name} action={deleteVariantAction} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-black/10 pt-4">
          <h3 className="text-sm font-semibold tracking-tight">+ Varyant</h3>
          <div className="mt-3">
            <ProductVariantForm
              action={createProductVariantAction.bind(null, customerId, storeId, productId)}
              submitLabel="+ Varyant Ekle"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
