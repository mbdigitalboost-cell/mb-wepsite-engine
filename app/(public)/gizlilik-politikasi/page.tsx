import type { Metadata } from "next";
import { LegalPlaceholder } from "@/components/legal/legal-placeholder";

export const metadata: Metadata = {
  title: "Gizlilik Politikası",
  description: "Petra Mühendislik gizlilik politikası.",
  alternates: { canonical: "/gizlilik-politikasi" },
};

export default function PrivacyPolicyPage() {
  return <LegalPlaceholder eyebrow="Yasal" title="Gizlilik Politikası" />;
}
