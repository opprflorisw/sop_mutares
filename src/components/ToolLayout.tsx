import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { useAuth } from "../lib/auth";
import {
  IconDashboard,
  IconFlow,
  IconChart,
  IconFactory,
  IconBox,
  IconChecks,
  IconRadar,
  IconSparkles,
  IconSettings,
  IconArrowLeft,
  IconLogout,
} from "./icons";
import type { ComponentType } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  badge?: number;
};

const PLANNING: NavItem[] = [
  { to: "/tool/overview", label: "Overview", icon: IconDashboard },
  { to: "/tool/workflow", label: "Workflow", icon: IconFlow },
  { to: "/tool/demand", label: "Demand", icon: IconChart },
  { to: "/tool/supply", label: "Supply & MPS", icon: IconFactory },
  { to: "/tool/inventory", label: "Inventory", icon: IconBox, badge: 2 },
];

const REVIEW: NavItem[] = [
  { to: "/tool/summary", label: "S&OP Summary", icon: IconChecks },
  { to: "/tool/control-tower", label: "Control Tower", icon: IconRadar },
  { to: "/tool/assistant", label: "AI Assistant", icon: IconSparkles },
];

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `mx-1.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
          isActive
            ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink)] shadow-[0_0_0_0.5px_var(--color-line-strong)]"
            : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
        }`
      }
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-[var(--color-bad)] px-1.5 text-[10px] font-medium text-white">
          {item.badge}
        </span>
      ) : null}
    </NavLink>
  );
}

export default function ToolLayout() {
  const { activeProject } = useProjects();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!activeProject) {
    navigate("/workspace", { replace: true });
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-2)]">
      {/* Sidebar */}
      <aside className="flex w-[200px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <div className="border-b border-[var(--color-line)] px-3.5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--color-brand-800)] text-[12px] font-bold text-white">
              M
            </div>
            <div>
              <div className="text-[13px] font-semibold leading-tight">
                S&OP Planner
              </div>
              <div className="text-[10px] text-[var(--color-ink-3)]">
                Mutares
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          <SectionLabel>Planning</SectionLabel>
          {PLANNING.map((i) => (
            <NavRow key={i.to} item={i} />
          ))}
          <SectionLabel>Review</SectionLabel>
          {REVIEW.map((i) => (
            <NavRow key={i.to} item={i} />
          ))}
        </nav>

        <div className="border-t border-[var(--color-line)] p-1.5">
          <NavLink
            to="/tool/settings"
            className="mx-1.5 flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
          >
            <IconSettings size={16} />
            Settings
          </NavLink>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-2.5">
          <button
            onClick={() => navigate("/workspace")}
            className="flex items-center gap-1.5 rounded-md border border-[var(--color-line-strong)] px-2.5 py-1 text-[12px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
          >
            <IconArrowLeft size={14} /> Workspace
          </button>
          <div className="ml-1 min-w-0">
            <div className="truncate text-[13px] font-semibold">
              {activeProject.name}
            </div>
            <div className="truncate text-[10px] text-[var(--color-ink-3)]">
              {activeProject.industry}
            </div>
          </div>
          <span className="ml-auto rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-ink-2)]">
            {activeProject.currency} · {activeProject.files.length} files
          </span>
          <div className="flex items-center gap-2 pl-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[11px] font-semibold text-[var(--color-brand-700)]">
              {user?.name.slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={() => {
                logout();
                navigate("/login");
              }}
              title="Sign out"
              className="rounded-md p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3.5 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
      {children}
    </div>
  );
}
