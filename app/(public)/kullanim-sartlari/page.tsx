import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal/legal-placeholder";

export const metadata: Metadata = {
  title: "Kullanım Şartları",
  description: "Petra Mühendislik web sitesi kullanım şartları.",
  alternates: { canonical: "/kullanim-sartlari" },
};

export default function TermsPage() {
  return <LegalPlaceholder eyebrow="Yasal" title="Kullanım Şartları" />;
}
