import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { resolveCustomerReturnAccess } from "@/lib/commerce/returns/access";
import { getOrderLegalAcceptance } from "@/lib/legal/order-acceptance";
import { formatTrDateTime } from "@/lib/legal/context";
import { storeBase } from "@/lib/sites/store-href";
import { storefrontDisplayClasses } from "@/lib/utils/storefront-typography";
import { LegalMarkdown } from "@/components/commerce/public/legal/legal-markdown";
import { PrintButton } from "@/components/commerce/public/legal/print-button";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "Sözleşmeniz" },
  robots: { index: false, follow: false },
};

/**
 * Faz 33 — siparişte ONAYLANAN Ön Bilgilendirme Formu ve Mesafeli Satış
 * Sözleşmesi (anlık görüntü; şablon sonradan değişse de bu metin değişmez).
 * Erişim Faz 30 ile aynı: üye oturumu siparişin sahibi ya da sipariş no +
 * telefon sorgusundan sonra verilen imzalı misafir jetonu (?t=). Sipariş
 * başka mağazanınsa bağlam hiç yüklenmez → 404. Yazdırılabilir (ETK/MSY:
 * alıcı saklayabilmeli).
 */
export default async function OrderContractPage({
  params,
  searchParams,
}: {
  params: Promise<{ storeSlug: string; orderId: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { storeSlug, orderId } = await params;
  const { t } = await searchParams;
  const access = await resolveCustomerReturnAccess(storeSlug, orderId, t ?? null);
  if (!access) notFound();
  const acceptance = await getOrderLegalAcceptance(access.storeId, orderId);
  if (!acceptance) notFound();

  const backHref = `${storeBase(storeSlug)}/siparislerim/${orderId}${access.token ? `?t=${encodeURIComponent(access.token)}` : ""}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] print:bg-white">
      <Container className="max-w-3xl py-10">
        <Link href={backHref} className="text-xs text-[#A3A3A3] hover:text-[#F5F5F5] hover:underline print:hidden">
          ← Sipariş detayına dön
        </Link>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <h1 className={`${storefrontDisplayClasses} text-2xl font-bold tracking-tight text-[#F5F5F5] print:text-black`}>
            Sipariş #{access.context.order.orderNumber} — onaylanan metinler
          </h1>
          <PrintButton />
        </div>
        <p className="mt-2 text-xs text-[#A3A3A3] print:text-black">
          Onay zamanı: {formatTrDateTime(new Date(acceptance.acceptedAt))} · Ön Bilgilendirme Formu sürüm {acceptance.preInformationVersion} · Mesafeli
          Satış Sözleşmesi sürüm {acceptance.distanceSalesVersion}
        </p>
        <p className="mt-1 text-xs text-[#A3A3A3] print:text-black">
          Ticari elektronik ileti onayı: {acceptance.marketingConsent ? "verildi" : "verilmedi"}
        </p>

        <section className="mt-8 rounded-[14px] border border-[#292929] bg-[#111111] p-5 print:border-0 print:bg-white print:p-0">
          <h2 className={`${storefrontDisplayClasses} text-lg font-bold text-[#F5F5F5] print:text-black`}>Ön Bilgilendirme Formu</h2>
          <div className="mt-4">
            <LegalMarkdown source={acceptance.preInformationSnapshot} />
          </div>
        </section>

        <section className="mt-8 rounded-[14px] border border-[#292929] bg-[#111111] p-5 print:mt-12 print:break-before-page print:border-0 print:bg-white print:p-0">
          <h2 className={`${storefrontDisplayClasses} text-lg font-bold text-[#F5F5F5] print:text-black`}>Mesafeli Satış Sözleşmesi</h2>
          <div className="mt-4">
            <LegalMarkdown source={acceptance.distanceSalesSnapshot} />
          </div>
        </section>
      </Container>
    </div>
  );
}
