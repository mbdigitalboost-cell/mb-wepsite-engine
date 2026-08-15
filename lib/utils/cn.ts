type ClassValue = string | number | null | boolean | undefined;

/**
 * Minimal `clsx`-style class name joiner. Kept dependency-free since this
 * one function covers everything the foundation needs today; reach for
 * `clsx`/`tailwind-merge` later only if real conflicts show up.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
