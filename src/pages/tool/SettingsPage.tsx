import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useProjects, activeVersion } from "../../lib/projects";
import { useAuth } from "../../lib/auth";
import { getTemplate } from "../../lib/templates";
import { Card, CardTitle, Tag, Button } from "../../components/ui";
import { PageHeader } from "./OverviewPage";
import { IconFolder, IconFactory, IconSparkles, IconUsers, IconChart, IconFile, IconBolt, IconBox } from "../../components/icons";
import { useCompanyLogo, setCompanyLogo } from "../../lib/branding";
import {
  useAiModel, AI_MODELS, useChatProfiles, useUserProfile,
  DEFAULT_PROFILES, type ChatProfile, type UserProfile,
} from "../../lib/settingsStore";

const STATUS_TONE = { valid: "good", warning: "warn", error: "bad" } as const;
type TabId = "company" | "data" | "ai" | "profile";
const TABS: { id: TabId; label: string; icon: typeof IconFolder }[] = [
  { id: "company", label: "Company", icon: IconFactory },
  { id: "data", label: "Data", icon: IconFolder },
  { id: "ai", label: "AI assistant", icon: IconSparkles },
  { id: "profile", label: "Profile", icon: IconUsers },
];

export default function SettingsPage() {
  const { activeProject } = useProjects();
  const [tab, setTab] = useState<TabId>("company");
  if (!activeProject) return null;

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Project, data, AI assistant and your profile" />

      <div className="flex w-fit items-center gap-0.5 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-2)] p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                active ? "bg-[var(--color-surface)] text-[var(--color-brand-700)] shadow-[0_0_0_0.5px_var(--color-line-strong)]" : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
              }`}
            >
              <Icon size={15} stroke={1.8} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "company" && <CompanyTab />}
      {tab === "data" && <DataTab />}
      {tab === "ai" && <AiTab />}
      {tab === "profile" && <ProfileTab />}
    </div>
  );
}

// ---------------------------------------------------------------- Company
function CompanyTab() {
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
    <>
      <Card>
        <CardTitle>Project details</CardTitle>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 text-[13px] sm:grid-cols-2">
          <Row label="Name" value={activeProject.name} />
          <Row label="Industry" value={activeProject.industry} />
          <Row label="Factory / sites" value={activeProject.factory} />
          <Row label="Currency" value={activeProject.currency} />
        </dl>
        <p className="mt-3 text-[12.5px] text-[var(--color-ink-2)]">{activeProject.description}</p>
      </Card>

      <Card>
        <CardTitle>Company branding</CardTitle>
        <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
          Upload this company's logo — it appears in the top-left of the planner so the tool is branded for the portfolio company. The Mutares mark stays at the foot of the navigation.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-16 w-44 items-center justify-center rounded-lg border border-dashed border-[var(--color-line-strong)] bg-[var(--color-surface-2)] px-3">
            {logo ? <img src={logo} alt="Company logo" className="max-h-12 max-w-full object-contain" /> : <span className="text-[11.5px] text-[var(--color-ink-3)]">No logo set</span>}
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }} />
            <Button variant="primary" onClick={() => fileRef.current?.click()}>{logo ? "Replace logo" : "Upload logo"}</Button>
            {logo && <Button variant="ghost" onClick={() => setCompanyLogo(activeProject.id, null)}>Remove</Button>}
          </div>
        </div>
        <p className="mt-2.5 text-[11px] text-[var(--color-ink-3)]">PNG, SVG, JPG or WebP · transparent background recommended · under 1.5 MB.</p>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- Data
function DataTab() {
  const { activeProject } = useProjects();
  if (!activeProject) return null;
  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-3">
        <CardTitle>Linked data files</CardTitle>
        <Link to={`/workspace/project/${activeProject.id}`} className="text-[12px] font-medium text-[var(--color-brand-700)] hover:underline">Manage data →</Link>
      </div>
      <div className="flex flex-wrap gap-2">
        {activeProject.files.length === 0 && <span className="text-[12px] text-[var(--color-ink-3)]">No files yet — add them from the Workspace.</span>}
        {activeProject.files.map((f) => {
          const v = activeVersion(f);
          const title = getTemplate(f.templateId)?.title ?? f.templateId;
          return (
            <span key={f.templateId} className="flex items-center gap-1.5 rounded-md border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11.5px]">
              {title}
              {v && <Tag tone={STATUS_TONE[v.status]}>{v.rows.toLocaleString()} rows</Tag>}
            </span>
          );
        })}
      </div>
      <p className="mt-3 text-[12px] text-[var(--color-ink-2)]">
        The modules and dashboards compute live from these CSVs. Upload, version and validate them in the Workspace → Manage data.
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------- AI assistant
const ICON_KEYS: { key: string; Icon: typeof IconChart }[] = [
  { key: "chart", Icon: IconChart }, { key: "sparkles", Icon: IconSparkles }, { key: "file", Icon: IconFile },
  { key: "bolt", Icon: IconBolt }, { key: "box", Icon: IconBox }, { key: "users", Icon: IconUsers },
];

function AiTab() {
  const [model, setModel] = useAiModel();
  const [profiles, setProfiles] = useChatProfiles();
  const [draft, setDraft] = useState<ChatProfile[]>(profiles);
  const groups = [...new Set(AI_MODELS.map((m) => m.group))];

  function patch(i: number, p: Partial<ChatProfile>) {
    setDraft((d) => d.map((x, idx) => (idx === i ? { ...x, ...p } : x)));
  }

  return (
    <>
      <Card>
        <CardTitle>Model</CardTitle>
        <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">Choose the model that powers the assistant. Gemini models are live; others need an API key connected.</p>
        <div className="space-y-3">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">{g}</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {AI_MODELS.filter((m) => m.group === g).map((m) => {
                  const selected = m.id === model;
                  return (
                    <button
                      key={m.id}
                      disabled={!m.active}
                      onClick={() => m.active && setModel(m.id)}
                      className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)]" : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"
                      } ${!m.active ? "cursor-not-allowed opacity-55" : ""}`}
                    >
                      <span>
                        <span className="block text-[12.5px] font-medium text-[var(--color-ink)]">{m.label}</span>
                        <span className="block text-[11px] text-[var(--color-ink-3)]">{m.note}</span>
                      </span>
                      {selected && <Tag tone="good">Active</Tag>}
                      {!m.active && <Tag tone="neutral">Soon</Tag>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="mb-1 flex items-center justify-between gap-3">
          <CardTitle>Chat personas</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => { setDraft(DEFAULT_PROFILES); setProfiles(DEFAULT_PROFILES); }}>Reset</Button>
            <Button variant="primary" onClick={() => setProfiles(draft)}>Save personas</Button>
          </div>
        </div>
        <p className="mb-3 text-[12px] text-[var(--color-ink-2)]">
          Three profiles you can switch between inside the assistant — each carries its own instructions. Pick a persona by its icon in the chat to talk in that style.
        </p>
        <div className="space-y-3">
          {draft.map((p, i) => {
            const Icon = ICON_KEYS.find((k) => k.key === p.icon)?.Icon ?? IconSparkles;
            return (
              <div key={p.id} className="rounded-lg border border-[var(--color-line)] p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"><Icon size={16} /></span>
                  <input value={p.name} onChange={(e) => patch(i, { name: e.target.value })} className="w-36 rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] font-medium outline-none focus:border-[var(--color-brand-500)]" />
                  <div className="flex items-center gap-1">
                    {ICON_KEYS.map(({ key, Icon: I }) => (
                      <button key={key} onClick={() => patch(i, { icon: key })} title={key}
                        className={`flex h-7 w-7 items-center justify-center rounded-md border ${p.icon === key ? "border-[var(--color-brand-500)] bg-[var(--color-brand-50)] text-[var(--color-brand-700)]" : "border-[var(--color-line)] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"}`}>
                        <I size={14} />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  value={p.prompt}
                  onChange={(e) => patch(i, { prompt: e.target.value })}
                  rows={2}
                  className="mt-2 w-full resize-y rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-2 text-[12px] leading-relaxed outline-none focus:border-[var(--color-brand-500)]"
                  placeholder="How this persona should answer…"
                />
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

// ---------------------------------------------------------------- Profile
function ProfileTab() {
  const { user } = useAuth();
  const [profile, setProfile] = useUserProfile();
  const [draft, setDraft] = useState<UserProfile>(profile);
  const fileRef = useRef<HTMLInputElement>(null);

  function onAvatar(file: File) {
    if (file.size > 1_500_000) { alert("Please use an image under 1.5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { const next = { ...draft, avatar: reader.result as string }; setDraft(next); setProfile(next); };
    reader.readAsDataURL(file);
  }
  const set = (p: Partial<UserProfile>) => setDraft((d) => ({ ...d, ...p }));

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-3">
        <CardTitle>Your profile</CardTitle>
        <Button variant="primary" onClick={() => setProfile(draft)}>Save profile</Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[var(--color-line)] bg-[var(--color-brand-100)] text-[20px] font-semibold text-[var(--color-brand-700)]">
          {draft.avatar ? <img src={draft.avatar} alt="Avatar" className="h-full w-full object-cover" /> : (draft.fullName || user?.name || "U").slice(0, 1).toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onAvatar(f); e.target.value = ""; }} />
          <Button onClick={() => fileRef.current?.click()}>{draft.avatar ? "Change photo" : "Upload photo"}</Button>
          {draft.avatar && <Button variant="ghost" onClick={() => { const next = { ...draft, avatar: null }; setDraft(next); setProfile(next); }}>Remove</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Full name" value={draft.fullName ?? ""} onChange={(v) => set({ fullName: v })} placeholder={user?.name} />
        <Field label="Job title" value={draft.jobTitle ?? ""} onChange={(v) => set({ jobTitle: v })} placeholder="e.g. Demand Planner" />
        <Field label="Sign-in email" value={user?.email ?? ""} onChange={() => {}} disabled />
        <Field label="Company" value={draft.company ?? ""} onChange={(v) => set({ company: v })} />
        <Field label="Phone" value={draft.phone ?? ""} onChange={(v) => set({ phone: v })} />
        <Field label="Location" value={draft.location ?? ""} onChange={(v) => set({ location: v })} placeholder="City, Country" />
      </div>
      <label className="mt-3 block text-[12px] font-medium text-[var(--color-ink-2)]">About</label>
      <textarea value={draft.bio ?? ""} onChange={(e) => set({ bio: e.target.value })} rows={2} placeholder="A line about your role on this account…"
        className="mt-1 w-full resize-y rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-2 text-[12.5px] outline-none focus:border-[var(--color-brand-500)]" />
    </Card>
  );
}

// ---------------------------------------------------------------- helpers
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[var(--color-line)] pb-1.5">
      <dt className="text-[var(--color-ink-2)]">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}
function Field({ label, value, onChange, placeholder, disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-medium text-[var(--color-ink-2)]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[12.5px] outline-none focus:border-[var(--color-brand-500)] disabled:bg-[var(--color-surface-2)] disabled:text-[var(--color-ink-3)]"
      />
    </label>
  );
}
