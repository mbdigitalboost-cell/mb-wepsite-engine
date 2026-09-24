import "server-only";

const TURKISH_MAP: Record<string, string> = {
  ç: "c",
  Ç: "c",
  ğ: "g",
  Ğ: "g",
  ı: "i",
  I: "i",
  İ: "i",
  ö: "o",
  Ö: "o",
  ş: "s",
  Ş: "s",
  ü: "u",
  Ü: "u",
};

/**
 * FAZ 2C-7 STEP 26 — deterministic slug generator, used ONLY when an
 * import row's own Slug column is blank (never overrides a given slug —
 * see validate-import-rows.ts). Targets the exact same format every slug
 * column's own CHECK constraint already requires
 * (`^[a-z0-9]+(-[a-z0-9]+)*$`, migrations 0007/0016/0017) — lowercase
 * ASCII, hyphen-separated. Turkish letters are mapped explicitly BEFORE
 * `.toLowerCase()` because JS's default locale turns "İ" into "i̇" (i +
 * combining dot above), not plain "i" — mapping first avoids that. This
 * is a small fixed transliteration table, not a general-purpose i18n
 * slugify package (none was added — see the STEP 26 report).
 */
export function slugifyProductName(name: string): string {
  const transliterated = name
    .split("")
    .map((char) => TURKISH_MAP[char] ?? char)
    .join("");

  return transliterated
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
