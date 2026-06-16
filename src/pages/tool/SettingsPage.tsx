import { useRef } from "react";
import { useProjects, activeVersion } from "../../lib/projects";
import { getTemplate } from "../../lib/templates";
import { Card, CardTitle, Tag, Button } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { useCompanyLogo, setCompanyLogo } from "../../lib/branding";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;

export default function SettingsPage() {
  const { activeProject } = useProjects();
  const logo = useCompanyLogo(activeProject?.id);
  const fileRef = useRef<HTMLInputElement>(null);
  if (!activeProject) return null;

  function onLogo(file: File) {
    if (!activeProject) return;
    if (file.size > 1_500_000) { alert("Please use an image under 1.5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => setCompanyLogo(activeProject.id, reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Project configuration" />

      <Card>
        <CardTitle>Project details</CardTitle>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
          <Row label="Name" value={activeProject.name} />
          <Row label="Industry" value={activeProject.industry} />
          <Row label="Factory / sites" value={activeProject.factory} />
          <Row label="Currency" value={activeProject.currency} />
        </dl>
        <p className="mt-3 text-[12.5px] text-[var(--color-ink-2)]">
          {activeProject.description}
        </p>
      </Card>

      <Card>
        <CardTitle>Company branding</CardTitle>
        <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
          Upload this company's logo — it appears in the top-left of the planner so the tool is branded for the portfolio company. The Mutares mark stays at the foot of the navigation.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-44 items-center justify-center rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3">
            {logo ? (
              <img src={logo} alt="Company logo" className="max-h-12 max-w-full object-contain" />
            ) : (
              <span className="text-[11.5px] text-[var(--color-ink-3)]">No logo set</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }}
            />
            <Button variant="primary" onClick={() => fileRef.current?.click()}>{logo ? "Replace logo" : "Upload logo"}</Button>
            {logo && <Button variant="ghost" onClick={() => setCompanyLogo(activeProject.id, null)}>Remove</Button>}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-[var(--color-ink-3)]">PNG, SVG, JPG or WebP · transparent background recommended · under 1.5 MB.</p>
      </Card>

      <Card>
        <CardTitle>Linked data files</CardTitle>
        <div className="flex flex-wrap gap-2">
          {activeProject.files.length === 0 && (
            <span className="text-[12px] text-[var(--color-ink-3)]">
              No files yet — add them from the Workspace.
            </span>
          )}
          {activeProject.files.map((f) => {
            const v = activeVersion(f);
            const title = getTemplate(f.templateId)?.title ?? f.templateId;
            return (
              <span key={f.templateId} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11.5px]">
                {title}
                {v && (
                  <Tag tone={STATUS_TONE[v.status]}>
                    {v.rows.toLocaleString()} rows
                  </Tag>
                )}
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-line)] pb-1.5">
      <dt className="text-[var(--color-ink-2)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
