import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { MediaForm } from "./media-form";
import { deleteMediaAssetAction } from "./actions";

const IMAGE_COLUMN_TABLES = [
  { table: "site_settings" as const, columns: ["logo", "logo_white", "favicon"] },
  { table: "hero_sections" as const, columns: ["background_image"] },
  { table: "services" as const, columns: ["image"] },
  { table: "solutions" as const, columns: ["image"] },
  { table: "projects" as const, columns: ["image"] },
  { table: "campaigns" as const, columns: ["image"] },
  { table: "testimonials" as const, columns: ["image"] },
];

export default async function MediaLibraryPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">Medya Kütüphanesi</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Klasör yapısı: brand/, hero/, solutions/, services/, projects/, campaigns/, banners/ — Petra Asset Manifest ile aynı isimlendirme.
      </p>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <MediaContent customerId={customerId} />
      )}
    </div>
  );
}

async function MediaContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data: assets, error } = await connection.client
    .from("media_assets")
    .select("*")
    .order("created_at", { ascending: false });

  // Best-effort "kullanım durumu" — collects every image/logo/background
  // URL referenced elsewhere in this project so each asset can show
  // "Kullanımda" vs "Kullanılmıyor". Never blocks the page if any of
  // these lookups fails.
  const usedUrls = new Set<string>();
  for (const { table, columns } of IMAGE_COLUMN_TABLES) {
    const { data: rows } = await connection.client.from(table).select(columns.join(","));
    for (const row of rows ?? []) {
      for (const column of columns) {
        // `columns.join(",")` is a runtime-built select string, so
        // postgrest-js's select-query-parser can't statically type the
        // result (it types it as a query-error placeholder). We only ever
        // read known string columns off it defensively below.
        const value = (row as unknown as Record<string, unknown>)[column];
        if (typeof value === "string" && value) usedUrls.add(value);
      }
    }
  }

  return (
    <div className="mt-6 space-y-8">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Yeni Kayıt</h2>
        <div className="mt-4">
          <MediaForm customerId={customerId} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold tracking-tight">Dosyalar</h2>
        {error ? (
          <p className="mt-3 text-sm text-red-600">Yüklenemedi: {error.message}</p>
        ) : !assets || assets.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">Henüz kayıtlı medya yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/10 rounded-lg border border-black/10">
            {assets.map((asset) => {
              const inUse = usedUrls.has(asset.file_url);
              const deleteAction = deleteMediaAssetAction.bind(null, customerId, asset.id);
              return (
                <li key={asset.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{asset.file_name}</p>
                    <p className="text-xs text-foreground/50">{asset.storage_path}</p>
                    {asset.width && asset.height ? (
                      <p className="text-xs text-foreground/40">
                        {asset.width}×{asset.height}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={inUse ? "text-xs text-green-700" : "text-xs text-foreground/40"}>
                      {inUse ? "Kullanımda" : "Kullanılmıyor"}
                    </span>
                    <form action={deleteAction}>
                      <button type="submit" className="text-xs text-red-600 underline-offset-2 hover:underline">
                        Sil
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
