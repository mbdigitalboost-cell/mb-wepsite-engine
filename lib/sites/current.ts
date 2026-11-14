import { readSiteResolution } from "@/lib/config/env";
import type { SiteDefinition } from "@/lib/sites/registry";

/**
 * Faz 28 — bu deploy'un sunduğu site (SITE_KEY → lib/sites/registry.ts).
 * process.env'e doğrudan dokunmaz; lib/config/env.ts üzerinden okur.
 *
 * SITE_KEY yoksa: PANEL_ONLY_MODE=true → panel, değilse taktikalp46
 * (Faz 28 öncesi davranışın aynısı; GEÇİŞ DÖNEMİ yedeği, Vercel'de
 * prebuild bunu zaten engeller — bkz. scripts/check-site-env.mjs).
 * Bilinmeyen bir SITE_KEY hata fırlatır (sessizce başka site sunulmaz).
 */
export function getCurrentSite(): SiteDefinition {
  return readSiteResolution().site;
}
