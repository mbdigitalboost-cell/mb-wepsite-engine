import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { SeoForm } from "./seo-form";

export default async function SeoPage({
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
      <h1 className="text-xl font-semibold tracking-tight">SEO</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Site geneli (page_id boş) SEO ayarları. Boş bırakılan alan, mevcut statik SEO davranışını değiştirmez.
      </p>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <SeoContent customerId={customerId} />
      )}
    </div>
  );
}

async function SeoContent({ customerId }: { customerId: string }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  const { data: seo } = await connection.client
    .from("seo_settings")
    .select("*")
    .is("page_id", null)
    .limit(1)
    .maybeSingle();

  const initialValues = {
    title: seo?.title ?? "",
    description: seo?.description ?? "",
    canonical: seo?.canonical ?? "",
    ogImage: seo?.og_image ?? "",
    robotsIndex: seo?.robots_index ?? true,
    robotsFollow: seo?.robots_follow ?? true,
  };

  return (
    <div className="mt-6">
      <SeoForm customerId={customerId} seoId={seo?.id ?? null} initialValues={initialValues} />
    </div>
  );
}
