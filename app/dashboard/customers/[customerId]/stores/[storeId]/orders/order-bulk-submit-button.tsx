"use client";

import { useFormStatus } from "react-dom";

interface OrderBulkSubmitButtonProps {
  label: string;
  pendingLabel: string;
  variant?: "outline" | "primary";
  formAction?: (formData: FormData) => Promise<void>;
}

/**
 * "Uygula Butonu Çalışmıyor Gibi Görünüyor" ACİL devir metni — gerçek kök
 * neden: hiçbir toplu aksiyon butonu submit sırasında disabled/loading
 * olmuyordu (useFormStatus hiç kullanılmıyordu) — kullanıcı "hiçbir şey
 * olmadı" diye defalarca tıkladı, her tıklama GERÇEK bir isteğe dönüştü
 * (Vercel function loglarında ~40 saniyede 8 ayrı POST olarak görüldü,
 * Supabase'de de GERÇEK bir toplu UPDATE'in çalıştığı doğrulandı — yani
 * backend hiç bozuk değildi, sadece geri bildirim yoktu).
 *
 * useFormStatus() SADECE çevreleyen <form>'un bir alt bileşeninden
 * çağrılabilir — bu yüzden bu küçük "use client" bileşene çıkarıldı,
 * page.tsx hâlâ bir Server Component. `pending`, formdaki HERHANGİ bir
 * submit devam ederken true olur, bu yüzden aynı formdaki TÜM
 * OrderBulkSubmitButton örnekleri (genel "Uygula" + duruma özel hızlı
 * buton) submit sırasında BİRLİKTE disabled olur — hangi buton
 * tıklanırsa tıklansın, ikinci bir tıklama artık mümkün değil.
 */
export function OrderBulkSubmitButton({ label, pendingLabel, variant = "outline", formAction }: OrderBulkSubmitButtonProps) {
  const { pending } = useFormStatus();

  const className =
    variant === "primary"
      ? "h-8 rounded-md bg-brand-accent px-3 text-xs font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      : "h-8 rounded-md border border-black/15 px-3 text-xs text-foreground/80 hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <button type="submit" formAction={formAction} disabled={pending} className={className}>
      {pending ? pendingLabel : label}
    </button>
  );
}
