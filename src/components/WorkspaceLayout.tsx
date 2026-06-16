import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { useUserProfile } from "../lib/settingsStore";
import { IconFolder, IconUsers, IconLogout, IconDashboard } from "./icons";
import type { ComponentType } from "react";

type WsNav = { to: string; label: string; icon: ComponentType<{ size?: number }>; hint: string; end?: boolean };

const NAV: WsNav[] = [
  { to: "/workspace", label: "Projects & Data", icon: IconFolder, hint: "Your portfolio of projects", end: true },
  { to: "/workspace/understanding", label: "Dashboard model", icon: IconDashboard, hint: "The layering reference" },
  { to: "/workspace/accounts", label: "Accounts", icon: IconUsers, hint: "Users & access" },
];

const HEADER_H = "h-[52px]";

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const [profile] = useUserProfile();
  const navigate = useNavigate();
  const displayName = profile.fullName?.trim() || user?.name || "User";

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-2)]">
      {/* persistent left sidebar */}
      <aside className="flex w-[244px] shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-surface-2)]">
        <div className={`flex ${HEADER_H} shrink-0 items-center gap-2.5 border-b border-[var(--color-line)] px-4`}>
          <img src="/mutares.png" alt="Mutares" className="h-5 w-auto" />
          <span className="border-l border-[var(--color-line)] pl-2.5 text-[12px] font-medium text-[var(--color-ink-2)]">
            S&OP Planner
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-4 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
            Workspace
          </div>
          <div className="space-y-0.5">
            {NAV.map((i) => <WsRow key={i.to} item={i} />)}
          </div>
        </nav>

        {/* user + sign out */}
        <div className="border-t border-[var(--color-line)] p-2">
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[var(--color-brand-100)] text-[12px] font-semibold text-[var(--color-brand-700)]">
              {profile.avatar ? <img src={profile.avatar} alt={displayName} className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium leading-tight">{displayName}</div>
              <div className="truncate text-[10px] text-[var(--color-ink-3)]">{user?.role}</div>
            </div>
            <button
              onClick={() => { logout(); navigate("/login"); }}
              title="Sign out"
              className="rounded-md p-1.5 text-[var(--color-ink-3)] hover:bg-[var(--color-gray-100)] hover:text-[var(--color-ink)]"
            >
              <IconLogout size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* main */}
      <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-6 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function WsRow({ item }: { item: WsNav }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
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
