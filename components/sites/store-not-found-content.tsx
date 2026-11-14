import Link from "next/link";

/**
 * Faz 28 — mağaza markalı 404 içeriği. İki yerde kullanılır:
 * app/store/[storeSlug]/not-found.tsx (mağaza layout'u içinde, header/
 * footer ile) ve app/not-found.tsx'in "store" dalı (yedek; normalde proxy
 * mağaza sitesinde oraya hiç düşürmez).
 */
export function StoreNotFoundContent({ storeBasePath }: { storeBasePath: string }) {
  return (
    <main className="flex min-h-[60vh] flex-1 items-center bg-[#0A0A0A]">
      <div className="mx-auto w-full max-w-xl px-4 py-20 text-center">
        <p className="font-store-mono text-xs font-semibold tracking-[0.2em] text-[#D95F00] uppercase">Hata 404</p>
        <h1 className="font-store-display mt-4 text-3xl font-bold tracking-tight text-[#F5F5F5] sm:text-4xl">Aradığınız sayfa bulunamadı</h1>
        <p className="mt-4 text-sm text-[#A3A3A3]">Bağlantı hatalı olabilir ya da sayfa kaldırılmış olabilir.</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={storeBasePath}
            className="inline-flex h-11 items-center rounded-lg bg-[#D95F00] px-6 text-sm font-semibold text-white hover:bg-[#B34C00]"
          >
            Ana sayfaya dön
          </Link>
          <Link
            href={`${storeBasePath}/kategoriler`}
            className="inline-flex h-11 items-center rounded-lg border border-[#292929] px-6 text-sm font-semibold text-[#F5F5F5] hover:border-[#D95F00]"
          >
            Tüm kategoriler
          </Link>
        </div>
      </div>
    </main>
  );
}
