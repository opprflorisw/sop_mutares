import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { useAuth } from "../lib/auth";
import AssistantDrawer from "./AssistantDrawer";
import {
  IconDashboard, IconChart, IconFactory, IconBox,
  IconSettings, IconArrowLeft, IconLogout,
} from "./icons";
import type { ComponentType } from "react";

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }> };

// Four essential buttons: an executive snapshot + the three core modules.
const NAV: NavItem[] = [
  { to: "/tool/overview", label: "Overview", icon: IconDashboard },
  { to: "/tool/demand", label: "Demand", icon: IconChart },
  { to: "/tool/supply", label: "Supply", icon: IconFactory },
  { to: "/tool/capacity", label: "Capacity", icon: IconBox },
];

const MODULE_LABELS: Record<string, string> = {
  overview: "Overview", demand: "Demand", supply: "Supply",
  capacity: "Capacity", settings: "Settings",
};

const HEADER_H = "h-[52px]";

function NavRow({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        `mx-2 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] transition-colors ${
          isActive
            ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink)] shadow-[0_0_0_0.5px_var(--color-line-strong)]"
            : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
        }`
      }
    >
      <Icon size={16} />
      <span className="flex-1">{item.label}</span>
    </NavLink>
  );
}

export default function ToolLayout() {
  const { activeProject, loading } = useProjects();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--color-surface-2)]">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand-600)]" />
      </div>
    );
  }
  if (!activeProject) return <Navigate to="/workspace" replace />;

  const seg = location.pathname.split("/")[2] || "overview";
  const moduleLabel = MODULE_LABELS[seg] ?? "Overview";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-2)]">
      {/* Sidebar */}
      <aside className="flex w-[208px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-2)]">
        {/* logo — aligned with the topbar height + splitter */}
        <div className={`flex ${HEADER_H} shrink-0 items-center border-b border-[var(--color-line)] px-4`}>
          <img src="/mutares.png" alt="Mutares" className="h-[15px] w-auto" />
        </div>

        <nav className="flex-1 overflow-y-auto py-2.5">
          <div className="px-4 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
            Planning
          </div>
          {NAV.map((i) => <NavRow key={i.to} item={i} />)}
        </nav>

        {/* bottom: settings + back to workspace */}
        <div className="border-t border-[var(--color-line)] p-2">
          <NavLink
            to="/tool/settings"
            className={({ isActive }) =>
              `mx-0 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] ${
                isActive ? "bg-[var(--color-surface)] font-medium text-[var(--color-ink)]" : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
              }`
            }
          >
            <IconSettings size={16} /> Settings
          </NavLink>
          <button
            onClick={() => navigate("/workspace")}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] text-[var(--color-ink-2)] hover:bg-[var(--color-surface)]"
          >
            <IconArrowLeft size={16} /> Back to Workspace
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar — breadcrumb + user, aligned splitter */}
        <header className={`flex ${HEADER_H} shrink-0 items-center gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4`}>
          <nav className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
            <button onClick={() => navigate("/workspace")} className="text-[var(--color-ink-3)] hover:text-[var(--color-ink)]">
              Projects
            </button>
            <span className="text-[var(--color-ink-3)]">/</span>
            <button onClick={() => navigate(`/workspace/project/${activeProject.id}`)} className="max-w-[220px] truncate text-[var(--color-ink-2)] hover:text-[var(--color-ink)]">
              {activeProject.name}
            </button>
            <span className="text-[var(--color-ink-3)]">/</span>
            <span className="font-semibold text-[var(--color-ink)]">{moduleLabel}</span>
          </nav>

          <div className="ml-auto flex items-center gap-2.5">
            <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-[11px] text-[var(--color-ink-2)]">
              {activeProject.currency} · {activeProject.files.length} files
            </span>
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-brand-100)] text-[11px] font-semibold text-[var(--color-brand-700)]">
              {user?.name.slice(0, 1).toUpperCase()}
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              title="Sign out"
              className="rounded-md p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {/* centered, capped content — keeps dense cards readable on wide/4K screens */}
          <div className="mx-auto w-full max-w-[1600px] p-4 lg:px-6 lg:py-5">
            <Outlet />
          </div>
        </main>
      </div>

      <AssistantDrawer />
    </div>
  );
}
