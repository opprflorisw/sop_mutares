import { Fragment, type ReactNode } from "react";

// ============================================================
// Lightweight markdown for the AI assistant — supports **bold**,
// `code`, numbered + bulleted lists, ### headings and [links](href).
// Links whose href starts with "/" are treated as in-app routes and
// navigated through onLink (react-router); others open in a new tab.
// ============================================================

function inline(s: string, onLink: (href: string) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) nodes.push(<Fragment key={key++}>{s.slice(last, m.index)}</Fragment>);
    if (m[1] !== undefined) {
      const label = m[1];
      const href = m[2];
      if (href.startsWith("/")) {
        nodes.push(
          <button
            key={key++}
            onClick={() => onLink(href)}
            className="font-medium text-[var(--color-brand-700)] underline decoration-[var(--color-brand-300)] underline-offset-2 hover:decoration-[var(--color-brand-600)]"
          >
            {label}
          </button>
        );
      } else {
        nodes.push(
          <a key={key++} href={href} target="_blank" rel="noreferrer" className="font-medium text-[var(--color-brand-700)] underline underline-offset-2">
            {label}
          </a>
        );
      }
    } else if (m[3] !== undefined) {
      nodes.push(<strong key={key++} className="font-semibold text-[var(--color-ink)]">{m[3]}</strong>);
    } else if (m[4] !== undefined) {
      nodes.push(<code key={key++} className="rounded bg-[var(--color-surface-3)] px-1 py-0.5 text-[11px]">{m[4]}</code>);
    }
    last = re.lastIndex;
  }
  if (last < s.length) nodes.push(<Fragment key={key++}>{s.slice(last)}</Fragment>);
  return nodes;
}

export default function ChatMarkdown({ text, onLink }: { text: string; onLink: (href: string) => void }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let bk = 0;

  const flush = () => {
    if (!list) return;
    const items = list.items.map((it, i) => (
      <li key={i} className="leading-relaxed">{inline(it, onLink)}</li>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={`b${bk++}`} className="ml-4 list-decimal space-y-1">{items}</ol>
      ) : (
        <ul key={`b${bk++}`} className="ml-4 list-disc space-y-1 marker:text-[var(--color-brand-500)]">{items}</ul>
      )
    );
    list = null;
  };

  for (const raw of lines) {
    const t = raw.trim();
    if (!t) { flush(); continue; }
    const ol = t.match(/^\d+[.)]\s+(.*)$/);
    const ul = t.match(/^[-*•]\s+(.*)$/);
    if (ol) {
      if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; }
      list.items.push(ol[1]);
      continue;
    }
    if (ul) {
      if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; }
      list.items.push(ul[1]);
      continue;
    }
    flush();
    if (/^#{1,3}\s/.test(t)) {
      blocks.push(<div key={`b${bk++}`} className="pt-0.5 text-[12.5px] font-semibold text-[var(--color-ink)]">{inline(t.replace(/^#{1,3}\s/, ""), onLink)}</div>);
    } else {
      blocks.push(<p key={`b${bk++}`} className="leading-relaxed">{inline(t, onLink)}</p>);
    }
  }
  flush();

  return <div className="space-y-1.5">{blocks}</div>;
}
