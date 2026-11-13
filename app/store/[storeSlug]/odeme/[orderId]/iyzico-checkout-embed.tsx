"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Faz 22 — iyzico `checkoutFormContent`'i sayfaya gömer. iyzico bu alanda
 * `<script type="text/javascript">…</script>` döndürür; script, sayfadaki
 * `#iyzipay-checkout-form` div'ine kendi iframe'ini çizer. innerHTML ile
 * eklenen <script> tarayıcıda ÇALIŞMAZ — bu yüzden script metni çıkarılıp
 * yeni bir <script> elemanı olarak ekleniyor. Kart bilgisi iframe'de,
 * iyzico'nun kendi alanında girilir; bu bileşen hiçbir kart verisi görmez.
 *
 * Gömme bir sebeple çizilmezse (reklam engelleyici, script hatası) 8 sn
 * sonra `paymentPageUrl` (iyzico'nun kendi barındırılan sayfası) bağlantısı
 * gösterilir — devir metninin "gömme sorun çıkarırsa paymentPageUrl'e
 * yönlendir" yedeği.
 */
export function IyzicoCheckoutEmbed({ checkoutFormContent, paymentPageUrl }: { checkoutFormContent: string; paymentPageUrl: string | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scripts = [...checkoutFormContent.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => match[1] ?? "");
    const appended: HTMLScriptElement[] = [];
    for (const code of scripts) {
      if (!code.trim()) continue;
      const script = document.createElement("script");
      script.type = "text/javascript";
      script.text = code;
      document.body.appendChild(script);
      appended.push(script);
    }

    const timer = window.setTimeout(() => {
      const target = document.getElementById("iyzipay-checkout-form");
      if (!target || target.childElementCount === 0) setShowFallback(true);
    }, 8000);

    return () => {
      window.clearTimeout(timer);
      for (const script of appended) script.remove();
    };
  }, [checkoutFormContent]);

  return (
    <div ref={containerRef}>
      <div id="iyzipay-checkout-form" className="responsive" />
      {showFallback && paymentPageUrl ? (
        <p className="mt-4 text-sm text-[#A3A3A3]">
          Ödeme formu yüklenemedi.{" "}
          <a href={paymentPageUrl} className="text-[#D95F00] underline-offset-2 hover:underline">
            iyzico ödeme sayfasında devam et →
          </a>
        </p>
      ) : null}
    </div>
  );
}
