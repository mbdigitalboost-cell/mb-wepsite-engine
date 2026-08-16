import type { PetraContactInfo, PetraSocialLink } from "@/lib/data/petra/types";

export const petraSiteName = "Petra Mühendislik";

/**
 * Confirmed alternate/trading name (company reference doc). Kept as a
 * standalone field — not part of PetraContactInfo — so this pattern is
 * reusable as-is for future MB Digital Boost customers that also trade
 * under more than one name. Null until confirmed for a given customer.
 */
export const petraAlternateName: string | null = "Petra İklimlendirme";

export const petraTagline = "İklimlendirmede mühendislik ve güven.";

/**
 * Verified against the customer's own Instagram profile screenshots
 * (cross-checked with the company reference doc's PENDING list):
 * - `phone`: confirmed as 0535 791 11 96. This is the number visible on
 *   the customer's Instagram profile — treated as the primary phone.
 * - `whatsapp`: confirmed by the customer/agency (2026-08-16) to be the
 *   same number as `phone` — this is an explicit confirmation, not an
 *   inferred copy of `phone`. Stored in full international format
 *   (+90 535 791 11 96, confirmed by the customer 2026-08-16) because
 *   `buildWhatsappHref` (lib/data/petra/whatsapp.ts) only strips
 *   non-digit characters — it does NOT add a country code. A local-format
 *   "0535..." value would have produced an invalid `wa.me/05357911196`
 *   link (leading 0 instead of the 90 country code); this fixes that.
 * - `email`, `workingHours`: still `null` — not visible/confirmed in the
 *   Instagram source.
 * - `address`: still `null` — a candidate address IS visible in the
 *   screenshot ("Yusuflar Mahallesi, Şekerdere Caddesi No:29/A"), but the
 *   company reference doc flags conflicting formats (Cadde vs Bulvarı,
 *   No:29/A) as unresolved. Per instruction, this stays pending/unset
 *   rather than being written into contact info or structured data until
 *   the customer confirms one canonical format.
 * - Do NOT use: 0850 203 76 44 / 0344 503 00 90 / 0531 193 03 02 — these
 *   only ever appeared in AI-generated design mockups, not in the
 *   customer's real Instagram material.
 */
export const petraContactInfo: PetraContactInfo = {
  phone: "0535 791 11 96",
  phoneDisplay: "0535 791 11 96",
  whatsapp: "+90 535 791 11 96",
  email: null,
  address: null,
  serviceArea: "Onikişubat, Kahramanmaraş",
  workingHours: null,
};

/**
 * PENDING — do not treat as a confirmed/linkable URL yet.
 *
 * A website domain appears on the customer's Instagram profile, but the
 * exact characters are ambiguous in the source screenshot: it reads either
 * "form-mhiklima.com/tr" (Latin) or "form-mhiklimа.com/tr" (with a
 * Cyrillic "а" in place of Latin "a" — a classic homograph pattern).
 * Per instruction, this is not something to guess-correct, and a domain
 * this ambiguous must not be turned into an active production link
 * without the customer confirming the exact registered domain. Kept as
 * `null` until that's verified — do not populate this from OCR/visual
 * guesswork.
 */
export const petraWebsite: string | null = null;

/**
 * Empty until the customer confirms their active social profiles/URLs.
 * The Instagram *presence* is known, but not confirmed enough to hardcode
 * a URL without checking it's current and correct.
 */
export const petraSocialLinks: PetraSocialLink[] = [];
