import { startTransition } from "react";

/**
 * Faz 37 — DÜZENLEME formları için gönderim (tests/submit-without-reset.test.ts).
 *
 * KÖK NEDEN (Canik'in markası silindi): React 19, `<form action={fn}>` ile
 * gönderilen bir action başarıyla bitince formu OTOMATİK SIFIRLAR
 * (form.reset()). Sunucudan gelen HTML'de seçenekler `selected`
 * özniteliğiyle gelir ve sıfırlama değeri korur; ama sayfaya istemci
 * tarafı bağlantıyla gelinince (ürün listesi → ürün) React kontrollü
 * `<select value>`'ı kendisi kurar ve hiçbir seçeneğe defaultSelected
 * vermez. Sıfırlama seçimi ilk seçeneğe ("— Yok —") çeker; ekran ise React
 * durumunu göstermeye devam eder. İkinci "Kaydet" boş markayı gönderir ve
 * sunucu brand_id'yi NULL yazar (11-14 ve 11-16'daki art arda kayıtlar).
 *
 * Çözüm: action'ı `action` özniteliğiyle değil, submit olayında elle
 * (geçiş içinde) çağırmak — React otomatik sıfırlamayı yalnız `action`
 * özniteliğiyle gönderilen formlarda yapar. useActionState'in pending ve
 * state'i aynen çalışır. Basılan düğmenin name/value'su da FormData'ya girer.
 */
export interface SubmitLikeEvent {
  preventDefault(): void;
  currentTarget: HTMLFormElement;
  nativeEvent: Event;
}

export function submitWithoutReset(
  dispatch: (formData: FormData) => void,
  toFormData: (form: HTMLFormElement, submitter: HTMLElement | null) => FormData = (form, submitter) => new FormData(form, submitter ?? undefined),
) {
  return (event: SubmitLikeEvent) => {
    event.preventDefault();
    const submitter = ((event.nativeEvent as SubmitEvent).submitter ?? null) as HTMLElement | null;
    const formData = toFormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  };
}
