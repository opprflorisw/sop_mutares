import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { runDataCheck } from "../lib/dataCheck";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import {
  IconArrowRight,
  IconPlus,
  IconFile,
  IconFolder,
  IconSettings,
} from "../components/icons";

export default function WorkspacePage() {
  const { projects, setActiveProject, createProject, deleteProject } = useProjects();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);

  function open(id: string) {
    setActiveProject(id);
    navigate("/tool/overview");
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-brand-800)] to-[var(--color-brand-600)] p-6 text-white">
        <h1 className="text-[22px] font-semibold">Projects & Data</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-white/75">
          Each project is one company's scenario. Manage its data files —
          upload, version, validate and check for gaps — then open the S&OP tool.
          Consistent input means consistent, board-ready output.
        </p>
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">Your projects</h2>
          <Button variant="primary" onClick={() => setShowNew((s) => !s)}>
            <IconPlus size={15} /> New project
          </Button>
        </div>

        {showNew && (
          <NewProjectForm
            onCancel={() => setShowNew(false)}
            onCreate={(input) => {
              const id = createProject(input);
              setShowNew(false);
              navigate(`/workspace/project/${id}`);
            }}
          />
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const check = runDataCheck(p);
            return (
              <Card key={p.id} className="flex flex-col">
                <div className="flex items-start justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                    <IconFolder size={18} />
                  </div>
                  <Tag tone="info">{p.industry}</Tag>
                </div>
                <h3 className="mt-3 text-[14px] font-semibold">{p.name}</h3>
                <p className="mt-1 line-clamp-2 flex-1 text-[12px] text-[var(--color-ink-2)]">
                  {p.description}
                </p>

                <div className="mt-3 flex items-center gap-3 text-[11px] text-[var(--color-ink-3)]">
                  <span className="flex items-center gap-1">
                    <IconFile size={13} /> {p.files.length} files
                  </span>
                  <span className="flex items-center gap-1">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background:
                          check.score >= 80 ? "#1d9e75" : check.score >= 50 ? "#ef9f27" : "#e24b4a",
                      }}
                    />
                    {check.score}/100 ready
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <Button variant="primary" onClick={() => open(p.id)}>
                    Open <IconArrowRight size={14} />
                  </Button>
                  <Button onClick={() => navigate(`/workspace/project/${p.id}`)}>
                    <IconSettings size={14} /> Manage data
                  </Button>
                  {p.id !== "p_sealings" && (
                    <Button variant="ghost" onClick={() => deleteProject(p.id)}>
                      Delete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      <p className="text-[12px] text-[var(--color-ink-3)]">
        Tip: open <strong>Manage data</strong> on the Sealings project to see the
        file setup, version history, downloads and the AI data check in action.
      </p>
    </div>
  );
}

function NewProjectForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (input: {
    name: string;
    industry: string;
    factory: string;
    description: string;
    currency: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [factory, setFactory] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("EUR");

  return (
    <Card className="mb-4">
      <CardTitle>New project</CardTitle>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onCreate({ name, industry, factory, description, currency });
        }}
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        <Field label="Project name">
          <input value={name} onChange={(e) => setName(e.target.value)} required className={inputCls} placeholder="ElectroTech — EU" />
        </Field>
        <Field label="Industry / scenario">
          <input value={industry} onChange={(e) => setIndustry(e.target.value)} required className={inputCls} placeholder="Electronics manufacturing" />
        </Field>
        <Field label="Factory / sites">
          <input value={factory} onChange={(e) => setFactory(e.target.value)} className={inputCls} placeholder="Lyon, Karlsruhe, Berlin" />
        </Field>
        <Field label="Currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            <option>EUR</option>
            <option>USD</option>
            <option>INR</option>
            <option>GBP</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputCls} min-h-[64px]`} placeholder="Short background on the factory and planning context." />
          </Field>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" variant="primary">
            Create & manage data
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}

const inputCls =
  "w-full rounded-md border border-[var(--color-line-strong)] bg-[var(--color-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-brand-500)]";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-2)]">{label}</span>
      {children}
    </label>
  );
}
