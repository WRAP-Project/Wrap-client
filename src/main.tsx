import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ProjectsProvider } from "./data/ProjectsContext";
import { SchedulesProvider } from "./data/SchedulesContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProjectsProvider>
        <SchedulesProvider>
          <App />
        </SchedulesProvider>
      </ProjectsProvider>
    </BrowserRouter>
  </StrictMode>,
);
