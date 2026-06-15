import { useEffect, useMemo } from "react";
import { parseCsv, triggerDownload } from "../lib/csv";
import type { DataTemplate } from "../lib/templates";
import type { FileVersion } from "../lib/projects";
import { Tag } from "./ui";
import { IconDownload } from "./icons";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;
const MAX_ROWS = 300;

export default function CsvModal({
  template,
  version,
  onClose,
}: {
  template: DataTemplate;
  version: FileVersion;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { headers, rows } = useMemo(() => parseCsv(version.content), [version.content]);
  const required = new Set(template.fields.filter((f) => f.required).map((f) => f.name));
  const known = new Set(template.fields.map((f) => f.name));
  const shown = rows.slice(0, MAX_ROWS);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--color-line)] bg-[var(--color-surface)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--color-line)] px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold">{template.title}</span>
              <span className="font-mono text-[11px] text-[var(--color-ink-3)]">{version.fileName}</span>
              <Tag tone={STATUS_TONE[version.status]}>{version.status}</Tag>
            </div>
            <div className="text-[11px] text-[var(--color-ink-2)]">
              v{version.version} · {rows.length.toLocaleString()} rows · {headers.length} columns
              {version.coverage && <> · {version.coverage.start}…{version.coverage.end}</>}
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => triggerDownload(version.fileName, version.content)}
              className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1.5 text-[12px] hover:bg-[var(--color-surface-2)]"
            >
              <IconDownload size={14} /> Download CSV
            </button>
            <button onClick={onClose} className="rounded-md px-2 py-1 text-[20px] leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)]" aria-label="Close">×</button>
          </div>
        </div>

        {/* legend + issues */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[var(--color-line)] bg-[var(--color-surface-2)] px-4 py-2 text-[11px] text-[var(--color-ink-2)]">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-[var(--color-brand-100)] ring-1 ring-[var(--color-brand-300)]" /> required column
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-sm bg-[#FCEBEB] ring-1 ring-[#E8BCBC]" /> not in template
          </span>
          {version.issues.length > 0 && (
            <span className="text-[var(--color-warn)]">⚠ {version.issues.join(" · ")}</span>
          )}
        </div>

        {/* table */}
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full border-collapse text-[12px]">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border-b border-r border-[var(--color-line)] bg-[var(--color-surface-2)] px-2 py-1.5 text-right text-[10px] font-medium text-[var(--color-ink-3)]">#</th>
                {headers.map((h) => {
                  const isReq = required.has(h);
                  const isUnknown = !known.has(h);
                  return (
                    <th
                      key={h}
                      className={`border-b border-r border-[var(--color-line)] px-3 py-1.5 text-left font-semibold ${
                        isReq ? "bg-[var(--color-brand-100)] text-[var(--color-brand-800)]"
                        : isUnknown ? "bg-[#FCEBEB] text-[#A32D2D]"
                        : "bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                      }`}
                    >
                      <span className="font-mono text-[11px]">{h}</span>
                      {isReq && <span className="ml-1 align-middle text-[9px] font-normal text-[var(--color-brand-600)]">req</span>}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {shown.map((row, ri) => (
                <tr key={ri} className="hover:bg-[var(--color-surface-2)]">
                  <td className="border-b border-r border-[var(--color-line)] px-2 py-1 text-right text-[10px] text-[var(--color-ink-3)]">{ri + 1}</td>
                  {headers.map((h) => (
                    <td
                      key={h}
                      className={`border-b border-r border-[var(--color-line)] px-3 py-1 ${required.has(h) ? "bg-[var(--color-brand-50)] font-medium" : ""}`}
                    >
                      {row[h]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length > MAX_ROWS && (
          <div className="border-t border-[var(--color-line)] px-4 py-2 text-[11px] text-[var(--color-ink-3)]">
            Showing first {MAX_ROWS} of {rows.length.toLocaleString()} rows. Download for the full file.
          </div>
        )}
      </div>
    </div>
  );
}
