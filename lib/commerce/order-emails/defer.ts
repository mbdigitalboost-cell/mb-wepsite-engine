/**
 * Faz 40 — E-POSTA GÖNDERİMİNİ YANITTAN SONRAYA ALMA (saf çekirdek).
 *
 * Müşteriye dönen yanıt (sipariş alındı ekranı) e-posta sağlayıcısını
 * beklemez: iş `schedule` ile yanıttan sonraya bırakılır (sunucuda
 * next/server `after`). Sıra korunur: çağıran önce siparişi ve sözleşme
 * kaydını yazar, sonra bu fonksiyonu çağırır.
 *
 * - `schedule` çalışmazsa (istek kapsamı dışında çağrıldıysa fırlatır) iş
 *   HEMEN, beklenerek çalıştırılır; e-posta kaybolmaz.
 * - İş hata fırlatırsa `onError` çağrılır (kayda "failed" yazmak için) ve
 *   hata YUTULUR: bu fonksiyon hiçbir koşulda hata fırlatmaz, dolayısıyla
 *   siparişi, ödemeyi ya da talebi etkilemez.
 */
export type DeferSchedule = (task: () => Promise<void>) => void;

export async function runDeferred(schedule: DeferSchedule, run: () => Promise<void>, onError?: (error: unknown) => Promise<void> | void): Promise<void> {
  const task = async () => {
    try {
      await run();
    } catch (error) {
      try {
        await onError?.(error);
      } catch {
        // Hata kaydı da yazılamadıysa yapılacak bir şey yok; asıl iş etkilenmez.
      }
    }
  };
  try {
    schedule(task);
  } catch {
    await task();
  }
}
