import { Fragment } from "react";

/**
 * Minimal, purpose-built renderer for the legal document bodies in
 * `lib/data/petra/legal/*.ts` — NOT a general markdown parser (no new
 * dependency added for this). Handles exactly the two things those
 * source `.md` files use inside a section body: `**bold**` spans and
 * paragraph/line breaks (`\n\n` = new paragraph, `\n` = line break
 * within a paragraph, e.g. a "Petra Mühendislik / E-posta: ... /
 * Telefon: ..." contact block). Content itself is never altered — only
 * turned into React nodes.
 */
export function renderLegalText(text: string) {
  const paragraphs = text.split("\n\n");

  return paragraphs.map((paragraph, paragraphIndex) => {
    const lines = paragraph.split("\n");
    return (
      <p key={paragraphIndex} className="text-base leading-relaxed text-brand-muted">
        {lines.map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {renderInlineBold(line)}
          </Fragment>
        ))}
      </p>
    );
  });
}

function renderInlineBold(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
}
