import type { Metadata } from "next";
import { Solutions } from "@/components/sections/solutions";
import { petraSolutions } from "@/lib/data/petra/solutions";
import { getSolutions } from "@/lib/cms/adapters";
import { isCmsRow, mapSolutionRows } from "@/lib/cms/petra/mappers";
import type { SolutionRow } from "@/lib/cms/customer-types";

const PETRA_CONNECTION_KEY = "PETRA";

// Faz 4G — güvenlik ağı: bkz. app/(public)/page.tsx'in aynı satırındaki
// yorum. Admin'deki anlık webhook birincil mekanizma; bu sadece arıza
// durumunda devreye giren bir üst sınır.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Çözümler",
  description:
    "Split, multi-split, profesyonel klima, VRF, ısı pompası ve sıcak su sistemleri — ihtiyacınıza uygun iklimlendirme çözümü.",
  alternates: { canonical: "/cozumler" },
};

// Solutions renders its own heading ("İhtiyacınıza Uygun İklimlendirme
// Çözümleri") — no separate PageHeader here to avoid a duplicate title.
// headingLevel="h1" because it's this page's single main heading (on the
// homepage, where Hero's h1 already exists, Solutions defaults to h2).
//
// Phase 9.2: CMS-first, static petraSolutions as fallback — same pattern
// as app/(public)/page.tsx (Phase 6 §20).
export default async function SolutionsPage() {
  const solutionsResult = await getSolutions(PETRA_CONNECTION_KEY, petraSolutions);
  const solutions = isCmsRow((solutionsResult as unknown[])[0])
    ? mapSolutionRows(solutionsResult as SolutionRow[])
    : petraSolutions;

  return <Solutions headingLevel="h1" solutions={solutions} />;
}
