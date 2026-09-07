import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { isAllowedRevalidatePath, MAX_REVALIDATE_PATHS, MAX_REVALIDATE_PATH_LENGTH } from "@/lib/security/revalidate-paths";

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

/** Faz 6 — panel'in gerçek kullanım deseninde en fazla 3 path/istek
 * gönderiliyor (settings/actions.ts); dakikada 30 istek, normal CMS
 * kaydetme akışını hiç etkilemeden brute-force/spam denemelerini
 * sınırlar. `lib/security/rate-limit.ts`'in login/discovery-request'te
 * kullanılan AYNI (in-memory, dağıtık olmayan — bkz. o dosyanın kendi
 * dürüstlük notu) deseni, yeni bir mekanizma icat edilmeden. Bu limit,
 * SADECE auth+validation+allowlist'i geçmiş ("yetkili") isteklere
 * uygulanıyor — bkz. `REVALIDATE_PRE_AUTH_RATE_LIMIT` (auth'tan ÖNCE,
 * sonucundan bağımsız çalışan ayrı bir katman). */
const REVALIDATE_RATE_LIMIT = { limit: 30, windowMs: 60 * 1000 };

/** Faz 6 — auth sonucundan BAĞIMSIZ, method kontrolünden hemen sonra
 * çalışan pre-auth limit. Yanlış-secret denemelerini VE malformed
 * body/allowlist-dışı path denemelerini de sayar — bunların hiçbiri
 * yukarıdaki post-auth `REVALIDATE_RATE_LIMIT`'e hiç ulaşmıyordu (o,
 * secret+body+path'in HEPSİ geçerli olduğu isteklere kadar çalışmıyor).
 * Limit, post-auth'tan (30) BİLEREK daha yüksek (60) tutuldu: geçerli
 * trafik zaten daha sıkı olan post-auth limitine önce takılır (bkz.
 * §11 raporundaki test kanıtı), bu katman SADECE auth'a hiç ulaşmayan/
 * ulaşamayan (yanlış secret, bozuk JSON, allowlist-dışı path) trafiğin
 * hacmini üst sınırlıyor. Aynı `rate-limit.ts` helper'ı, farklı anahtar
 * öneki (`revalidate:pre-auth:` vs `revalidate:`) ile — iki ayrı sayaç,
 * birbirini etkilemiyor. */
const REVALIDATE_PRE_AUTH_RATE_LIMIT = { limit: 60, windowMs: 60 * 1000 };

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
  const ip = getClientIp(request);

  const preAuth = rateLimit(`revalidate:pre-auth:${ip}`, REVALIDATE_PRE_AUTH_RATE_LIMIT);
  if (!preAuth.allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: preAuth.retryAfterMs ? { "Retry-After": String(Math.ceil(preAuth.retryAfterMs / 1000)) } : undefined },
    );
  }

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

  if (!Array.isArray(rawPaths) || rawPaths.length === 0) {
    return NextResponse.json({ error: "No paths provided" }, { status: 400 });
  }
  if (rawPaths.length > MAX_REVALIDATE_PATHS) {
    return NextResponse.json({ error: "Too many paths" }, { status: 400 });
  }
  const isValidShape = rawPaths.every(
    (path): path is string => typeof path === "string" && path.length > 0 && path.length <= MAX_REVALIDATE_PATH_LENGTH,
  );
  if (!isValidShape) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const paths = rawPaths as string[];
  if (!paths.every(isAllowedRevalidatePath)) {
    return NextResponse.json({ error: "Path not allowed" }, { status: 400 });
  }

  const { allowed, retryAfterMs } = rateLimit(`revalidate:${ip}`, REVALIDATE_RATE_LIMIT);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: retryAfterMs ? { "Retry-After": String(Math.ceil(retryAfterMs / 1000)) } : undefined },
    );
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
