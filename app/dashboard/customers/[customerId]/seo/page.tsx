import Link from "next/link";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { loadCustomerConnection } from "@/lib/cms/dashboard/require-customer-connection";
import { CmsUnavailableNotice } from "@/components/cms/cms-unavailable-notice";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { STATIC_SEO_ROUTES, isStaticSeoRouteKey } from "@/lib/seo/route-registry";
import { cn } from "@/lib/utils/cn";
import { SeoForm } from "./seo-form";

export default async function SeoPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<{ route?: string }>;
}) {
  const { customerId } = await params;
  await requireCustomerAccess(customerId);
  const connection = await loadCustomerConnection(customerId);
  const { route } = await searchParams;
  // Faz 6F-4A-3.2: bilinmeyen/geçersiz bir `?route=` değeri (elle
  // yazılmış bozuk bir URL gibi) sessizce site-wide'a düşer — hatalı bir
  // route_key ile sorgu yapıp "kayıt yok" göstermek yerine, kullanıcı her
  // zaman geçerli bir sekmede kalır.
  const routeKey = isStaticSeoRouteKey(route) ? (route as string) : null;

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">SEO</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Boş bırakılan alan, mevcut statik SEO davranışını değiştirmez.
      </p>

      <nav aria-label="SEO kapsamı" className="mt-4 flex flex-wrap gap-1 border-b border-black/10 pb-3">
        <SeoModeTab customerId={customerId} label="Site Geneli" isActive={routeKey === null} />
        {STATIC_SEO_ROUTES.map((r) => (
          <SeoModeTab key={r.key} customerId={customerId} label={r.label} routeKey={r.key} isActive={routeKey === r.key} />
        ))}
      </nav>

      {!connection ? (
        <div className="mt-6">
          <CmsUnavailableNotice />
        </div>
      ) : (
        <SeoContent customerId={customerId} routeKey={routeKey} />
      )}
    </div>
  );
}

function SeoModeTab({
  customerId,
  label,
  routeKey,
  isActive,
}: {
  customerId: string;
  label: string;
  routeKey?: string;
  isActive: boolean;
}) {
  const href = routeKey
    ? `/dashboard/customers/${customerId}/seo?route=${routeKey}`
    : `/dashboard/customers/${customerId}/seo`;
  return (
    <Link
      href={href}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        isActive ? "bg-brand-accent/10 text-brand-accent" : "text-foreground/60 hover:bg-black/5 hover:text-foreground",
      )}
    >
      {label}
    </Link>
  );
}

async function SeoContent({ customerId, routeKey }: { customerId: string; routeKey: string | null }) {
  const connection = await loadCustomerConnection(customerId);
  if (!connection) return null;

  let query = connection.client.from("seo_settings").select("*").limit(1);
  query = routeKey ? query.eq("route_key", routeKey) : query.is("route_key", null);
  const { data: seo } = await query.maybeSingle();

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
      <SeoForm customerId={customerId} seoId={seo?.id ?? null} routeKey={routeKey} initialValues={initialValues} />
    </div>
  );
}
