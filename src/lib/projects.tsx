import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { getTemplate, type DataTemplate } from "./templates";
import { parseCsv, coverageGaps } from "./csv";
import { SEALINGS_CSV } from "./sampleSealings";

// ============================================================
// Projects = the "workspace" model.
// A Project groups uploaded data files, one per template type, each
// with VERSION HISTORY (new uploads supersede old ones; the active
// version is what the tool reads). Validation status + coverage are
// computed on every version so the Data Manager can show what's
// healthy, what has gaps, and what's still missing.
// ============================================================

export type FileStatus = "valid" | "warning" | "error";

export type FileVersion = {
  id: string;
  version: number;
  fileName: string;
  rows: number;
  status: FileStatus;
  uploadedAt: number;
  content: string;
  issues: string[];
  coverage?: { start: string; end: string; missing: string[] };
};

export type ProjectFile = {
  templateId: string;
  activeVersionId: string;
  versions: FileVersion[];
};

export type Project = {
  id: string;
  name: string;
  industry: string;
  factory: string;
  description: string;
  currency: string;
  createdAt: number;
  files: ProjectFile[];
};

const STORAGE_KEY = "sop_projects_v2";
const ACTIVE_KEY = "sop_active_project_v2";

let idSeq = 1;
function nextId(prefix: string) {
  return `${prefix}_${(idSeq++).toString(36)}_${Date.now().toString(36)}`;
}

/** Validate CSV text against a template; compute rows, status, coverage. */
export function buildVersion(
  template: DataTemplate,
  fileName: string,
  content: string,
  version: number,
  uploadedAt: number
): FileVersion {
  const { headers, rows } = parseCsv(content);
  const issues: string[] = [];

  const requiredCols = template.fields.filter((f) => f.required).map((f) => f.name);
  const missingCols = requiredCols.filter((c) => !headers.includes(c));
  if (missingCols.length) issues.push(`Missing required columns: ${missingCols.join(", ")}`);
  if (rows.length === 0) issues.push("File contains no data rows.");

  let coverage: FileVersion["coverage"];
  if (template.timeSeries && template.dateField && headers.includes(template.dateField)) {
    const cov = coverageGaps(content, template.dateField);
    if (cov) {
      coverage = cov;
      if (cov.missing.length)
        issues.push(`Time gap: missing ${cov.missing.length} period(s) — ${cov.missing.join(", ")}`);
    }
  }

  const status: FileStatus =
    missingCols.length || rows.length === 0
      ? "error"
      : coverage && coverage.missing.length
        ? "warning"
        : "valid";

  return {
    id: nextId("v"),
    version,
    fileName,
    rows: rows.length,
    status,
    uploadedAt,
    content,
    issues,
    coverage,
  };
}

function seedSealingsFiles(): ProjectFile[] {
  const files: ProjectFile[] = [];
  for (const [templateId, csv] of Object.entries(SEALINGS_CSV)) {
    const template = getTemplate(templateId);
    if (!template) continue;
    const v = buildVersion(template, `${templateId}.csv`, csv, 1, 0);
    files.push({ templateId, activeVersionId: v.id, versions: [v] });
  }
  return files;
}

function seedProjects(): Project[] {
  return [
    {
      id: "p_sealings",
      name: "SFC India — Sealings",
      industry: "Automotive (Sealings)",
      factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
      description:
        "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants.",
      currency: "INR",
      createdAt: 0,
      files: seedSealingsFiles(),
    },
  ];
}

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedProjects();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return seedProjects();
  }
}

// ---- helpers exposed to UI ----
export function activeVersion(file: ProjectFile): FileVersion | undefined {
  return file.versions.find((v) => v.id === file.activeVersionId);
}
export function findFile(project: Project, templateId: string): ProjectFile | undefined {
  return project.files.find((f) => f.templateId === templateId);
}

type ProjectsContextValue = {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (id: string | null) => void;
  createProject: (input: {
    name: string;
    industry: string;
    factory: string;
    description: string;
    currency: string;
  }) => string;
  deleteProject: (id: string) => void;
  addFileVersion: (projectId: string, templateId: string, fileName: string, content: string) => void;
  setActiveFileVersion: (projectId: string, templateId: string, versionId: string) => void;
  deleteFileVersion: (projectId: string, templateId: string, versionId: string) => void;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>(() => loadProjects());
  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY)
  );

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  function mutateProject(projectId: string, fn: (p: Project) => Project) {
    setProjects((prev) => prev.map((p) => (p.id === projectId ? fn(p) : p)));
  }

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      activeProject: projects.find((p) => p.id === activeId) ?? null,
      setActiveProject: (id) => {
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
        setActiveId(id);
      },
      createProject: (input) => {
        const id = nextId("p");
        setProjects((prev) => [...prev, { id, ...input, createdAt: Date.now(), files: [] }]);
        return id;
      },
      deleteProject: (id) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeId === id) {
          localStorage.removeItem(ACTIVE_KEY);
          setActiveId(null);
        }
      },
      addFileVersion: (projectId, templateId, fileName, content) => {
        const template = getTemplate(templateId);
        if (!template) return;
        mutateProject(projectId, (p) => {
          const existing = findFile(p, templateId);
          const nextVersionNum = existing ? existing.versions.length + 1 : 1;
          const version = buildVersion(template, fileName, content, nextVersionNum, Date.now());
          if (existing) {
            const updated: ProjectFile = {
              ...existing,
              activeVersionId: version.id,
              versions: [...existing.versions, version],
            };
            return { ...p, files: p.files.map((f) => (f.templateId === templateId ? updated : f)) };
          }
          return {
            ...p,
            files: [...p.files, { templateId, activeVersionId: version.id, versions: [version] }],
          };
        });
      },
      setActiveFileVersion: (projectId, templateId, versionId) => {
        mutateProject(projectId, (p) => ({
          ...p,
          files: p.files.map((f) =>
            f.templateId === templateId ? { ...f, activeVersionId: versionId } : f
          ),
        }));
      },
      deleteFileVersion: (projectId, templateId, versionId) => {
        mutateProject(projectId, (p) => {
          const file = findFile(p, templateId);
          if (!file) return p;
          const versions = file.versions.filter((v) => v.id !== versionId);
          if (versions.length === 0) {
            return { ...p, files: p.files.filter((f) => f.templateId !== templateId) };
          }
          const activeVersionId = versions.some((v) => v.id === file.activeVersionId)
            ? file.activeVersionId
            : versions[versions.length - 1].id;
          return {
            ...p,
            files: p.files.map((f) =>
              f.templateId === templateId ? { ...f, versions, activeVersionId } : f
            ),
          };
        });
      },
    }),
    [projects, activeId]
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjects() {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjects must be used within ProjectsProvider");
  return ctx;
}
