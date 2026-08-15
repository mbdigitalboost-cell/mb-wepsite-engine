import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/ui/status-badge";
import { EditWebsiteForm } from "./edit-website-form";
import { setWebsiteStatusAction } from "../actions";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ customerId: string; websiteId: string }>;
}) {
  await requireAdmin();
  const { customerId, websiteId } = await params;

  const supabase = await createSupabaseServerClient();
  const [{ data: customer }, { data: website }] = await Promise.all([
    supabase.from("customers").select("id, name").eq("id", customerId).maybeSingle(),
    supabase
      .from("websites")
      .select("id, name, slug, domain, status, template, supabase_connection_key, created_at, updated_at")
      .eq("id", websiteId)
      .eq("customer_id", customerId)
      .maybeSingle(),
  ]);

  if (!customer || !website) {
    notFound();
  }

  const nextStatus = website.status === "active" ? "inactive" : "active";
  const toggleStatus = setWebsiteStatusAction.bind(null, customerId, websiteId, nextStatus);

  return (
    <div>
      <Link
        href={`/dashboard/customers/${customerId}`}
        className="text-xs text-foreground/50 hover:text-foreground hover:underline"
      >
        ← {customer.name}
      </Link>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{website.name}</h1>
        <StatusBadge status={website.status} />
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-foreground/50">Domain</dt>
          <dd>{website.domain ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-foreground/50">Connection Key</dt>
          <dd className="font-mono">{website.supabase_connection_key}</dd>
        </div>
        <div>
          <dt className="text-foreground/50">Şablon</dt>
          <dd>{website.template ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-foreground/50">Slug</dt>
          <dd>{website.slug}</dd>
        </div>
      </dl>

      <form action={toggleStatus} className="mt-4">
        <button
          type="submit"
          className="text-sm text-foreground/60 underline-offset-2 hover:text-foreground hover:underline"
        >
          {website.status === "active" ? "Pasifleştir" : "Aktifleştir"}
        </button>
      </form>

      <div className="mt-8 border-t border-black/10 pt-6">
        <h2 className="text-sm font-semibold tracking-tight">Website Bilgilerini Düzenle</h2>
        <div className="mt-4">
          <EditWebsiteForm
            customerId={customerId}
            websiteId={websiteId}
            initialValues={{
              name: website.name,
              slug: website.slug,
              domain: website.domain,
              template: website.template,
              supabaseConnectionKey: website.supabase_connection_key,
            }}
          />
        </div>
      </div>
    </div>
  );
}
