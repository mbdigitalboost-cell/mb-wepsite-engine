"use client";

import { useState } from "react";
import { LegalMarkdown } from "@/components/commerce/public/legal/legal-markdown";
import { ConfirmSubmitButton } from "../returns/confirm-submit-button";
import type { LegalPreviewResult } from "./actions";

const inputClasses =
  "mt-1 w-full rounded-md border border-black/15 bg-transparent px-3 py-2 text-sm focus-visible:border-brand-accent focus-visible:outline-none";

/**
 * Faz 33 — yasal metin düzenleyici. "Önizle" sunucuda örnek sipariş
 * verisiyle doldurur ve bilinmeyen değişkenleri gösterir; "Yayınla" yeni
 * sürüm oluşturur (eski sürümler kalır). "Varsayılan şablonu yükle" yalnız
 * düzenleyiciyi doldurur — yayımlamadan hiçbir şey değişmez.
 */
export function LegalEditor({
  initialTitle,
  initialBody,
  defaultTemplate,
  publishAction,
  previewAction,
  scopeLabel,
}: {
  initialTitle: string;
  initialBody: string;
  defaultTemplate: { title: string; body: string };
  publishAction: (formData: FormData) => Promise<void>;
  previewAction: (body: string) => Promise<LegalPreviewResult>;
  scopeLabel: string;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [preview, setPreview] = useState<LegalPreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);

  async function runPreview() {
    setPreviewing(true);
    try {
      setPreview(await previewAction(body));
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form action={publishAction} className="grid content-start gap-3">
        <label className="text-sm">
          Başlık
          <input name="title" value={title} onChange={(event) => setTitle(event.target.value)} className={inputClasses} required maxLength={200} />
        </label>
        <label className="text-sm">
          Metin (markdown)
          <textarea
            name="body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={28}
            className={`${inputClasses} font-mono text-xs leading-relaxed`}
            required
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runPreview()}
            disabled={previewing}
            className="inline-flex h-9 items-center rounded-md border border-black/15 px-4 text-sm hover:border-black/30 disabled:opacity-50"
          >
            {previewing ? "Hazırlanıyor…" : "Önizle (örnek sipariş)"}
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Düzenleyicideki metin varsayılan şablonla değiştirilsin mi? (Yayımlamadan hiçbir şey değişmez.)")) {
                setTitle(defaultTemplate.title);
                setBody(defaultTemplate.body);
                setPreview(null);
              }
            }}
            className="inline-flex h-9 items-center rounded-md border border-black/15 px-4 text-sm hover:border-black/30"
          >
            Varsayılan şablonu yükle
          </button>
          <ConfirmSubmitButton
            label="Yayınla (yeni sürüm)"
            confirmText={`${scopeLabel}\n\n"${title}" yeni sürüm olarak yayımlansın mı? Vitrinde ve bundan sonraki siparişlerde bu sürüm kullanılır; eski sürümler ve verilmiş siparişlerin onayladığı metinler değişmez.`}
          />
        </div>
      </form>

      <div className="min-w-0">
        <p className="text-sm font-medium">Önizleme</p>
        {preview ? (
          <div className="mt-2 space-y-3">
            {preview.unknownVariables.length > 0 ? (
              <p className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                Bilinmeyen değişken (yayımlanamaz): {preview.unknownVariables.map((name) => `{{${name}}}`).join(", ")}
              </p>
            ) : null}
            {preview.structureErrors.map((error) => (
              <p key={error} className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-800">
                {error}
              </p>
            ))}
            <div className="max-h-[70vh] overflow-y-auto rounded-md border border-black/10 bg-white p-4">
              <LegalMarkdown source={preview.text} tone="light" />
            </div>
            <p className="text-xs text-foreground/50">Örnek sipariş verisiyle doldurulmuştur; gerçek siparişte alıcının ve siparişin bilgileri yazılır.</p>
          </div>
        ) : (
          <p className="mt-2 text-xs text-foreground/50">&quot;Önizle&quot; ile metni mağaza bilgileri ve örnek bir siparişle doldurulmuş hâliyle görün.</p>
        )}
      </div>
    </div>
  );
}
