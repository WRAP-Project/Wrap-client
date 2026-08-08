import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";

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
// 백엔드/DB가 아직 배포되지 않아, 로컬에 떠 있지 않으면 GET /projects가
// 네트워크 자체에서 실패한다. 그 경우에만 이 mock으로 폴백한다.

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

// 백엔드 응답엔 색상 개념이 없어서, id를 기준으로 팔레트를 순환시켜 배정한다.
const COLOR_PALETTE = ["#CDEA6F", "#A78BFA", "#60A5FA", "#F472B6", "#FBBF24"];

function colorForId(id: number): string {
  return COLOR_PALETTE[id % COLOR_PALETTE.length];
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const { data, error: fetchError } = await apiClient.GET("/projects");
        if (cancelled) return;

        if (fetchError || !data?.data) {
          throw new Error("프로젝트 목록을 불러오지 못했습니다.");
        }

        setProjects(
          data.data.map((p) => ({
            id: String(p.id),
            name: p.name ?? "",
            color: colorForId(p.id ?? 0),
          })),
        );
        setUsingMock(false);
        setError(null);
      } catch {
        // 백엔드가 아직 배포되지 않아 서버가 없을 때(네트워크 실패)만
        // 여기로 떨어진다 — mock으로 폴백해 화면은 그대로 동작하게 한다.
        if (cancelled) return;
        console.warn("[useProjects] /projects 연결 실패 — mock 데이터로 대체합니다.");
        setProjects(MOCK_PROJECTS);
        setUsingMock(true);
        setError(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const addProject = useCallback(async (draft: ProjectDraft): Promise<Project> => {
    if (usingMock) {
      const newProject: Project = {
        id: crypto.randomUUID(),
        name: draft.name,
        color: draft.color,
        goal: draft.goal,
        endDate: draft.endDate,
      };
      setProjects((prev) => [...prev, newProject]);
      return newProject;
    }

    const { data, error: createError } = await apiClient.POST("/projects", {
      body: {
        name: draft.name,
        goal: draft.goal,
        endDate: draft.endDate,
      },
    });

    if (createError || !data?.data) {
      throw new Error("프로젝트 생성에 실패했습니다.");
    }

    const created: Project = {
      id: String(data.data.id),
      name: data.data.name ?? draft.name,
      color: draft.color,
      goal: data.data.goal,
      endDate: data.data.endDate,
    };
    setProjects((prev) => [...prev, created]);
    return created;
  }, [usingMock]);

  return { projects, addProject, loading, error };
}
