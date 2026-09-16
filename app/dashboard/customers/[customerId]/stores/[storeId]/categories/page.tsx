import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction } from "./actions";
import { CategoryForm } from "./category-form";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
}

/**
 * FAZ 2B — Categories, flat inline CRUD (brands/page.tsx ile BİREBİR aynı
 * iskelet). Read access `requireStoreAccess` (store_viewer+) — her satırın
 * kendi Edit/Delete formu kendi requireStoreEditorAccess/
 * requireStoreAdminAccess'ini action içinde BAĞIMSIZ olarak çağırır.
 * parent_id hiyerarşisi FLAT liste üzerinde "Üst kategori: X" alt satırıyla
 * gösteriliyor — ayrı bir ağaç/indent UI'ı bu fazın kapsamında değil.
 */
export default async function StoreCategoriesPage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase
    .from("stores")
    .select("id, name")
    .eq("id", storeId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (!store) notFound();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, slug, description, image_url, parent_id, sort_order, is_active, seo_title, seo_description")
    .eq("store_id", storeId)
    .order("sort_order", { ascending: true });

  const rows = (categories ?? []) as CategoryRow[];
  const nameById = new Map(rows.map((row) => [row.id, row.name]));
  const createAction = createCategoryAction.bind(null, customerId, storeId);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Categories</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ürün kategorileri. store_editor+ ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      <div className="mt-6 rounded-lg border border-black/10 p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-foreground/60">Henüz kategori yok.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {rows.map((category) => {
              const updateAction = updateCategoryAction.bind(null, customerId, storeId, category.id);
              const deleteAction = deleteCategoryAction.bind(null, customerId, storeId, category.id);
              const parentOptions = rows
                .filter((row) => row.id !== category.id)
                .map((row) => ({ id: row.id, name: row.name }));

              return (
                <li key={category.id} className="flex flex-wrap items-start justify-between gap-2 py-3 text-sm">
                  <div className="min-w-[200px] flex-1">
                    <p className="font-medium text-foreground">
                      {category.name}{" "}
                      {!category.is_active ? <span className="text-xs text-foreground/40">(pasif)</span> : null}
                    </p>
                    <p className="text-xs text-foreground/50">/{category.slug}</p>
                    {category.parent_id ? (
                      <p className="text-xs text-foreground/50">
                        Üst kategori: {nameById.get(category.parent_id) ?? "—"}
                      </p>
                    ) : null}

                    {/* Native <details> — no client state file needed for the collapse-to-edit behavior (mirrors brands/page.tsx). */}
                    <details className="mt-1">
                      <summary className="cursor-pointer list-none text-xs text-foreground/60 underline-offset-2 hover:text-foreground hover:underline">
                        Düzenle
                      </summary>
                      <div className="mt-2 max-w-md rounded-md border border-black/10 p-3">
                        <CategoryForm
                          initialValues={{
                            name: category.name,
                            slug: category.slug,
                            description: category.description ?? "",
                            imageUrl: category.image_url ?? "",
                            parentId: category.parent_id ?? "",
                            sortOrder: category.sort_order,
                            seoTitle: category.seo_title ?? "",
                            seoDescription: category.seo_description ?? "",
                          }}
                          initialIsActive={category.is_active}
                          parentOptions={parentOptions}
                          action={updateAction}
                          submitLabel="Değişiklikleri Kaydet"
                        />
                      </div>
                    </details>
                  </div>

                  <div className="flex items-center gap-1">
                    <form action={deleteAction}>
                      <button
                        type="submit"
                        className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline"
                      >
                        Sil
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-4 border-t border-black/10 pt-4">
          <h2 className="text-sm font-semibold tracking-tight">Yeni Kategori</h2>
          <div className="mt-3">
            <CategoryForm
              parentOptions={rows.map((row) => ({ id: row.id, name: row.name }))}
              action={createAction}
              submitLabel="+ Kategori Ekle"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
