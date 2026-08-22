/**
 * ProjectsContext
 *
 * 여러 화면(ProjectSelect, CreateProject 등)이 같은 프로젝트 목록을
 * 공유해야 하므로 Context로 전역화한다.
 *
 * 소비 측은 useProjectsContext()만 알면 된다.
 * 내부가 mock인지 fetch인지는 이 파일 + useProjects.ts 안에서만 결정된다.
 */

import { createContext, useContext, useState, type ReactNode } from "react";
import { useProjects, type Project, type ProjectDraft, type ProjectMember } from "./useProjects";

// 소비 측에서 ProjectsContext 하나만 import해도 되도록 re-export
export type { Project, ProjectDraft, ProjectMember };

// ── Context 타입 ──────────────────────────────────────────────────────────────

interface ProjectsContextValue {
  projects: Project[];
  addProject: (draft: ProjectDraft) => Promise<Project>;
  loading: boolean;
  error: Error | null;
  /** 홈에서 선택한(또는 마지막으로 본) 프로젝트 — 하단 탭 홈 버튼이 이 프로젝트로 이동한다. */
  selectedProjectId: string | null;
  selectedProject: Project | undefined;
  selectProject: (id: string | null) => void;
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const projectsValue = useProjects();
  const [selectedProjectId, selectProject] = useState<string | null>(null);

  const value: ProjectsContextValue = {
    ...projectsValue,
    selectedProjectId,
    selectedProject: projectsValue.projects.find((p) => p.id === selectedProjectId),
    selectProject,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

// ── 소비 훅 ──────────────────────────────────────────────────────────────────

export function useProjectsContext(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) {
    throw new Error("useProjectsContext는 ProjectsProvider 안에서만 사용 가능합니다.");
  }
  return ctx;
}
