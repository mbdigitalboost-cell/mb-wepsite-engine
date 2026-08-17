import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal/legal-placeholder";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni",
  description: "Petra Mühendislik KVKK aydınlatma metni.",
  alternates: { canonical: "/kvkk-aydinlatma-metni" },
};

export default function KvkkPage() {
  return <LegalPlaceholder eyebrow="Yasal" title="KVKK Aydınlatma Metni" />;
}
