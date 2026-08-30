import { useCallback, useState } from "react";
import { C } from "@/screens/chatShared";

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 카드에 작게 겹쳐 표시되는 프로젝트 참여 멤버. */
export interface ProjectMember {
  id: string;
  /** 아바타에 표시할 1~2자 (이미지가 없을 때의 대체 표시) */
  initials: string;
  /** 프로필 이미지 URL — 없으면 initials로 대체한다. 백엔드 연동 시 채워진다. */
  avatarUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  color: string;          // 프론트 전용 (백엔드 스키마에 없음)
  description?: string;
  progress?: number;
  tags?: string[];
  goal?: string;
  endDate?: string;       // YYYY-MM-DD (백엔드 endDate 필드와 동일)
  members?: ProjectMember[];
  /** 마이페이지 배지에 표시할 최근 업데이트 수 (백엔드 스키마에 없음 — mock 전용) */
  recentUpdates?: number;
  /** "최근 업데이트 · {라벨}" 표기용 (mock 전용) */
  lastUpdatedLabel?: string;
}

/** CreateProject 화면이 넘기는 입력값 */
export interface ProjectDraft {
  name: string;
  goal?: string;
  endDate?: string;
  color: string;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드가 아직 준비되지 않아 하드코딩만 사용한다. 백엔드 GET /projects가
// 준비되면 이 파일 내부만 fetch 기반으로 교체 — 화면 쪽은 건드릴 필요 없음.
// id/이름은 useChatData.ts의 채팅 그룹과 1:1로 맞춰져 있다 — 홈에서 프로젝트를
// 선택하면 채팅 탭에서 같은 프로젝트의 대화방 그룹이 펼쳐져야 하기 때문.
// members는 useTeamActivity.ts의 팀원 명단과 1:1로 맞춰져 있고, 프로젝트끼리
// 겹치는 사람은 없다 — 실제 서비스에서도 한 사람이 여러 프로젝트에 속하지 않는다.

const MOCK_PROJECTS: Project[] = [
  {
    id: "1",
    name: "프로젝트 루프",
    color: C.lime,
    description: "디자인 시스템 정비와 온보딩 플로우 개선을 진행 중입니다.",
    progress: 68,
    tags: ["디자인", "온보딩"],
    recentUpdates: 2,
    lastUpdatedLabel: "오늘",
    members: [
      { id: "m1", initials: "김" },
      { id: "m2", initials: "이" },
      { id: "m3", initials: "박" },
      { id: "m4", initials: "최" },
      { id: "m5", initials: "윤" },
      { id: "m6", initials: "정" },
    ],
  },
  {
    id: "2",
    name: "오로라 리브랜딩",
    color: C.purple,
    description: "브랜드 아이덴티티와 마케팅 자산을 새로 정의하고 있습니다.",
    progress: 42,
    tags: ["브랜딩"],
    recentUpdates: 5,
    lastUpdatedLabel: "오늘",
    members: [
      { id: "m7", initials: "문" },
      { id: "m8", initials: "오" },
      { id: "m9", initials: "신" },
      { id: "m10", initials: "배" },
    ],
  },
  {
    id: "3",
    name: "캠페인 라디오",
    color: C.pink,
    description: "분기 캠페인 콘텐츠 기획과 라디오 광고 제작을 진행합니다.",
    progress: 25,
    tags: ["마케팅", "콘텐츠"],
    recentUpdates: 1,
    lastUpdatedLabel: "오늘",
    members: [
      { id: "m11", initials: "서" },
      { id: "m12", initials: "노" },
      { id: "m13", initials: "강" },
    ],
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);

  const addProject = useCallback(async (draft: ProjectDraft): Promise<Project> => {
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: draft.name,
      color: draft.color,
      goal: draft.goal,
      endDate: draft.endDate,
    };
    setProjects((prev) => [...prev, newProject]);
    return newProject;
  }, []);

  return { projects, addProject, loading: false, error: null as Error | null };
}
