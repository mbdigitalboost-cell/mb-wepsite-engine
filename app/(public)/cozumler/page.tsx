import type { Metadata } from "next";
import { Solutions } from "@/components/sections/solutions";

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
export default function SolutionsPage() {
  return <Solutions headingLevel="h1" />;
}
