import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStoreEditorAccess } from "@/lib/auth/require-store-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LEGAL_KIND_LABELS, isLegalKind, listLegalVersions } from "@/lib/legal/admin-legal";
import { DEFAULT_LEGAL_TEMPLATES } from "@/lib/legal/default-templates";
import { LEGAL_VARIABLES } from "@/lib/legal/template";
import { previewLegalDocumentAction, publishLegalDocumentAction, setLawyerReviewedAction } from "../actions";
import { LegalEditor } from "../legal-editor";
import { ConfirmSubmitButton } from "../../returns/confirm-submit-button";

/**
 * Faz 33 — tek bir yasal metin: şablon uyarısı, düzenleyici + önizleme,
 * değişken listesi, sürüm geçmişi, "Hukukçu kontrol etti". Okuma
 * store_editor+, yazma (yayınla / kontrol işareti) store_admin+ (action'larda).
 */
export default async function LegalDocumentEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ customerId: string; storeId: string; kind: string }>;
  searchParams: Promise<{ yayinlandi?: string; hata?: string; inceleme?: string; surum?: string }>;
}) {
  const { customerId, storeId, kind } = await params;
  const sp = await searchParams;
  if (!isLegalKind(kind)) notFound();
  await requireStoreEditorAccess(storeId, customerId);

  const supabase = await createSupabaseServerClient();
  const [{ data: store }, { data: scopeCustomer }] = await Promise.all([
    supabase.from("stores").select("id, name").eq("id", storeId).eq("customer_id", customerId).maybeSingle(),
    supabase.from("customers").select("name").eq("id", customerId).maybeSingle(),
  ]);
  if (!store) notFound();
  // Faz 29 — onay metinlerinde müşteri adı.
  const scopeLabel = `${scopeCustomer?.name ?? "?"} · ${store.name}`;

  const { versions } = await listLegalVersions(storeId, kind);
  const latest = versions[0] ?? null;
  const viewed = sp.surum ? (versions.find((version) => String(version.version) === sp.surum) ?? null) : null;
  const template = DEFAULT_LEGAL_TEMPLATES[kind];
  const base = `/dashboard/customers/${customerId}/stores/${storeId}/legal`;

  return (
    <div className="max-w-6xl">
      <Link href={base} className="text-xs text-foreground/50 hover:text-foreground hover:underline">
        ← Yasal Metinler
      </Link>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">{LEGAL_KIND_LABELS[kind]}</h1>
      <p className="mt-1 text-xs text-foreground/60">{scopeLabel}</p>

      {!latest || !latest.reviewedByLawyer ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <strong>Bu metin şablondur; hukukçunuza kontrol ettirin.</strong> Mevzuata (Mesafeli Sözleşmeler Yönetmeliği, 6502, 6698, 6563) dayanılarak
          hazırlanmıştır ancak hukuki görüş değildir. Kontrol edildikten sonra aşağıdan &quot;Hukukçu kontrol etti&quot; işaretleyin.
        </div>
      ) : (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          Sürüm {latest.version} hukukçu tarafından kontrol edildi
          {latest.reviewedAt ? ` (${new Date(latest.reviewedAt).toLocaleDateString("tr-TR")})` : ""}.
        </div>
      )}
      {sp.yayinlandi ? <p className="mt-3 text-sm text-green-700">{scopeLabel} için sürüm {sp.yayinlandi} yayımlandı.</p> : null}
      {sp.inceleme ? (
        <p className="mt-3 text-sm text-green-700">{sp.inceleme === "evet" ? "Hukukçu kontrolü işaretlendi." : "Hukukçu kontrolü işareti kaldırıldı."}</p>
      ) : null}
      {sp.hata ? <p className="mt-3 text-sm text-red-700">{sp.hata}</p> : null}

      <section className="mt-6">
        <LegalEditor
          initialTitle={latest?.title ?? template.title}
          initialBody={latest?.body ?? template.body}
          defaultTemplate={template}
          publishAction={publishLegalDocumentAction.bind(null, customerId, storeId, kind)}
          previewAction={previewLegalDocumentAction.bind(null, customerId, storeId)}
          scopeLabel={scopeLabel}
        />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold">Sürüm geçmişi</h2>
          {versions.length === 0 ? (
            <p className="mt-2 text-xs text-foreground/60">Henüz yayımlanmış sürüm yok.</p>
          ) : (
            <ul className="mt-2 divide-y divide-black/10 rounded-lg border border-black/10 text-sm">
              {versions.map((version) => (
                <li key={version.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span>
                    <Link href={`${base}/${kind}?surum=${version.version}#surum`} className="font-medium hover:underline">
                      Sürüm {version.version}
                    </Link>
                    <span className="ml-2 text-xs text-foreground/60">{new Date(version.createdAt).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" })}</span>
                    {version.reviewedByLawyer ? <span className="ml-2 text-xs text-green-700">✓ hukukçu</span> : null}
                  </span>
                  <form action={setLawyerReviewedAction.bind(null, customerId, storeId, kind, version.id)} className="flex items-center gap-2">
                    <input type="hidden" name="reviewed" value={version.reviewedByLawyer ? "off" : "on"} />
                    <ConfirmSubmitButton
                      variant="outline"
                      label={version.reviewedByLawyer ? "Kontrol işaretini kaldır" : "Hukukçu kontrol etti"}
                      confirmText={`${scopeLabel}\n\n${LEGAL_KIND_LABELS[kind]} sürüm ${version.version}: ${
                        version.reviewedByLawyer ? "hukukçu kontrolü işareti kaldırılsın mı?" : "hukukçunuz bu sürümü kontrol etti mi?"
                      }`}
                    />
                  </form>
                </li>
              ))}
            </ul>
          )}
          {viewed ? (
            <div id="surum" className="mt-4 rounded-lg border border-black/10 p-3">
              <p className="text-xs font-medium">
                Sürüm {viewed.version} — kaynak metin (değişkenler doldurulmadan)
              </p>
              <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-foreground/80">{viewed.body}</pre>
            </div>
          ) : null}
        </div>

        <div>
          <h2 className="text-sm font-semibold">Değişkenler</h2>
          <p className="mt-1 text-xs text-foreground/60">
            Boş bir değişkenin geçtiği satır metinden tamamen çıkar. <code>{"{{ad|varsayılan}}"}</code> boşsa varsayılanı yazar;{" "}
            <code>{"{{#if ad}}"}</code> … <code>{"{{/if}}"}</code> (kendi satırlarında) bloğu yalnız değer doluysa gösterir. Listede olmayan değişken
            yayımlanamaz.
          </p>
          <ul className="mt-2 grid gap-1 text-xs">
            {Object.entries(LEGAL_VARIABLES).map(([name, description]) => (
              <li key={name}>
                <code className="font-mono text-[#B34C00]">{`{{${name}}}`}</code> — {description}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
