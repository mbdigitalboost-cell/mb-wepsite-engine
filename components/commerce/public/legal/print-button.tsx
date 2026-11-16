"use client";

import { Printer } from "lucide-react";

/** Faz 33 — yasal metni yazdır / PDF olarak kaydet (tarayıcının yazdırma penceresi). */
export function PrintButton({ label = "Yazdır / PDF kaydet" }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full border border-[#3A3A3A] px-3 py-1.5 text-xs text-[#C9C9C9] hover:border-[#D95F00] hover:text-[#F5F5F5] print:hidden"
    >
      <Printer size={14} aria-hidden="true" />
      {label}
    </button>
  );
}
