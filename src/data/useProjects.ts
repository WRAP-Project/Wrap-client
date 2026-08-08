import { useReducer } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Project {
  id: string;
  name: string;
  color: string;          // 프론트 전용 (백엔드 스키마에 없음)
  selected?: boolean;
  description?: string;
  progress?: number;
  tags?: string[];
  goal?: string;
  endDate?: string;       // YYYY-MM-DD (백엔드 endDate 필드와 동일)
}

/** CreateProject 화면이 넘기는 입력값 */
export interface ProjectDraft {
  name: string;
  goal?: string;
  endDate?: string;
  color: string;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드 GET /projects 준비되면 이 파일 내부만 fetch로 교체.
// 화면 컴포넌트(src/screens/)는 건드릴 필요 없음.

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
];

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action = { type: "ADD_PROJECT"; payload: Project };

function reducer(state: Project[], action: Action): Project[] {
  switch (action.type) {
    case "ADD_PROJECT":
      return [...state, action.payload];
    default:
      return state;
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjects() {
  const [projects, dispatch] = useReducer(reducer, MOCK_PROJECTS);

  /** 지금: 로컬 상태에 추가. 나중: POST /projects fetch 후 응답으로 업데이트 */
  function addProject(draft: ProjectDraft): Project {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: draft.name,
      color: draft.color,
      goal: draft.goal,
      endDate: draft.endDate,
    };
    dispatch({ type: "ADD_PROJECT", payload: newProject });
    return newProject;
  }

  return { projects, addProject, loading: false, error: null as Error | null };
}

