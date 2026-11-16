import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/commerce/public/store";
import { getPublishedLegalDocuments, getSellerIdentity } from "@/lib/legal/store-legal";
import { LEGAL_PAGE_LINKS } from "@/lib/legal/links";
import { storeBase } from "@/lib/sites/store-href";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { Container } from "@/components/ui/container";

/**
 * Faz 33 — mağazanın kendi İletişim ve satıcı kimliği sayfası (6563 ETK m.3
 * tanıtıcı bilgiler; MSY m.5/1-b,c). Faz 28'de kökteki Petra /iletisim'i
 * mağaza sitesinde kapatılmıştı; bu sayfa mağazanın kendisidir (temiz
 * adres /iletisim → /store/<slug>/iletisim). Satıcı kaydı yoksa 404 —
 * eksik bilgiyle "yarım" kimlik sayfası gösterilmez. Boş alanın satırı yok.
 */
export async function generateMetadata({ params }: { params: Promise<{ storeSlug: string }> }): Promise<Metadata> {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  return store ? { title: { absolute: `İletişim | ${store.name}` } } : {};
}

export default async function StoreContactPage({ params }: { params: Promise<{ storeSlug: string }> }) {
  const { storeSlug } = await params;
  const store = await getStoreBySlug(storeSlug);
  if (!store) notFound();
  const [seller, documents] = await Promise.all([getSellerIdentity(store.id), getPublishedLegalDocuments(store.id)]);
  if (!seller) notFound();

  const rows: Array<[string, string | null, string | null]> = [
    ["Ticari unvan", seller.legalName, null],
    ["İşletme sahibi / yetkili", seller.ownerName, null],
    ["Adres", seller.address, null],
    ["Telefon / WhatsApp", seller.phone, seller.phone ? `tel:${seller.phone.replace(/[^\d+]/g, "")}` : null],
    ["E-posta", seller.email, seller.email ? `mailto:${seller.email}` : null],
    ["KEP adresi", seller.kepAddress, null],
    ["Vergi dairesi", seller.taxOffice, null],
    ["Vergi kimlik no", seller.taxNumber, null],
    ["MERSİS no", seller.mersisNumber, null],
    ["ETBİS kaydı", seller.etbisInfo, seller.etbisUrl],
  ];
  const legalLinks = LEGAL_PAGE_LINKS.filter((link) => !link.kind || documents.has(link.kind));

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Container className="max-w-3xl py-10">
        <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5]`}>İletişim</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">Sipariş, iade ve diğer tüm sorularınız için bize aşağıdaki bilgilerden ulaşabilirsiniz.</p>

        <dl className="mt-6 divide-y divide-[#292929] rounded-[14px] border border-[#292929] bg-[#171717] text-sm">
          {rows
            .filter((row): row is [string, string, string | null] => Boolean(row[1] && row[1].trim()))
            .map(([label, value, href]) => (
              <div key={label} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:gap-4">
                <dt className="w-48 shrink-0 text-[#A3A3A3]">{label}</dt>
                <dd className="text-[#F5F5F5]">
                  {href ? (
                    <a href={href} className="text-[#D95F00] underline-offset-2 hover:underline" rel="noopener noreferrer">
                      {value}
                    </a>
                  ) : (
                    value
                  )}
                </dd>
              </div>
            ))}
        </dl>

        {legalLinks.length > 0 ? (
          <div className="mt-8">
            <h2 className={`${storefrontDisplayClasses} text-sm font-semibold text-[#F5F5F5]`}>Yasal metinler</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {legalLinks.map((link) => (
                <li key={link.path}>
                  <Link href={`${storeBase(storeSlug)}${link.path}`} className="text-[#D95F00] underline-offset-2 hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Container>
    </div>
  );
}
