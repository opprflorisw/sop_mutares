import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./lib/auth";
import { ProjectsProvider } from "./lib/projects";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectsProvider>
          <App />
        </ProjectsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
);
