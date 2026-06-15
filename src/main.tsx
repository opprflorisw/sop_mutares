import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConvexProvider } from "convex/react";
import "./index.css";
import App from "./App";
import { convex } from "./lib/convexClient";
import { AuthProvider } from "./lib/auth";
import { ProjectsProvider } from "./lib/projects";
import SeedGate from "./components/SeedGate";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConvexProvider client={convex}>
      <BrowserRouter>
        <SeedGate />
        <AuthProvider>
          <ProjectsProvider>
            <App />
          </ProjectsProvider>
        </AuthProvider>
      </BrowserRouter>
    </ConvexProvider>
  </StrictMode>
);
