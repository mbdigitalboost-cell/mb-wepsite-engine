import { Container } from "@/components/ui/container";
import { Reveal } from "@/components/ui/reveal";
import { renderLegalText } from "@/lib/utils/render-legal-text";
import type { PetraLegalDocument } from "@/lib/data/petra/legal/types";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Notice({ children }: { children: string }) {
  return (
    <div className="rounded-[var(--radius-brand)] border-l-2 border-brand-primary/50 bg-white/[0.03] px-5 py-4 text-sm text-brand-muted italic">
      {children}
    </div>
  );
}

/**
 * Shared renderer for all 4 legal pages (Gizlilik Politikası, KVKK
 * Aydınlatma Metni, Çerez Politikası, Kullanım Şartları) — replaces the
 * old `LegalPlaceholder` "hazırlanıyor" state on these 4 routes now that
 * real (draft) text exists. `LegalPlaceholder` itself is untouched and
 * still available for any future legal page that doesn't have text yet.
 *
 * Content width is capped at `max-w-3xl` — wide enough to read
 * comfortably (not a cramped single narrow column), inside the site's
 * normal `Container` so it still sits within the standard page grid.
 * Red accent is used sparingly: only the eyebrow, breadcrumb's current
 * item (in `LegalHero`), the "İçindekiler" numbers, and the notice
 * callout's left border.
 */
export function LegalDocument({ document }: { document: PetraLegalDocument }) {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <div className="mx-auto max-w-3xl">
          <Reveal>
            <div className="flex flex-col gap-6">
              {renderLegalText(document.intro)}
              {document.noticeBeforeSections ? <Notice>{document.noticeBeforeSections}</Notice> : null}
            </div>
          </Reveal>

          <Reveal index={1}>
            <nav aria-label="İçindekiler" className="mt-10 rounded-[var(--radius-brand)] border border-white/10 bg-white/[0.02] p-6">
              <span className="text-xs font-medium tracking-[0.2em] text-brand-primary uppercase">İçindekiler</span>
              <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
                {document.sections.map((section) => (
                  <li key={section.heading}>
                    <a
                      href={`#${slugify(section.heading)}`}
                      className="text-sm text-brand-muted transition-colors hover:text-white focus-visible:text-white focus-visible:outline-none"
                    >
                      {section.heading}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </Reveal>

          <div className="mt-14 flex flex-col gap-14">
            {document.sections.map((section, index) => (
              <Reveal key={section.heading} index={index + 2}>
                <h2
                  id={slugify(section.heading)}
                  className="scroll-mt-28 font-[family-name:var(--font-brand-heading)] text-xl font-semibold text-white sm:text-2xl"
                >
                  {section.heading}
                </h2>
                <div className="mt-4 flex flex-col gap-4">{renderLegalText(section.body)}</div>
              </Reveal>
            ))}
          </div>

          {document.noticeAfterSections ? (
            <Reveal index={document.sections.length + 2} className="mt-14">
              <Notice>{document.noticeAfterSections}</Notice>
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  );
}
