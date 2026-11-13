"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import type { PaymentIntegrationMode } from "@/lib/supabase/types";
import { initialPaymentFormState, type PaymentFormState } from "./form-state";

type BoundAction = (prevState: PaymentFormState, formData: FormData) => Promise<PaymentFormState>;

function StateMessages({ state }: { state: PaymentFormState }) {
  return (
    <>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
      {state.success ? <p className="text-sm text-green-700">{state.success}</p> : null}
    </>
  );
}

function ModeRadios({ name, value, onChange, idPrefix }: { name: string; value: PaymentIntegrationMode; onChange: (mode: PaymentIntegrationMode) => void; idPrefix: string }) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-foreground">
      <label htmlFor={`${idPrefix}-sandbox`} className="flex items-center gap-2">
        <input id={`${idPrefix}-sandbox`} type="radio" name={name} value="sandbox" checked={value === "sandbox"} onChange={() => onChange("sandbox")} className="h-4 w-4 border-black/20" />
        Test (sandbox)
      </label>
      <label htmlFor={`${idPrefix}-live`} className="flex items-center gap-2">
        <input id={`${idPrefix}-live`} type="radio" name={name} value="live" checked={value === "live"} onChange={() => onChange("live")} className="h-4 w-4 border-black/20" />
        Canlı
      </label>
    </div>
  );
}

/**
 * Faz 22 — Ödeme (iyzico) sayfasının istemci adacıkları. Action'lar page.tsx'te
 * (server) BİR KEZ bind edilip prop olarak geliyor — Faz 21 Kargo sayfasıyla
 * aynı kanıtlanmış desen.
 */
export function PaymentKeysForm({
  saveAction,
  removeAction,
  hasKeys,
  apiKeyLast4,
  secretKeyLast4,
  currentMode,
}: {
  saveAction: BoundAction;
  removeAction: BoundAction;
  hasKeys: boolean;
  apiKeyLast4: string | null;
  secretKeyLast4: string | null;
  currentMode: PaymentIntegrationMode;
}) {
  const [saveState, saveFormAction, savePending] = useActionState(saveAction, initialPaymentFormState);
  const [removeState, removeFormAction, removePending] = useActionState(removeAction, initialPaymentFormState);
  const [mode, setMode] = useState<PaymentIntegrationMode>(currentMode);
  const formId = useId();

  return (
    <div className="max-w-md space-y-3">
      <form action={saveFormAction} className="space-y-3">
        <div>
          <label htmlFor={`${formId}-apiKey`} className="mb-1.5 block text-sm font-medium text-foreground">
            API Anahtarı (API Key)
          </label>
          <input
            id={`${formId}-apiKey`}
            name="apiKey"
            type="password"
            required
            autoComplete="off"
            placeholder={hasKeys ? `Kayıtlı: •••••••• ${apiKeyLast4 ?? ""} — değiştirmek için yenisini yapıştırın` : "iyzico paneli → Ayarlar → API anahtarları"}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor={`${formId}-secretKey`} className="mb-1.5 block text-sm font-medium text-foreground">
            Gizli Anahtar (Secret Key)
          </label>
          <input
            id={`${formId}-secretKey`}
            name="secretKey"
            type="password"
            required
            autoComplete="off"
            placeholder={hasKeys ? `Kayıtlı: •••••••• ${secretKeyLast4 ?? ""}` : "sandbox-… ya da canlı gizli anahtar"}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">
            Anahtarlar yalnızca yazılabilir; kaydedilen anahtar bir daha gösterilmez, sadece son 4 hanesi görünür.
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-foreground">Bu anahtarlar hangi ortama ait?</p>
          <ModeRadios name="mode" value={mode} onChange={setMode} idPrefix={`${formId}-keys`} />
          {mode === "live" ? (
            <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              CANLI anahtar: gerçek kartlardan gerçek tahsilat yapılır. Sandbox anahtarını canlı moda kaydetmeyin (iyzico reddeder).
            </p>
          ) : null}
        </div>
        <StateMessages state={saveState} />
        <Button type="submit" size="sm" disabled={savePending}>
          {savePending ? "Kaydediliyor..." : hasKeys ? "Anahtarları Değiştir" : "Kaydet"}
        </Button>
      </form>

      {hasKeys ? (
        <form
          action={removeFormAction}
          onSubmit={(event) => {
            if (!window.confirm("Anahtarlar kaldırılacak ve entegrasyon pasife alınacak — vitrinde kart seçeneği kaybolur. Devam edilsin mi?")) {
              event.preventDefault();
            }
          }}
        >
          <StateMessages state={removeState} />
          <button type="submit" disabled={removePending} className="text-xs text-red-600 underline-offset-2 hover:underline disabled:opacity-50">
            {removePending ? "Kaldırılıyor..." : "Anahtarları Kaldır"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function PaymentTestForm({ testAction, disabled }: { testAction: BoundAction; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(testAction, initialPaymentFormState);
  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
        {pending ? "Test ediliyor..." : "Bağlantıyı Test Et"}
      </Button>
      <StateMessages state={state} />
    </form>
  );
}

export function PaymentSettingsForm({
  settingsAction,
  initialValues,
}: {
  settingsAction: BoundAction;
  initialValues: { mode: PaymentIntegrationMode; isActive: boolean };
}) {
  const [state, formAction, pending] = useActionState(settingsAction, initialPaymentFormState);
  const [mode, setMode] = useState<PaymentIntegrationMode>(initialValues.mode);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-foreground">Mod</p>
        <ModeRadios name="mode" value={mode} onChange={setMode} idPrefix={`${formId}-settings`} />
        {mode === "live" ? (
          <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            CANLI mod seçili — kayıtlı anahtarlar canlı hesaba ait olmalı; sandbox test kartları çalışmaz, gerçek tahsilat yapılır.
          </p>
        ) : null}
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} className="mt-0.5 h-4 w-4 rounded border-black/20" />
        <span>
          Entegrasyon aktif
          <span className="block text-xs text-foreground/50">
            Açıkken vitrinin ödeme adımında &quot;Kredi / Banka Kartı&quot; seçeneği görünür; kapalıyken mevcut üç yöntem aynen çalışır.
          </span>
        </span>
      </label>

      <StateMessages state={state} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Kaydediliyor..." : "Ayarları Kaydet"}
      </Button>
    </form>
  );
}

export function WebhookUrlCopy({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="max-w-full break-all rounded bg-black/5 px-3 py-1.5 font-mono text-xs text-foreground">{url}</code>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          });
        }}
        className="rounded-md border border-black/15 px-3 py-1.5 text-xs text-foreground/80 hover:border-black/30"
      >
        {copied ? "Kopyalandı ✓" : "Kopyala"}
      </button>
    </div>
  );
}
