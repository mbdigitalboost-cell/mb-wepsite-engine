"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inputClasses } from "@/lib/utils/input-classes";

/**
 * Admin Panel İşlevsellik devir metni, Kısım C — "debounce'lu client
 * input + server-side filtre". Bu alan hâlâ aynı <form method="get">
 * içindeki `name="q"` input'u (Enter/"Filtrele" tıklaması hâlâ aynen
 * çalışır, native form submit hiç bozulmadı) — ayrıca BAĞIMSIZ olarak,
 * yazma durdukta 400ms sonra kendi başına `router.push` ile sadece `q`
 * parametresini günceller. Diğer filtreler (kategori/marka/durum/stok/
 * sıralama) bu push'a dahil DEĞİL — o anki URL'nin kendi searchParams'ı
 * neyse onu KORUYARAK üstüne yazıyor, kullanıcı yazarken uygulanmış
 * filtrelerini kaybetmiyor.
 */
export function ProductSearchInput({ basePath, initialValue }: { basePath: string; initialValue: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (value === initialValue) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      const trimmed = value.trim();
      if (trimmed) params.set("q", trimmed);
      else params.delete("q");
      params.delete("page");
      router.push(`${basePath}${params.toString() ? `?${params.toString()}` : ""}`);
    }, 400);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- yalnızca `value` değiştiğinde yeniden debounce edilmeli, router/searchParams referansları her render'da yeni nesneler.
  }, [value]);

  return (
    <input
      id="q"
      name="q"
      type="text"
      value={value}
      onChange={(event) => setValue(event.target.value)}
      className={inputClasses}
    />
  );
}
