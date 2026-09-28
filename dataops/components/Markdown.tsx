"use client";
import React from "react";

/** Tiny, dependency-free markdown renderer for agent answers */
function inline(text: string, key: string | number): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) parts.push(<strong key={`${key}-${i++}`}>{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) parts.push(<code key={`${key}-${i++}`}>{t.slice(1, -1)}</code>);
    else parts.push(<em key={`${key}-${i++}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  let k = 0; // unique block keys (line indices can collide between blocks)
  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const buf: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) buf.push(lines[i++]);
      i++;
      out.push(
        <pre key={k++} data-lang={lang}>
          <code>{buf.join("\n")}</code>
        </pre>
      );
      continue;
    }
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) {
      const head = line.split("|").slice(1, -1).map((s) => s.trim());
      i += 2;
      const body: string[][] = [];
      while (i < lines.length && lines[i].startsWith("|")) body.push(lines[i++].split("|").slice(1, -1).map((s) => s.trim()));
      out.push(
        <div key={k++} className="overflow-x-auto">
          <table>
            <thead><tr>{head.map((h, j) => <th key={j}>{inline(h, j)}</th>)}</tr></thead>
            <tbody>{body.map((r, j) => <tr key={j}>{r.map((c, k) => <td key={k}>{inline(c, k)}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (/^#{1,4}\s/.test(line)) {
      out.push(<h3 key={k++}>{inline(line.replace(/^#+\s/, ""), i)}</h3>);
      i++;
      continue;
    }
    if (/^\s*[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s/, ""));
      out.push(<ul key={k++}>{items.map((t, j) => <li key={j}>{inline(t, j)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s/, ""));
      out.push(<ol key={k++}>{items.map((t, j) => <li key={j}>{inline(t, j)}</li>)}</ol>);
      continue;
    }
    if (line.trim()) out.push(<p key={k++}>{inline(line, i)}</p>);
    i++;
  }
  return <div className="prose-ai text-[13.5px]">{out}</div>;
}
