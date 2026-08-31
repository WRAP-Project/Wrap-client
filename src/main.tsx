import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./data/AuthContext";
import { ProjectsProvider } from "./data/ProjectsContext";
import { SchedulesProvider } from "./data/SchedulesContext";
import { ProfileProvider } from "./data/ProfileContext";
import { AdjustRequestsProvider } from "./data/AdjustRequestsContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider가 가장 바깥 — ProfileProvider가 로그인한 회원 정보를 읽어
          닉네임·이메일을 실제 값으로 덮는다. */}
      <AuthProvider>
        <ProjectsProvider>
          <SchedulesProvider>
            <ProfileProvider>
              <AdjustRequestsProvider>
                <App />
              </AdjustRequestsProvider>
            </ProfileProvider>
          </SchedulesProvider>
        </ProjectsProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
