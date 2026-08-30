import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ProjectsProvider } from "./data/ProjectsContext";
import { SchedulesProvider } from "./data/SchedulesContext";
import { ProfileProvider } from "./data/ProfileContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ProjectsProvider>
        <SchedulesProvider>
          <ProfileProvider>
            <App />
          </ProfileProvider>
        </SchedulesProvider>
      </ProjectsProvider>
    </BrowserRouter>
  </StrictMode>,
);
