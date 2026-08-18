import Link from "next/link";
import { requireCustomerAccess } from "@/lib/auth/require-customer-access";
import { CustomerCmsNav } from "@/components/navigation/customer-cms-nav";
import { CONTENT_TYPES } from "@/lib/cms/dashboard/content-types";

export default async function ContentHubPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  await requireCustomerAccess(customerId);

  const links = [
    { href: `/dashboard/customers/${customerId}/content/hero`, label: "Hero" },
    ...Object.values(CONTENT_TYPES).map((config) => ({
      href: `/dashboard/customers/${customerId}/content/${config.key}`,
      label: config.label,
    })),
  ];

  return (
    <div>
      <CustomerCmsNav customerId={customerId} />
      <h1 className="text-xl font-semibold tracking-tight">İçerik</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Public sitede görünen içerik türleri. Her biri kendi taslak/yayın/arşiv döngüsüne sahiptir.
      </p>

      <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="block rounded-lg border border-black/10 px-4 py-3 text-sm font-medium hover:bg-brand-accent/5"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
