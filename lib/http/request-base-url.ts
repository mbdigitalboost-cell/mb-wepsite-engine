import "server-only";

import { headers } from "next/headers";
import { publicEnv } from "@/lib/config/env";

/**
 * Faz 22 — isteğin geldiği host'tan mutlak taban URL. Kod iki Vercel
 * projesinde (panel + mağaza) AYNI repodan çalışır ve müşteri hangi
 * host'ta alışveriş yapıyorsa iyzico callback'i de ORAYA dönmeli (çerez
 * ve sepet o host'ta). NEXT_PUBLIC_SITE_URL tek bir deployment'ı işaret
 * ettiği için yeterli değil; x-forwarded-host/host + x-forwarded-proto
 * okunur, yoksa env'e düşülür. localhost dışında her zaman https.
 */
export async function resolveRequestBaseUrl(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  if (!host) return publicEnv.siteUrl.replace(/\/+$/, "");
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const proto = headerList.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
  return `${proto}://${host}`;
}

export async function resolveRequestClientIp(): Promise<string> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return headerList.get("x-real-ip") ?? "0.0.0.0";
}
