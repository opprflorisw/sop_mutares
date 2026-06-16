import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { IconFolder, IconUsers, IconLogout, IconDashboard } from "./icons";

export default function WorkspaceLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[var(--color-surface-2)]">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-2.5">
        <div className="flex items-center gap-2.5">
          <img src="/mutares.png" alt="Mutares" className="h-4 w-auto" />
          <span className="border-l border-[var(--color-line)] pl-2.5 text-[12px] font-medium text-[var(--color-ink-2)]">
            S&OP Planner
          </span>
        </div>

        <nav className="ml-4 flex items-center gap-1">
          <WsTab to="/workspace" end>
            <IconFolder size={15} /> Projects & Data
          </WsTab>
          <WsTab to="/workspace/understanding">
            <IconDashboard size={15} /> Dashboard model
          </WsTab>
          <WsTab to="/workspace/accounts">
            <IconUsers size={15} /> Accounts
          </WsTab>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="text-right">
            <div className="text-[12px] font-medium leading-tight">
              {user?.name}
            </div>
            <div className="text-[10px] text-[var(--color-ink-3)]">
              {user?.role}
            </div>
          </div>
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

      <div className="mx-auto max-w-6xl px-5 py-6">
        <Outlet />
      </div>
    </div>
  );
}

function WsTab({
  to,
  end,
  children,
}: {
  to: string;
  end?: boolean;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
          isActive
            ? "bg-[var(--color-brand-50)] font-medium text-[var(--color-brand-700)]"
            : "text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)]"
        }`
      }
    >
      {children}
    </NavLink>
  );
}
