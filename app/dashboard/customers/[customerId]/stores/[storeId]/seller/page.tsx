import { notFound } from "next/navigation";
import { requireStoreAdminAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConfirmSubmitButton } from "../returns/confirm-submit-button";
import { updateSellerProfileAction } from "./actions";

const inputClasses =
  "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

const FIELDS: Array<{ name: string; column: string; label: string; hint?: string; required?: boolean; textarea?: boolean }> = [
  { name: "legalName", column: "legal_name", label: "Ticari unvan", required: true },
  { name: "ownerName", column: "owner_name", label: "İşletme sahibi / yetkili" },
  { name: "taxNumber", column: "tax_number", label: "Vergi kimlik no (10) / TC kimlik no (11)" },
  { name: "taxOffice", column: "tax_office", label: "Vergi dairesi" },
  { name: "mersisNumber", column: "mersis_number", label: "MERSİS no", hint: "Yoksa boş bırakın — metinlerde satır çıkmaz." },
  { name: "address", column: "address", label: "Açık adres", textarea: true },
  { name: "phone", column: "phone", label: "Telefon / WhatsApp" },
  { name: "email", column: "email", label: "E-posta" },
  { name: "kepAddress", column: "kep_address", label: "KEP adresi", hint: "Yoksa boş bırakın." },
  { name: "etbisInfo", column: "etbis_info", label: "ETBİS kayıt bilgisi", hint: "Doluysa altbilgide gösterilir; boşsa hiçbir şey gösterilmez." },
  { name: "etbisUrl", column: "etbis_url", label: "ETBİS karekod / doğrulama bağlantısı (https://)", hint: "Doluysa altbilgideki ETBİS satırı bu adrese bağlanır." },
];

/**
 * Faz 33 — Mağaza → İşletme Bilgileri: yasal metinlerin, /iletisim
 * sayfasının ve altbilgideki satıcı satırının kaynağı. store_admin+.
 */
export default async function SellerProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string }>;
  searchParams: Promise<{ kaydedildi?: string; hata?: string }>;
}) {
  const { customerId, storeId } = await params;
  const sp = await searchParams;
  await requireStoreAdminAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: scopeCustomer }, sellerResult] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("customers").select("name").eq("id", customerId).maybeSingle(),
    supabase.from("store_seller_profiles").select("*").eq("store_id", storeId).maybeSingle(),
  ]);
  if (!store) notFound();
  const seller = (sellerResult.data ?? null) as Record<string, string | null> | null;
  const tableMissing = Boolean(sellerResult.error);
  // Faz 29 — onay metninde müşteri adı.
  const scopeLabel = `${scopeCustomer?.name ?? "?"} · ${store.name}`;

  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-semibold tracking-tight">İşletme Bilgileri</h1>
      <p className="mt-1 text-sm text-foreground/60">
        Satıcı kimliği: Ön Bilgilendirme Formu, Mesafeli Satış Sözleşmesi, KVKK metni, /iletisim sayfası ve altbilgi bu bilgilerden doldurulur. Bilmediğiniz
        alanı boş bırakın; o satır hiçbir metinde görünmez.
      </p>
      {tableMissing ? <p className="mt-3 text-sm text-amber-700">Tablo bulunamadı — migration 0048 henüz uygulanmamış olabilir.</p> : null}
      {sp.kaydedildi ? <p className="mt-3 text-sm text-green-700">{scopeLabel} için işletme bilgileri kaydedildi.</p> : null}
      {sp.hata ? <p className="mt-3 text-sm text-red-700">{sp.hata}</p> : null}

      <form action={updateSellerProfileAction.bind(null, customerId, storeId)} className="mt-6 grid gap-4">
        {FIELDS.map((field) => (
          <label key={field.name} className="text-sm">
            {field.label}
            {field.required ? <span className="text-red-600"> *</span> : null}
            {field.textarea ? (
              <textarea name={field.name} defaultValue={seller?.[field.column] ?? ""} rows={2} className={inputClasses} required={field.required} />
            ) : (
              <input name={field.name} defaultValue={seller?.[field.column] ?? ""} className={inputClasses} required={field.required} />
            )}
            {field.hint ? <span className="mt-1 block text-xs text-foreground/50">{field.hint}</span> : null}
          </label>
        ))}
        <div>
          <ConfirmSubmitButton label="Kaydet" confirmText={`${scopeLabel}\n\nİşletme bilgileri güncellensin mi? Yasal metinler ve altbilgi hemen bu bilgilerle gösterilir.`} />
        </div>
      </form>
    </div>
  );
}
