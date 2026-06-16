import { useEffect, useRef, useState } from "react";
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useProjects } from "../lib/projects";
import { useAuth } from "../lib/auth";
import { useCompanyLogo } from "../lib/branding";
import { useUserProfile } from "../lib/settingsStore";
import AssistantDrawer from "./AssistantDrawer";
import {
  IconDashboard, IconChart, IconFactory, IconBox,
  IconSettings, IconArrowLeft, IconLogout,
} from "./icons";
import type { ComponentType } from "react";

type NavItem = { to: string; label: string; icon: ComponentType<{ size?: number }>; hint: string };

// Four essential buttons: an executive snapshot + the three core modules.
const NAV: NavItem[] = [
  { to: "/tool/overview", label: "Overview", icon: IconDashboard, hint: "Executive snapshot & board packs" },
  { to: "/tool/demand", label: "Demand", icon: IconChart, hint: "Consensus plan, forecast & accuracy" },
  { to: "/tool/supply", label: "Supply", icon: IconFactory, hint: "Constrained plan, gap & inventory" },
  { to: "/tool/capacity", label: "Capacity", icon: IconBox, hint: "RCCP load & the bottleneck" },
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
        `mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)] ${
          isActive
            ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)]"
            : "text-[var(--color-ink-2)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-ink)]"
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={19} />
          <span className="min-w-0 flex-1">
            <span className={`block text-[13.5px] ${isActive ? "font-semibold" : "font-medium"}`}>{item.label}</span>
            <span className="block truncate text-[10.5px] text-[var(--color-ink-3)]">{item.hint}</span>
          </span>
        </>
      )}
    </NavLink>
  );
}

export default function ToolLayout() {
  const { activeProject, loading } = useProjects();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const companyLogo = useCompanyLogo(activeProject?.id);
  const [profile] = useUserProfile();

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
      <aside className="flex w-[244px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-2)]">
        {/* top: the company's own logo (set in Settings) */}
        <div className={`flex ${HEADER_H} shrink-0 items-center border-b border-[var(--color-line)] px-4`}>
          {companyLogo ? (
            <img src={companyLogo} alt={activeProject.name} className="max-h-[28px] max-w-[180px] object-contain" />
          ) : (
            <span className="truncate text-[14px] font-semibold tracking-tight text-[var(--color-ink)]">{activeProject.name}</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
            Planning
          </div>
          <div className="space-y-0.5">
            {NAV.map((i) => <NavRow key={i.to} item={i} />)}
          </div>
        </nav>

        {/* controls: settings + back to workspace */}
        <div className="border-t border-[var(--color-line)] p-2">
          <NavLink
            to="/tool/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)] ${
                isActive ? "bg-[var(--color-brand-50)] font-semibold text-[var(--color-brand-700)]" : "font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-ink)]"
              }`
            }
          >
            <IconSettings size={18} /> Settings
          </NavLink>
          <button
            onClick={() => navigate("/workspace")}
            className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-gray-100)] hover:text-[var(--color-ink)]"
          >
            <IconArrowLeft size={18} /> Back to Workspace
          </button>
        </div>

        {/* footer: the product mark (Mutares S&OP Planner) */}
        <div className="flex items-center gap-2 border-t border-[var(--color-line)] px-4 py-3">
          <img src="/mutares.png" alt="Mutares" className="h-[13px] w-auto opacity-80" />
          <span className="border-l border-[var(--color-line)] pl-2 text-[11px] font-medium text-[var(--color-ink-3)]">S&amp;OP Planner</span>
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
            <UserMenu
              name={profile.fullName?.trim() || user?.name || "User"}
              email={user?.email ?? ""}
              role={profile.jobTitle?.trim() || user?.role || ""}
              avatar={profile.avatar ?? null}
              onSettings={() => navigate("/tool/settings")}
              onSignOut={() => { logout(); navigate("/login"); }}
            />
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

function UserMenu({
  name, email, role, avatar, onSettings, onSignOut,
}: {
  name: string; email: string; role: string; avatar: string | null;
  onSettings: () => void; onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        title={name}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-100)] text-[12px] font-semibold text-[var(--color-brand-700)] outline-none ring-1 ring-inset ring-[var(--color-brand-200)] transition-shadow hover:ring-2 focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)]"
      >
        {avatar ? <img src={avatar} alt={name} className="h-full w-full object-cover" /> : name.slice(0, 1).toUpperCase()}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] shadow-xl">
          <div className="border-b border-[var(--color-line)] px-3.5 py-3">
            <div className="truncate text-[13px] font-semibold text-[var(--color-ink)]">{name}</div>
            <div className="truncate text-[11.5px] text-[var(--color-ink-3)]">{email}</div>
            {role && (
              <span className="mt-1.5 inline-block rounded bg-[var(--color-gray-100)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-gray-700)] ring-1 ring-inset ring-[var(--color-gray-200)]">{role}</span>
            )}
          </div>
          <div className="py-1">
            <button
              onClick={() => { setOpen(false); onSettings(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-gray-100)] hover:text-[var(--color-ink)]"
            >
              <IconSettings size={16} /> Project settings
            </button>
            <button
              onClick={() => { setOpen(false); onSignOut(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-[12.5px] font-medium text-[var(--color-bad)] transition-colors hover:bg-[var(--color-error-50)]"
            >
              <IconLogout size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
