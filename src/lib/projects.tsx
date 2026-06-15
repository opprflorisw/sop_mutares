import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// ============================================================
// Projects = the "workspace" model.
// A Project groups a selected set of uploaded data files for one
// factory / scenario / industry. Selecting a project scopes the
// whole S&OP tool to its data. Phase 0 ships one seeded project
// (Sealings) so the tool has something to render.
// ============================================================

export type SelectedFile = {
  templateId: string;
  fileName: string;
  rows: number;
  status: "valid" | "pending" | "error";
};

export type Project = {
  id: string;
  name: string;
  industry: string;
  factory: string;
  description: string;
  currency: string;
  createdAt: number;
  files: SelectedFile[];
};

const STORAGE_KEY = "sop_projects_v1";
const ACTIVE_KEY = "sop_active_project_v1";

const SEED_PROJECTS: Project[] = [
  {
    id: "p_sealings",
    name: "SFC India — Sealings",
    industry: "Automotive (Sealings)",
    factory: "5 plants · Bawal, Manesar, Chennai, Sanand, Sahibabad",
    description:
      "Automotive sealing systems for Indian OEMs (TML, Maruti, Tata, M&M, Nissan, VW). Dec'22 ICP baseline ₹35.56 Cr across 5 plants, 801 SKUs.",
    currency: "INR",
    createdAt: 0,
    files: [
      { templateId: "sku_master", fileName: "sku_master.csv", rows: 801, status: "valid" },
      { templateId: "customer_master", fileName: "customer_master.csv", rows: 9, status: "valid" },
      { templateId: "plant_master", fileName: "plant_master.csv", rows: 5, status: "valid" },
      { templateId: "sales_history", fileName: "sales_history.csv", rows: 14400, status: "valid" },
      { templateId: "demand_forecast", fileName: "demand_forecast.csv", rows: 9612, status: "valid" },
      { templateId: "inventory", fileName: "inventory.csv", rows: 4005, status: "valid" },
      { templateId: "capacity", fileName: "capacity.csv", rows: 360, status: "valid" },
    ],
  },
];

function loadProjects(): Project[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_PROJECTS));
      return SEED_PROJECTS;
    }
    return JSON.parse(raw) as Project[];
  } catch {
    return SEED_PROJECTS;
  }
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
        const id = `p_${Math.random().toString(36).slice(2, 10)}`;
        const project: Project = {
          id,
          ...input,
          createdAt: Date.now(),
          files: [],
        };
        setProjects((prev) => [...prev, project]);
        return id;
      },
      deleteProject: (id) => {
        setProjects((prev) => prev.filter((p) => p.id !== id));
        if (activeId === id) {
          localStorage.removeItem(ACTIVE_KEY);
          setActiveId(null);
        }
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
