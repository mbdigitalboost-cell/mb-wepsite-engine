/**
 * Faz 33 — yasal metinler için KÜÇÜK markdown alt kümesi (saf; testli).
 * Yeni bağımlılık eklenmedi. Desteklenen: # / ## / ### başlık, paragraf
 * (satır sonları korunur), "- " liste, "---" ayraç, **kalın**,
 * [metin](bağlantı). Bağlantı yalnız "/", "https://", "mailto:", "tel:"
 * ile başlıyorsa bağlantı olur; değilse düz metin kalır (HTML hiç
 * yorumlanmaz — React metni kaçışlar).
 */

export type LegalBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "paragraph"; lines: string[] }
  | { type: "list"; items: string[] }
  | { type: "hr" };

export type LegalInline = { type: "text"; text: string } | { type: "bold"; text: string } | { type: "link"; text: string; href: string };

export function parseLegalMarkdown(source: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  let paragraph: string[] = [];
  let list: string[] = [];

  const flush = () => {
    if (paragraph.length > 0) blocks.push({ type: "paragraph", lines: paragraph });
    if (list.length > 0) blocks.push({ type: "list", items: list });
    paragraph = [];
    list = [];
  };

  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (line.trim() === "") {
      flush();
      continue;
    }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: "heading", level: heading[1].length as 1 | 2 | 3, text: heading[2].trim() });
      continue;
    }
    if (/^-{3,}$/.test(line.trim())) {
      flush();
      blocks.push({ type: "hr" });
      continue;
    }
    const item = /^\s*[-*]\s+(.+)$/.exec(line);
    if (item) {
      if (paragraph.length > 0) {
        blocks.push({ type: "paragraph", lines: paragraph });
        paragraph = [];
      }
      list.push(item[1]);
      continue;
    }
    if (list.length > 0) {
      blocks.push({ type: "list", items: list });
      list = [];
    }
    paragraph.push(line.trim());
  }
  flush();
  return blocks;
}

const SAFE_HREF = /^(\/(?!\/)|https:\/\/|mailto:|tel:)/;

export function parseLegalInline(text: string): LegalInline[] {
  const out: LegalInline[] = [];
  const pattern = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ type: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) out.push({ type: "bold", text: match[1] });
    else if (SAFE_HREF.test(match[3])) out.push({ type: "link", text: match[2], href: match[3] });
    else out.push({ type: "text", text: match[2] });
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}
