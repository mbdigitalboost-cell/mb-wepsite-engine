"use client";

import { useActionState, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { inputClasses } from "@/lib/utils/input-classes";
import { initialShippingFormState, type ShippingFormState } from "./form-state";

type BoundAction = (prevState: ShippingFormState, formData: FormData) => Promise<ShippingFormState>;

function StateMessages({ state }: { state: ShippingFormState }) {
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

/**
 * Faz 21 — Kargo Entegrasyonu sayfasının istemci adacıkları. Action'lar
 * page.tsx'te (server) BİR KEZ bind edilip prop olarak geliyor —
 * DeleteProductButton/ResetPasswordForm ile AYNI kanıtlanmış desen (bind
 * client içinde her render'da tekrar YAPILMIYOR).
 */
export function ShippingTokenForm({
  saveAction,
  removeAction,
  hasToken,
  tokenLast4,
}: {
  saveAction: BoundAction;
  removeAction: BoundAction;
  hasToken: boolean;
  tokenLast4: string | null;
}) {
  const [saveState, saveFormAction, savePending] = useActionState(saveAction, initialShippingFormState);
  const [removeState, removeFormAction, removePending] = useActionState(removeAction, initialShippingFormState);
  const formId = useId();

  return (
    <div className="max-w-md space-y-3">
      <form action={saveFormAction} className="space-y-3">
        <div>
          <label htmlFor={`${formId}-token`} className="mb-1.5 block text-sm font-medium text-foreground">
            Basit Kargo API Anahtarı
          </label>
          <input
            id={`${formId}-token`}
            name="apiToken"
            type="password"
            required
            autoComplete="off"
            placeholder={hasToken ? `Kayıtlı: •••••••• ${tokenLast4 ?? ""} — değiştirmek için yenisini yapıştırın` : "Basit Kargo paneli → API → anahtarı yapıştırın"}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-foreground/50">
            Anahtar yalnızca yazılabilir; kaydedilen anahtar bir daha gösterilmez, sadece son 4 hanesi görünür.
          </p>
        </div>
        <StateMessages state={saveState} />
        <Button type="submit" size="sm" disabled={savePending}>
          {savePending ? "Kaydediliyor..." : hasToken ? "Anahtarı Değiştir" : "Kaydet"}
        </Button>
      </form>

      {hasToken ? (
        <form
          action={removeFormAction}
          onSubmit={(event) => {
            const confirmed = window.confirm(
              "API anahtarı kaldırılacak — otomatik gönderim ve Kargoya Hazırla çalışmaz hale gelir. Devam edilsin mi?",
            );
            if (!confirmed) event.preventDefault();
          }}
        >
          <StateMessages state={removeState} />
          <button
            type="submit"
            disabled={removePending}
            className="text-xs text-red-600 underline-offset-2 hover:underline disabled:opacity-50"
          >
            {removePending ? "Kaldırılıyor..." : "Token'ı Kaldır"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

export function ShippingTestForm({ testAction, disabled }: { testAction: BoundAction; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(testAction, initialShippingFormState);

  return (
    <form action={formAction} className="space-y-3">
      <Button type="submit" size="sm" variant="outline" disabled={disabled || pending}>
        {pending ? "Test ediliyor..." : "Bağlantıyı Test Et"}
      </Button>
      <StateMessages state={state} />
      {state.handlers && state.handlers.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {state.handlers.map((handler) => (
            <li key={handler.code} className="rounded-full border border-black/10 bg-black/5 px-2.5 py-1 text-xs text-foreground">
              {handler.name} <span className="text-foreground/40">({handler.code})</span>
            </li>
          ))}
        </ul>
      ) : null}
    </form>
  );
}

export function ShippingSettingsForm({
  settingsAction,
  initialValues,
}: {
  settingsAction: BoundAction;
  initialValues: { defaultDesi: number; autoPushOnConfirm: boolean; isActive: boolean };
}) {
  const [state, formAction, pending] = useActionState(settingsAction, initialShippingFormState);
  const formId = useId();

  return (
    <form action={formAction} className="max-w-md space-y-4">
      <div>
        <label htmlFor={`${formId}-desi`} className="mb-1.5 block text-sm font-medium text-foreground">
          Varsayılan desi/kg
        </label>
        <input
          id={`${formId}-desi`}
          name="defaultDesi"
          type="number"
          min={0.1}
          max={500}
          step={0.1}
          required
          defaultValue={initialValues.defaultDesi}
          className={inputClasses}
        />
        <p className="mt-1 text-xs text-foreground/50">
          Otomatik gönderimde ve Kargoya Hazırla&apos;da parti geneli varsayılan değer; Kargoya Hazırla ekranında partiye özel
          değiştirilebilir.
        </p>
      </div>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="autoPushOnConfirm" defaultChecked={initialValues.autoPushOnConfirm} className="mt-0.5 h-4 w-4 rounded border-black/20" />
        <span>
          Onaylanınca otomatik gönder
          <span className="block text-xs text-foreground/50">
            Sipariş &quot;Onaylandı&quot; durumuna geçince Basit Kargo&apos;ya barkodsuz düşer; firma ve barkod sonra &quot;Kargoya
            Hazırla&quot; ile seçilir.
          </span>
        </span>
      </label>

      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" name="isActive" defaultChecked={initialValues.isActive} className="mt-0.5 h-4 w-4 rounded border-black/20" />
        <span>
          Entegrasyon aktif
          <span className="block text-xs text-foreground/50">Kapatılırsa anahtar silinmeden tüm Basit Kargo çağrıları durur.</span>
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
