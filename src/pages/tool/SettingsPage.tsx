import { useProjects, activeVersion } from "../../lib/projects";
import { getTemplate } from "../../lib/templates";
import { Card, CardTitle, Tag, PlaceholderNote } from "../../components/ui";
import { PageHeader } from "./OverviewPage";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;

export default function SettingsPage() {
  const { activeProject } = useProjects();
  if (!activeProject) return null;

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

      <PlaceholderNote phase="Phase 1+">
        Project settings, KPI targets, thresholds and team access move here as the
        backend (Convex) comes online.
      </PlaceholderNote>
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
