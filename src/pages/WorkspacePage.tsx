import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { TEMPLATES, templateToCsv, type DataTemplate } from "../lib/templates";
import { Card, CardTitle, Button, Tag } from "../components/ui";
import {
  IconArrowRight,
  IconPlus,
  IconDownload,
  IconUpload,
  IconFile,
  IconFolder,
} from "../components/icons";

function downloadCsv(t: DataTemplate) {
  const blob = new Blob([templateToCsv(t)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.file;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WorkspacePage() {
  const { projects, setActiveProject, createProject, deleteProject } =
    useProjects();
  const navigate = useNavigate();
  const [showNew, setShowNew] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DataTemplate>(
    TEMPLATES[0]
  );

  function open(id: string) {
    setActiveProject(id);
    navigate("/tool/overview");
  }

  return (
    <div className="space-y-7">
      {/* Hero */}
      <div className="overflow-hidden rounded-xl border border-[var(--color-line)] bg-gradient-to-br from-[var(--color-brand-800)] to-[var(--color-brand-600)] p-6 text-white">
        <h1 className="text-[22px] font-semibold">Workspace</h1>
        <p className="mt-1 max-w-2xl text-[13.5px] text-white/75">
          Pick a project to open the S&OP tool, or set up a new scenario. Upload
          your data using the standard templates below — consistent input means
          consistent, board-ready output.
        </p>
      </div>

      {/* Projects */}
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
              open(id);
            }}
          />
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
                  <IconFolder size={18} />
                </div>
                <Tag tone="info">{p.industry}</Tag>
              </div>
              <h3 className="mt-3 text-[14px] font-semibold">{p.name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-[12px] text-[var(--color-ink-2)]">
                {p.description}
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--color-ink-3)]">
                <IconFile size={13} /> {p.files.length} files · {p.currency}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Button variant="primary" onClick={() => open(p.id)}>
                  Open <IconArrowRight size={14} />
                </Button>
                {p.id !== "p_sealings" && (
                  <Button variant="ghost" onClick={() => deleteProject(p.id)}>
                    Delete
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* File Explorer / Templates */}
      <section>
        <div className="mb-3">
          <h2 className="text-[15px] font-semibold">Data templates & files</h2>
          <p className="text-[12.5px] text-[var(--color-ink-2)]">
            Download a template, fill it with your data, and upload it. Uploads
            are validated against the template so the tool always reads them
            correctly.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[320px_1fr]">
          {/* file list */}
          <Card pad={false}>
            <div className="border-b border-[var(--color-line)] px-3.5 py-2.5 text-[12px] font-semibold text-[var(--color-ink-2)]">
              Template library
            </div>
            <ul className="max-h-[420px] overflow-y-auto py-1">
              {TEMPLATES.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setSelectedTemplate(t)}
                    className={`flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] ${
                      selectedTemplate.id === t.id
                        ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
                        : "text-[var(--color-ink)] hover:bg-[var(--color-surface-2)]"
                    }`}
                  >
                    <IconFile size={15} />
                    <span className="flex-1">{t.title}</span>
                    <Tag
                      tone={
                        t.module === "Master"
                          ? "neutral"
                          : t.module === "Demand"
                            ? "info"
                            : t.module === "Supply"
                              ? "accent"
                              : "warn"
                      }
                    >
                      {t.module}
                    </Tag>
                  </button>
                </li>
              ))}
            </ul>
          </Card>

          {/* template detail */}
          <Card>
            <CardTitle
              right={
                <div className="flex gap-2">
                  <Button onClick={() => downloadCsv(selectedTemplate)}>
                    <IconDownload size={14} /> Template
                  </Button>
                  <Button variant="primary" disabled>
                    <IconUpload size={14} /> Upload
                  </Button>
                </div>
              }
            >
              {selectedTemplate.title}{" "}
              <span className="font-mono text-[11px] font-normal text-[var(--color-ink-3)]">
                {selectedTemplate.file}
              </span>
            </CardTitle>
            <p className="-mt-1 mb-3 text-[12.5px] text-[var(--color-ink-2)]">
              {selectedTemplate.description}
            </p>
            <div className="overflow-x-auto rounded-lg border border-[var(--color-line)]">
              <table className="w-full text-[12px]">
                <thead className="bg-[var(--color-surface-2)] text-left text-[11px] text-[var(--color-ink-2)]">
                  <tr>
                    <th className="px-3 py-2 font-medium">Column</th>
                    <th className="px-3 py-2 font-medium">Type</th>
                    <th className="px-3 py-2 font-medium">Req.</th>
                    <th className="px-3 py-2 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedTemplate.fields.map((f) => (
                    <tr
                      key={f.name}
                      className="border-t border-[var(--color-line)]"
                    >
                      <td className="px-3 py-1.5 font-mono text-[11.5px]">
                        {f.name}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--color-ink-2)]">
                        {f.type}
                        {f.enumValues
                          ? ` (${f.enumValues.join(" | ")})`
                          : ""}
                      </td>
                      <td className="px-3 py-1.5">
                        {f.required ? (
                          <Tag tone="bad">required</Tag>
                        ) : (
                          <Tag tone="neutral">optional</Tag>
                        )}
                      </td>
                      <td className="px-3 py-1.5 text-[var(--color-ink-2)]">
                        {f.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-[var(--color-ink-3)]">
              Upload + validation lands in Phase 1. For now, download the
              template to see the exact required format.
            </p>
          </Card>
        </div>
      </section>
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
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className={inputCls}
            placeholder="ElectroTech — EU"
          />
        </Field>
        <Field label="Industry / scenario">
          <input
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            required
            className={inputCls}
            placeholder="Electronics manufacturing"
          />
        </Field>
        <Field label="Factory / sites">
          <input
            value={factory}
            onChange={(e) => setFactory(e.target.value)}
            className={inputCls}
            placeholder="Lyon, Karlsruhe, Berlin"
          />
        </Field>
        <Field label="Currency">
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputCls}
          >
            <option>EUR</option>
            <option>USD</option>
            <option>INR</option>
            <option>GBP</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={`${inputCls} min-h-[64px]`}
              placeholder="Short background on the factory and planning context."
            />
          </Field>
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit" variant="primary">
            Create & open
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-2)]">
        {label}
      </span>
      {children}
    </label>
  );
}
