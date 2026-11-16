import { Fragment } from "react";
import Link from "next/link";
import { parseLegalInline, parseLegalMarkdown } from "@/lib/legal/markdown";

/**
 * Faz 33 — doldurulmuş yasal metni (lib/legal/template.ts çıktısı) vitrin
 * diliyle render eder. Sunucu ve istemci bileşenlerinde kullanılabilir.
 * `tone="light"`: yazdırma/admin önizlemesi için açık zemin.
 */
export function LegalMarkdown({ source, tone = "dark" }: { source: string; tone?: "dark" | "light" }) {
  const blocks = parseLegalMarkdown(source);
  const text = tone === "dark" ? "text-[#C9C9C9] print:text-black" : "text-neutral-800";
  const heading = tone === "dark" ? "text-[#F5F5F5] print:text-black" : "text-neutral-950";
  const strong = tone === "dark" ? "text-[#F5F5F5] print:text-black" : "text-neutral-950";
  const link = tone === "dark" ? "text-[#D95F00] hover:text-[#F26A00]" : "text-[#B34C00]";
  const rule = tone === "dark" ? "border-[#292929]" : "border-neutral-300";

  const inline = (value: string) =>
    parseLegalInline(value).map((part, index) => {
      if (part.type === "bold") {
        return (
          <strong key={index} className={`font-semibold ${strong}`}>
            {part.text}
          </strong>
        );
      }
      if (part.type === "link") {
        const className = `${link} underline underline-offset-2`;
        return part.href.startsWith("/") ? (
          <Link key={index} href={part.href} className={className}>
            {part.text}
          </Link>
        ) : (
          <a key={index} href={part.href} className={className} rel="noopener noreferrer">
            {part.text}
          </a>
        );
      }
      return <Fragment key={index}>{part.text}</Fragment>;
    });

  return (
    <div className={`space-y-3 text-sm leading-relaxed ${text}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const size = block.level === 1 ? "text-xl" : block.level === 2 ? "text-base" : "text-sm";
          const Tag = block.level === 1 ? "h2" : block.level === 2 ? "h3" : "h4";
          return (
            <Tag key={index} className={`${size} pt-2 font-semibold ${heading}`}>
              {inline(block.text)}
            </Tag>
          );
        }
        if (block.type === "hr") return <hr key={index} className={rule} />;
        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{inline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, lineIndex) => (
              <Fragment key={lineIndex}>
                {lineIndex > 0 ? <br /> : null}
                {inline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
