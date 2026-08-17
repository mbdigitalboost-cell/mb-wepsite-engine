import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/layout/page-header";
import { Reveal } from "@/components/ui/reveal";
import { petraContactInfo } from "@/lib/data/petra/site-config";

/**
 * Faz 12: shared placeholder for legal/policy pages (Gizlilik Politikası,
 * KVKK Aydınlatma Metni, Çerez Politikası, Kullanım Şartları). These are
 * real legal documents — writing plausible-sounding legal text without an
 * actual reviewed policy from the customer would mean shipping fabricated
 * legal content under Petra Mühendislik's name, which this project's
 * standing rule (never invent business info) explicitly rules out. So
 * this renders an honest "hazırlanıyor" state instead: the page exists
 * (real route, real nav entry, no 404) but says plainly that the final
 * text is pending, and points to a real, already-confirmed contact
 * channel for anyone who needs it now. Swap to the real text once the
 * customer supplies/approves a reviewed policy — this component then
 * simply stops being used by that one page.
 */
export function LegalPlaceholder({ title, eyebrow }: { title: string; eyebrow: string }) {
  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} />
      <section className="py-20">
        <Container>
          <Reveal>
            <p className="max-w-xl text-base text-brand-muted">
              Bu sayfanın metni hazırlanıyor. {title} ile ilgili sorularınız için bizimle
              doğrudan iletişime geçebilirsiniz.
            </p>
            {petraContactInfo.phone ? (
              <p className="mt-4 text-sm text-brand-muted">
                Telefon:{" "}
                <a href={`tel:${petraContactInfo.phone}`} className="text-white hover:text-brand-primary">
                  {petraContactInfo.phoneDisplay}
                </a>
              </p>
            ) : null}
          </Reveal>
        </Container>
      </section>
    </>
  );
}
