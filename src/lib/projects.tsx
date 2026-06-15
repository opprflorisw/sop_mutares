import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { getTemplate, type DataTemplate } from "./templates";
import { parseCsv, coverageGaps } from "./csv";

// ============================================================
// Projects = the "workspace" model, now backed by Convex.
// A Project groups uploaded data files, one per template type, each
// with VERSION HISTORY. Convex stores one row per version; the
// provider receives them already grouped (see convex/projects.ts).
// localStorage only holds UI state (which project is active).
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
  background?: string;
  currency: string;
  createdAt: number;
  files: ProjectFile[];
};

const ACTIVE_KEY = "sop_active_project_v2";

/** Validate CSV text against a template; compute rows, status, coverage. */
export function analyzeCsv(template: DataTemplate, content: string): {
  rows: number;
  status: FileStatus;
  issues: string[];
  coverage?: { start: string; end: string; missing: string[] };
} {
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

  return { rows: rows.length, status, issues, coverage };
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
  loading: boolean;
  activeProject: Project | null;
  setActiveProject: (id: string | null) => void;
  createProject: (input: {
    name: string;
    industry: string;
    factory: string;
    description: string;
    background?: string;
    currency: string;
  }) => Promise<string>;
  deleteProject: (id: string) => Promise<void>;
  addFileVersion: (projectId: string, templateId: string, fileName: string, content: string) => Promise<void>;
  setActiveFileVersion: (projectId: string, templateId: string, versionId: string) => Promise<void>;
  deleteFileVersion: (projectId: string, templateId: string, versionId: string) => Promise<void>;
};

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const data = useQuery(api.projects.listWithFiles);
  const projects = (data ?? []) as Project[];
  const loading = data === undefined;

  const createMut = useMutation(api.projects.create);
  const removeMut = useMutation(api.projects.remove);
  const addMut = useMutation(api.projects.addFileVersion);
  const setActiveMut = useMutation(api.projects.setActiveVersion);
  const deleteMut = useMutation(api.projects.deleteVersion);

  const [activeId, setActiveId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY)
  );

  const value = useMemo<ProjectsContextValue>(
    () => ({
      projects,
      loading,
      activeProject: projects.find((p) => p.id === activeId) ?? null,
      setActiveProject: (id) => {
        if (id) localStorage.setItem(ACTIVE_KEY, id);
        else localStorage.removeItem(ACTIVE_KEY);
        setActiveId(id);
      },
      createProject: async (input) => {
        const id = await createMut(input);
        return id as unknown as string;
      },
      deleteProject: async (id) => {
        await removeMut({ id: id as never });
        if (activeId === id) {
          localStorage.removeItem(ACTIVE_KEY);
          setActiveId(null);
        }
      },
      addFileVersion: async (projectId, templateId, fileName, content) => {
        const template = getTemplate(templateId);
        if (!template) return;
        const a = analyzeCsv(template, content);
        await addMut({
          projectId: projectId as never,
          templateId,
          fileName,
          content,
          rows: a.rows,
          status: a.status,
          issues: a.issues,
          coverage: a.coverage,
        });
      },
      setActiveFileVersion: async (_projectId, _templateId, versionId) => {
        await setActiveMut({ fileId: versionId as never });
      },
      deleteFileVersion: async (_projectId, _templateId, versionId) => {
        await deleteMut({ fileId: versionId as never });
      },
    }),
    [projects, loading, activeId, createMut, removeMut, addMut, setActiveMut, deleteMut]
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
