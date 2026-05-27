import { useMemo } from "react";
import { Check } from "lucide-react";

/**
 * PremiumMarkdown — renderer custom de markdown para el Builder.
 * NO usa prose. Cada bloque del markdown se renderiza como un componente
 * styled premium (cards, tablas reales, checklists con checkbox UI, etc.).
 *
 * Parsea sin dependencias externas — soporta:
 *  - Headings (# ## ###)
 *  - Listas numeradas (1. **Title** + contenido siguiente) → cards numeradas
 *  - Listas con bullets (- item) → cards con icono
 *  - Checklists ([ ] / [x] item) → checkbox UI
 *  - Tablas (| col | col |) → tabla con header violeta + zebra rows
 *  - Code blocks (```lang ... ```) → panel oscuro monospace
 *  - Inline: **bold**, *italic*, `code`
 */

type Block =
  | { type: "h1" | "h2" | "h3"; text: string }
  | { type: "p"; text: string }
  | {
      type: "numbered_list";
      items: { num: string; title: string; content: string }[];
    }
  | { type: "bullet_list"; items: string[] }
  | { type: "checklist"; items: { checked: boolean; text: string }[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; lang: string; content: string }
  | { type: "hr" };

function parseMarkdown(content: string): Block[] {
  const lines = content.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // Skip blank
    if (!line) {
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(---+|\*\*\*+)$/.test(line)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    // Heading
    const head = line.match(/^(#{1,3})\s+(.+)$/);
    if (head) {
      const level = head[1].length as 1 | 2 | 3;
      blocks.push({ type: (`h${level}` as "h1" | "h2" | "h3"), text: head[2].trim() });
      i++;
      continue;
    }

    // Code block
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push({ type: "code", lang, content: codeLines.join("\n") });
      continue;
    }

    // Table (line starts with |, next line is separator |---|)
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const parseRow = (l: string) =>
        l
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2).map(parseRow); // skip separator row
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Checklist
    if (/^[-*]\s+\[[ x]\]\s+/i.test(line)) {
      const items: { checked: boolean; text: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*]\s+\[([ x])\]\s+(.+)$/i);
        if (!m) break;
        items.push({ checked: m[1].toLowerCase() === "x", text: m[2] });
        i++;
      }
      blocks.push({ type: "checklist", items });
      continue;
    }

    // Numbered list — captures multiline content per item until next number or blank-break
    if (/^\d+\.\s+/.test(line)) {
      const items: { num: string; title: string; content: string }[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^(\d+)\.\s+(.+)$/);
        if (!m) break;
        const num = m[1];
        const title = m[2];
        const contentLines: string[] = [];
        i++;
        // Consume continuation lines (not next numbered item, not heading, not blank+blank)
        while (i < lines.length) {
          const next = lines[i];
          const nextTrim = next.trim();
          if (/^\d+\.\s+/.test(nextTrim)) break;
          if (/^#{1,3}\s+/.test(nextTrim)) break;
          if (/^(---+|\*\*\*+)$/.test(nextTrim)) break;
          if (nextTrim.startsWith("```")) break;
          // Stop at empty line followed by structure
          if (!nextTrim) {
            // Peek next non-empty
            let j = i + 1;
            while (j < lines.length && !lines[j].trim()) j++;
            if (j >= lines.length) break;
            const peek = lines[j].trim();
            if (/^(\d+\.\s+|#{1,3}\s+|\|.*\||```)/.test(peek)) break;
          }
          contentLines.push(next);
          i++;
        }
        items.push({ num, title, content: contentLines.join("\n").trim() });
      }
      blocks.push({ type: "numbered_list", items });
      continue;
    }

    // Bullet list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = lines[i].trim().match(/^[-*]\s+(.+)$/);
        if (!m) break;
        // Skip if it's actually a checklist (shouldn't happen here, handled above)
        if (/^\[[ x]\]\s+/i.test(m[1])) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ type: "bullet_list", items });
      continue;
    }

    // Paragraph — consume consecutive non-empty non-structural lines
    const paraLines: string[] = [line];
    i++;
    while (i < lines.length) {
      const next = lines[i].trim();
      if (
        !next ||
        /^#{1,3}\s+/.test(next) ||
        next.startsWith("```") ||
        /^(\d+\.\s+|[-*]\s+|\|.*\|)/.test(next) ||
        /^(---+|\*\*\*+)$/.test(next)
      )
        break;
      paraLines.push(next);
      i++;
    }
    blocks.push({ type: "p", text: paraLines.join(" ") });
  }

  return blocks;
}

