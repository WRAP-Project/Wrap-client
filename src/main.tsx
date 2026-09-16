import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./data/AuthContext";
import { SessionScope } from "./data/SessionScope";
import { ProjectsProvider } from "./data/ProjectsContext";
import { SchedulesProvider } from "./data/SchedulesContext";
import { MilestoneChecklistProvider } from "./data/MilestoneChecklistContext";
import { ProfileProvider } from "./data/ProfileContext";
import { AdjustRequestsProvider } from "./data/AdjustRequestsContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      {/* AuthProvider가 가장 바깥 — ProfileProvider가 로그인한 회원 정보를 읽어
          닉네임·이메일을 실제 값으로 덮는다.
          SessionScope는 그 안쪽 전부를 회원 id로 key 지어, 사용자가 바뀌면
          이전 사용자의 프로젝트·일정이 남지 않도록 통째로 새로 mount한다. */}
      <AuthProvider>
        <SessionScope>
          <ProjectsProvider>
            <SchedulesProvider>
              <MilestoneChecklistProvider>
                <ProfileProvider>
                  <AdjustRequestsProvider>
                    <App />
                  </AdjustRequestsProvider>
                </ProfileProvider>
              </MilestoneChecklistProvider>
            </SchedulesProvider>
          </ProjectsProvider>
        </SessionScope>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
