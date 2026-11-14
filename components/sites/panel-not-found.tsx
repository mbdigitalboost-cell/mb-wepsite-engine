import Link from "next/link";

/** Faz 28 — panel (ve kaydı olmayan kurumsal siteler) için nötr 404; hiçbir müşteri markası taşımaz. */
export function PanelNotFound() {
  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-[#FAFAFA] px-4">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#71717A] uppercase">Hata 404</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[#17171A]">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-[#52525B]">Aradığınız sayfa yok ya da taşınmış.</p>
        <Link href="/login" className="mt-6 inline-flex h-10 items-center rounded-lg bg-[#17171A] px-5 text-sm font-semibold text-white">
          Panele git
        </Link>
      </div>
    </main>
  );
}
