import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import type { ReactNode } from "react";

import LoginPage from "./pages/LoginPage";
import WorkspaceLayout from "./components/WorkspaceLayout";
import WorkspacePage from "./pages/WorkspacePage";
import DataManagerPage from "./pages/DataManagerPage";
import AccountManagementPage from "./pages/AccountManagementPage";
import DashboardUnderstandingPage from "./pages/DashboardUnderstandingPage";
import ToolLayout from "./components/ToolLayout";
import DashboardsPage from "./pages/tool/DashboardsPage";
import SettingsPage from "./pages/tool/SettingsPage";

function FullScreenLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-[var(--color-surface-2)]">
      <div className="flex items-center gap-2 text-[13px] text-[var(--color-ink-2)]">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-line-strong)] border-t-[var(--color-brand-600)]" />
        Loading…
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <FullScreenLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/workspace"
        element={
          <RequireAuth>
            <WorkspaceLayout />
          </RequireAuth>
        }
      >
        <Route index element={<WorkspacePage />} />
        <Route path="project/:id" element={<DataManagerPage />} />
        <Route path="understanding" element={<DashboardUnderstandingPage />} />
        <Route path="accounts" element={<AccountManagementPage />} />
      </Route>

      <Route
        path="/tool"
        element={
          <RequireAuth>
            <ToolLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/tool/overview" replace />} />
        <Route path="overview" element={<DashboardsPage page="overview" />} />
        <Route path="demand" element={<DashboardsPage page="demand" />} />
        <Route path="supply" element={<DashboardsPage page="supply" />} />
        <Route path="capacity" element={<DashboardsPage page="capacity" />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* legacy routes folded into the 3 core modules */}
        <Route path="workflow" element={<Navigate to="/tool/overview" replace />} />
        <Route path="inventory" element={<Navigate to="/tool/supply" replace />} />
        <Route path="summary" element={<Navigate to="/tool/overview" replace />} />
        <Route path="control-tower" element={<Navigate to="/tool/overview" replace />} />
        <Route path="assistant" element={<Navigate to="/tool/overview" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  );
}
