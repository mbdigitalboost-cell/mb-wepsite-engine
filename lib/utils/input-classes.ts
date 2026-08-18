/**
 * Shared Tailwind classes for every plain text/email/password/textarea/
 * select input across the dashboard and login forms. Previously each of
 * the ~12 form components (content-form, hero-form, edit-customer-form,
 * media-form, seo-form, settings-form, tracking-form, edit-website-form,
 * website-form, customer-form, invite-form, login-form) duplicated an
 * identical local `const inputClasses = "..."` — a single shared export
 * here means one visual tweak (e.g. the accent focus ring below) now
 * applies everywhere at once instead of needing 12 near-identical edits.
 *
 * `focus-visible:border-brand-accent` + a subtle accent ring replaces the
 * previous plain `focus-visible:border-foreground/40` — same neutral
 * layout, just a clearer "this field is focused" signal using the
 * engine's existing brand-accent token (see lib/theme/default-theme.ts).
 */
export const inputClasses =
  "w-full rounded-md border border-black/15 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 transition-colors focus-visible:border-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/20";
