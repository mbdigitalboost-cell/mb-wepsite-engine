import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

/**
 * Faz 4G — B (birincil, anlık) mekanizmasının ALICI ucu. Bu route, KENDİ
 * çalıştığı deployment'ın (ör. petra-muhendislik) route cache'ini
 * revalidate eder — panel deployment'ındaki (`content/[type]/actions.ts`
 * → `triggerRemoteRevalidation`) admin action'ı bu route'u imzalı bir
 * POST ile tetikliyor.
 *
 * Tamamen jenerik: hiçbir müşteriye özel bilgi/dallanma içermiyor —
 * hangi path'lerin revalidate edileceğini çağıran taraf söylüyor, bu
 * route sadece secret'ı doğrulayıp `revalidatePath()`'i çağırıyor. Aynı
 * kod, gelecekte başka bir müşterinin deployment'ına da değişiklik
 * gerekmeden kopyalanabilir.
 *
 * `proxy.ts`'teki `PANEL_ALLOWED_PATH_PREFIXES` listesi `/api`'yi zaten
 * kapsıyor, yani bu route panel deployment'ında da (teorik olarak)
 * erişilebilir — ama panel bu route'u hiç ÇAĞIRMIYOR (sadece hedef
 * deployment'lar kullanıyor) ve secret kontrolü burada, panel'de de
 * aktif olduğu için ekstra bir güvenlik açığı oluşturmuyor: secret'sız/
 * yanlış secret'lı hiçbir istek hiçbir yerde revalidate tetikleyemez.
 */

const SECRET_HEADER = "x-revalidate-secret";

/** Zaman-sabit karşılaştırma: `crypto.timingSafeEqual` eşit uzunlukta
 * buffer bekliyor, bu yüzden önce ikisini de sabit uzunluklu bir hash'e
 * (SHA-256) indirgiyoruz — aşırı mühendislik değil, sadece uzunluk
 * uyuşmazlığından kaçınmanın en basit yolu. */
function safeEqual(a: string, b: string): boolean {
  const hashA = crypto.createHash("sha256").update(a).digest();
  const hashB = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(hashA, hashB);
}

interface RevalidateResult {
  path: string;
  ok: boolean;
  error?: string;
}

export async function POST(request: Request): Promise<NextResponse> {
  const secret = process.env.REVALIDATE_WEBHOOK_SECRET;
  const provided = request.headers.get(SECRET_HEADER);

  if (!secret || !provided || !safeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawPaths = body && typeof body === "object" && "paths" in body ? (body as { paths: unknown }).paths : null;
  const paths = Array.isArray(rawPaths) ? rawPaths.filter((path): path is string => typeof path === "string") : [];

  if (paths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 });
  }

  const results: RevalidateResult[] = paths.map((path) => {
    try {
      // "/" için "layout" tipi kullanılıyor — header/footer'ı paylaşan
      // HER public route'u kapsar, tıpkı content/[type]/actions.ts'in
      // panel içindeki kendi (etkisiz) çağrısıyla aynı gerekçeyle.
      if (path === "/") {
        revalidatePath("/", "layout");
      } else {
        revalidatePath(path);
      }
      return { path, ok: true };
    } catch (err) {
      return { path, ok: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });

  return NextResponse.json({ revalidated: true, results });
}
