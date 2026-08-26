import { notFound } from "next/navigation";
import Link from "next/link";
import { requireStoreAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  toggleHomepageSectionActiveAction,
  deleteHomepageSectionAction,
  moveHomepageSectionAction,
} from "./actions";
import { AddSectionForm } from "./add-section-form";
import { EditSectionForm } from "./edit-section-form";

export default async function StoreHomepagePage({
  params,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
}) {
  const { customerId, storeId } = await params;
  await requireStoreAccess(storeId);

  const supabase = await createSupabaseServerClient();
  const { data: store } = await supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle();
  if (!store) notFound();

  const [{ data: sectionTypes }, { data: sections }] = await Promise.all([
    supabase.from("homepage_section_types").select("key, label").eq("is_active", true).order("label"),
    supabase
      .from("store_homepage_sections")
      .select("id, section_type_key, internal_label, title, description, image_url, link_url, config, is_active, sort_order")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true }),
  ]);

  const sectionTypeLabelByKey = new Map((sectionTypes ?? []).map((type) => [type.key, type.label]));

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}/stores/${storeId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {store.name}
      </Link>

      <h1 className="mt-2 text-xl font-semibold tracking-tight">Homepage Builder</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Ana sayfa bölümleri. store_editor+ ekleyip düzenleyebilir; kalıcı silme store_admin+&apos;e ayrılmış.
      </p>

      {!sections || sections.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/60">Henüz bölüm yok.</p>
      ) : (
        <ul className="mt-6 divide-y divide-black/10 rounded-lg border border-black/10">
          {sections.map((section, index) => {
            const config = (section.config as Record<string, string>) ?? {};
            const moveUp = moveHomepageSectionAction.bind(null, customerId, storeId, section.id, "up");
            const moveDown = moveHomepageSectionAction.bind(null, customerId, storeId, section.id, "down");
            const toggleActive = toggleHomepageSectionActiveAction.bind(null, customerId, storeId, section.id, !section.is_active);
            const deleteSection = deleteHomepageSectionAction.bind(null, customerId, storeId, section.id);

            return (
              <li key={section.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
                <div className="min-w-[220px] flex-1">
                  <p className="font-medium text-foreground">
                    {sectionTypeLabelByKey.get(section.section_type_key) ?? section.section_type_key}
                    {section.internal_label ? ` — ${section.internal_label}` : ""}
                    {!section.is_active ? <span className="ml-2 text-xs text-foreground/40">(pasif)</span> : null}
                  </p>
                  {section.title ? <p className="text-xs text-foreground/60">{section.title}</p> : null}
                  <div className="mt-1">
                    <EditSectionForm
                      customerId={customerId}
                      storeId={storeId}
                      section={{
                        id: section.id,
                        sectionTypeKey: section.section_type_key,
                        internalLabel: section.internal_label ?? "",
                        title: section.title ?? "",
                        description: section.description ?? "",
                        imageUrl: section.image_url ?? "",
                        linkUrl: section.link_url ?? "",
                        isActive: section.is_active,
                        secondaryCtaLabel: config.secondaryCtaLabel ?? "",
                        secondaryCtaHref: config.secondaryCtaHref ?? "",
                      }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <form action={moveUp}>
                    <button type="submit" disabled={index === 0} className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-brand-accent/5 disabled:opacity-30" aria-label="Yukarı taşı">↑</button>
                  </form>
                  <form action={moveDown}>
                    <button type="submit" disabled={index === sections.length - 1} className="rounded px-2 py-1 text-xs text-foreground/60 hover:bg-brand-accent/5 disabled:opacity-30" aria-label="Aşağı taşı">↓</button>
                  </form>
                  <form action={toggleActive}>
                    <button type="submit" className="rounded px-2 py-1 text-xs text-foreground/60 underline-offset-2 hover:underline">
                      {section.is_active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </form>
                  <form action={deleteSection}>
                    <button type="submit" className="rounded px-2 py-1 text-xs text-red-600 underline-offset-2 hover:underline">
                      Sil
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <AddSectionForm customerId={customerId} storeId={storeId} sectionTypes={sectionTypes ?? []} />
    </div>
  );
}
