import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal/legal-placeholder";

export const metadata: Metadata = {
  title: "Çerez Politikası",
  description: "Petra Mühendislik çerez politikası.",
  alternates: { canonical: "/cerez-politikasi" },
};

export default function CookiePolicyPage() {
  return <LegalPlaceholder eyebrow="Yasal" title="Çerez Politikası" />;
}
