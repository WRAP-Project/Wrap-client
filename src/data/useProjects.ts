import { useState } from "react";

export interface Project {
  id: string;
  name: string;
  color: string;
  selected?: boolean;
  description?: string;
  progress?: number;
  tags?: string[];
}

// API 연동 전 임시 데이터. 백엔드 GET /projects가 준비되면 이 파일
// 내부만 fetch 기반으로 바꾸면 된다 — useProjects()를 쓰는 화면 쪽은
// 그대로 둔다 (반환 형태가 같으므로).
const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "프로젝트명",
    color: "#CDEA6F",
    selected: true,
    description: "함께 전 · 보스러리 시간 업프도빌",
    progress: 78,
    tags: ["함께", "팀"],
  },
  {
    id: "2",
    name: "프로젝트명",
    color: "#F5E03A",
    description: "1시간 뒤\n스크린샷 #2 작성",
    tags: ["02"],
  },
  {
    id: "3",
    name: "프로젝트명",
    color: "#A78BFA",
  },
  {
    id: "4",
    name: "프로젝트명",
    color: "#F4A8A8",
  },
];

export function useProjects() {
  const [projects] = useState<Project[]>(MOCK_PROJECTS);
  return { projects, loading: false, error: null as Error | null };
}