/** Renderer de markdown inline (**bold**, *italic*, `code`) en JSX. */
function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`)/g;
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIdx) parts.push(text.slice(lastIdx, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(
        <strong key={key++} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      parts.push(
        <code
          key={key++}
          className="rounded px-1.5 py-0.5 text-[12px] font-mono"
          style={{
            background: "var(--violet-pill-bg)",
            color: "var(--violet-text-strong)",
          }}
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <em key={key++} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    lastIdx = m.index + tok.length;
  }
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

function PremiumBlock({ block, idx }: { block: Block; idx: number }) {
  switch (block.type) {
    case "h1":
      return (
        <h1
          key={idx}
          className="text-[28px] font-bold tracking-[-0.015em] text-foreground mt-2 mb-4"
        >
          {renderInline(block.text)}
        </h1>
      );
    case "h2":
      return (
        <h2
          key={idx}
          className="text-[22px] font-bold tracking-[-0.01em] text-foreground mt-8 mb-3 pb-2 border-b border-border"
        >
          {renderInline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={idx}
          className="text-[16px] font-semibold tracking-tight text-foreground mt-5 mb-2"
        >
          {renderInline(block.text)}
        </h3>
      );

    case "p":
      return (
        <p
          key={idx}
          className="text-[14px] leading-relaxed text-muted-foreground my-3"
        >
          {renderInline(block.text)}
        </p>
      );

    case "numbered_list":
      return (
        <div key={idx} className="grid gap-3 my-5">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="app-card flex items-start gap-4 p-5"
            >
              {/* Numbered badge violeta */}
              <div
                className="flex-none flex h-10 w-10 items-center justify-center rounded-full font-mono text-[13px] font-bold tabular-nums"
                style={{
                  background: "var(--violet-pill-bg)",
                  border: "1px solid var(--violet-border)",
                  color: "var(--violet-text-strong)",
                }}
              >
                {item.num.padStart(2, "0")}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-[15px] font-semibold text-foreground mb-1">
                  {renderInline(item.title)}
                </h4>
                {item.content && (
                  <div className="text-[13px] leading-relaxed text-muted-foreground space-y-2">
                    {item.content.split("\n").map((para, j) => {
                      const t = para.trim();
                      if (!t) return null;
                      // Sub-bullet inside numbered item
                      const bul = t.match(/^[-*]\s+(.+)$/);
                      if (bul) {
                        return (
                          <div key={j} className="flex items-start gap-2">
                            <span
                              className="mt-1.5 h-1 w-1 rounded-full flex-none"
                              style={{ background: "var(--violet-text)" }}
                            />
                            <span>{renderInline(bul[1])}</span>
                          </div>
                        );
                      }
                      return <p key={j}>{renderInline(t)}</p>;
                    })}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      );

    case "bullet_list":
      return (
        <ul key={idx} className="my-4 space-y-2">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-[14px] leading-relaxed text-muted-foreground"
            >
              <span
                className="mt-2 h-1.5 w-1.5 rounded-full flex-none"
                style={{ background: "var(--violet-text)" }}
              />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );

    case "checklist":
      return (
        <div key={idx} className="grid gap-2 my-5">
          {block.items.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg p-3 transition-colors"
              style={{
                border: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              <div
                className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded"
                style={{
                  background: item.checked ? "var(--violet-text)" : "transparent",
                  border: item.checked
                    ? "1px solid var(--violet-text)"
                    : "1.5px solid var(--violet-border)",
                }}
              >
                {item.checked && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
              </div>
              <div
                className={`text-[14px] leading-relaxed ${
                  item.checked ? "line-through opacity-60" : "text-foreground"
                }`}
              >
                {renderInline(item.text)}
              </div>
            </div>
          ))}
        </div>
      );

    case "table":
      return (
        <div
          key={idx}
          className="my-5 overflow-x-auto rounded-xl"
          style={{ border: "1px solid var(--border)" }}
        >
          <table className="w-full text-[13px] border-collapse">
            <thead>
              <tr style={{ background: "var(--violet-pill-bg)" }}>
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    className="text-left px-4 py-3 text-[11px] font-semibold tracking-[0.12em] uppercase"
                    style={{ color: "var(--violet-text-strong)" }}
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr
                  key={i}
                  style={{
                    borderTop: "1px solid var(--border)",
                    background: i % 2 === 0 ? "transparent" : "var(--cta-ghost-bg)",
                  }}
                >
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className="px-4 py-3 text-foreground align-top leading-relaxed"
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "code":
      return (
        <pre
          key={idx}
          className="my-4 overflow-x-auto rounded-lg p-4 text-[12px] font-mono leading-relaxed"
          style={{
            background: "var(--cta-ghost-bg)",
            border: "1px solid var(--border)",
            color: "var(--foreground)",
          }}
        >
          {block.lang && (
            <div
              className="mb-2 text-[10px] font-semibold tracking-[0.15em] uppercase"
              style={{ color: "var(--violet-text)" }}
            >
              {block.lang}
            </div>
          )}
          <code>{block.content}</code>
        </pre>
      );

    case "hr":
      return (
        <div
          key={idx}
          className="my-8 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, var(--border) 20%, var(--border) 80%, transparent)",
          }}
        />
      );

    default:
      return null;
  }
}

export function PremiumMarkdown({ content }: { content: string }) {
  const blocks = useMemo(() => parseMarkdown(content), [content]);
  return (
    <div>
      {blocks.map((b, i) => (
        <PremiumBlock key={i} block={b} idx={i} />
      ))}
    </div>
  );
}
