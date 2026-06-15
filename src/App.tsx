import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/auth";
import type { ReactNode } from "react";

import LoginPage from "./pages/LoginPage";
import WorkspaceLayout from "./components/WorkspaceLayout";
import WorkspacePage from "./pages/WorkspacePage";
import AccountManagementPage from "./pages/AccountManagementPage";
import ToolLayout from "./components/ToolLayout";
import OverviewPage from "./pages/tool/OverviewPage";
import WorkflowPage from "./pages/tool/WorkflowPage";
import DemandPage from "./pages/tool/DemandPage";
import SupplyPage from "./pages/tool/SupplyPage";
import InventoryPage from "./pages/tool/InventoryPage";
import SummaryPage from "./pages/tool/SummaryPage";
import ControlTowerPage from "./pages/tool/ControlTowerPage";
import AssistantPage from "./pages/tool/AssistantPage";
import SettingsPage from "./pages/tool/SettingsPage";

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
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
        <Route path="overview" element={<OverviewPage />} />
        <Route path="workflow" element={<WorkflowPage />} />
        <Route path="demand" element={<DemandPage />} />
        <Route path="supply" element={<SupplyPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="summary" element={<SummaryPage />} />
        <Route path="control-tower" element={<ControlTowerPage />} />
        <Route path="assistant" element={<AssistantPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/workspace" replace />} />
    </Routes>
  );
}
