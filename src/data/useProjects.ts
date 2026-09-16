import { useCallback, useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
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
  color: string;          // "#RRGGBB" (백엔드 color 필드와 동일 — 생성 시 필수)
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
// 목록은 "mock 고정 + 서버 프로젝트 추가" 방식이다. 이 세 프로젝트가 앱 전체의
// 기준점이라 — id/이름이 useChatData.ts의 채팅 그룹, useProjectDetail.ts의 상세,
// useTeamActivity.ts의 팀원 명단, useSchedules.ts의 일정과 전부 1:1로 맞춰져 있다.
// mock을 서버 목록으로 갈아치우면 그 화면들이 통째로 비므로, 상세/채팅/팀/일정까지
// 함께 연동되기 전까지는 mock을 그대로 두고 서버 프로젝트를 뒤에 이어 붙인다.
// members는 프로젝트끼리 겹치지 않는다 — 실제 서비스에서도 한 사람이 여러
// 프로젝트에 속하지 않는다.

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

// ── 백엔드 연동 ───────────────────────────────────────────────────────────────
// GET /projects (서버 프로젝트 조회) · POST /projects (생성). 계약: api/openapi.yaml.
// 응답 봉투는 ApiResponse<T> = { success, data, message, error }이고 null 필드는
// 아예 빠져서 내려오므로, 필드 존재 여부가 아니라 success로 분기한다
// (AuthContext.tsx가 쓰는 규칙과 같다).

// Render 무료 플랜이라 잠들어 있던 서버의 첫 요청은 1분 가까이 걸릴 수 있다 —
// 짧게 끊으면 멀쩡한 요청이 실패한다.
export const REQUEST_TIMEOUT_MS = 60_000;

// 서버 프로젝트의 id는 숫자 채번이라 mock의 "1"~"3"과 겹친다. 그대로 두면 상세
// 화면이 엉뚱한 mock을 열게 되므로 접두사를 붙여 분리한다.
// (상세까지 실제 연동하면 이 접두사는 걷어낸다)
export const SERVER_ID_PREFIX = "srv-";

/**
 * 화면이 들고 다니는 문자열 id("srv-12")를 백엔드가 path에 요구하는 숫자 id(12)로
 * 바꾼다. mock 프로젝트("1"~"3")는 서버에 존재하지 않으므로 null을 돌려주고,
 * 호출 측은 그때 API를 아예 건너뛴다 — 그대로 보내면 남의 프로젝트를 열거나 404가 난다.
 */
export function serverIdOf(projectId: string | undefined): number | null {
  if (!projectId?.startsWith(SERVER_ID_PREFIX)) return null;
  const n = Number(projectId.slice(SERVER_ID_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}

export function clientIdOfServerProject(projectId: number): string {
  return `${SERVER_ID_PREFIX}${projectId}`;
}

// 색상은 서버가 저장하고 돌려준다(#RRGGBB). 다만 응답에서 color는 optional이라 —
// color가 필수가 되기 전에 만들어진 프로젝트는 값이 비어서 내려온다. 그때만 쓰는 대체색.
const FALLBACK_COLOR = "#CDEA6F";

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjects() {
  // mock은 항상 목록 앞에 고정으로 남고, 서버에서 불러온 프로젝트가 뒤에 붙는다.
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 최초 1회 + 목록이 바뀔 만한 일이 생겼을 때(초대 수락 등) 다시 부른다.
  const load = useCallback(async () => {
    try {
      const { data, response } = await apiClient.GET("/projects", {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok || data?.success === false) {
        throw new Error("프로젝트 목록을 불러오지 못했습니다.");
      }

      const fromServer: Project[] = (data?.data ?? []).map((p) => ({
        id: `${SERVER_ID_PREFIX}${p.id}`,
        name: p.name ?? "",
        color: p.color ?? FALLBACK_COLOR,
        endDate: p.endDate,
      }));
      setProjects([...MOCK_PROJECTS, ...fromServer]);
      setError(null);
    } catch (e) {
      // 서버를 못 읽어도 mock은 그대로 남는다 — 화면이 비지는 않고, 실패 사실만
      // error로 올린다.
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e
          : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 프로젝트를 생성한다. 서버에 저장한 뒤, 응답으로 받은 프로젝트를 목록에 추가한다.
   * 실패하면 예외를 던진다 — 화면(CreateProject)이 생성 실패로 처리한다.
   */
  const addProject = useCallback(async (draft: ProjectDraft): Promise<Project> => {
    const { data, response } = await apiClient.POST("/projects", {
      body: {
        name: draft.name,
        goal: draft.goal,
        endDate: draft.endDate,
        // 필수 필드다. 빠지면 400 VALIDATION_FAILED. 형식은 "#RRGGBB"로 고정
        // (스펙의 pattern: ^#[0-9A-Fa-f]{6}$) — CreateProject의 COLOR_OPTIONS와 같다.
        color: draft.color,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok || data?.success === false || !data?.data) {
      throw new Error("프로젝트 생성에 실패했습니다.");
    }

    const created: Project = {
      id: `${SERVER_ID_PREFIX}${data.data.id}`,
      name: data.data.name ?? draft.name,
      color: data.data.color ?? draft.color,
      goal: data.data.goal ?? draft.goal,
      endDate: data.data.endDate ?? draft.endDate,
    };
    setProjects((prev) => [...prev, created]);
    return created;
  }, []);

  /**
   * 참여 중인 프로젝트에서 나간다(DELETE /projects/{projectId}/members/me).
   * 성공하면 목록에서 바로 뺀다 — 다시 조회하지 않는다.
   *
   * mock 프로젝트는 서버에 없으므로 호출 자체를 막는다. 그대로 보내면 남의
   * 프로젝트를 건드리거나 404가 난다.
   *
   * OWNER가 나갈 때 서버가 어떻게 처리하는지는 스펙에 없다 — 거절한다면 그
   * 사유가 그대로 예외 메시지로 올라오므로 화면이 보여준다.
   */
  const leaveProject = useCallback(async (projectId: string): Promise<void> => {
    const serverId = serverIdOf(projectId);
    if (serverId === null) {
      throw new Error("샘플 프로젝트라 나갈 수 없어요.");
    }

    const { data, error, response } = await apiClient.DELETE(
      "/projects/{projectId}/members/me",
      {
        params: { path: { projectId: serverId } },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    );

    if (!response.ok || data?.success === false) {
      throw new Error(
        apiErrorMessage(error ?? data, response.status, "프로젝트에서 나가지 못했습니다."),
      );
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  /**
   * 프로젝트를 삭제한다(DELETE /projects/{projectId}).
   *
   * 나가기(leaveProject)와 다르다 — 나가기는 나만 빠지지만, 삭제는 프로젝트 자체가
   * 사라져 모든 팀원이 잃는다. 그래서 화면에서도 한 단계 더 강한 확인을 거친다.
   *
   * mock 프로젝트는 서버에 없으므로 호출 자체를 막는다(나가기와 같은 이유).
   *
   * 권한(OWNER만 삭제 가능한지)은 스펙에 명시돼 있지 않다 — 서버가 거절하면 그
   * 사유가 그대로 예외 메시지로 올라오므로 화면이 보여준다.
   */
  const deleteProject = useCallback(async (projectId: string): Promise<void> => {
    const serverId = serverIdOf(projectId);
    if (serverId === null) {
      throw new Error("샘플 프로젝트라 삭제할 수 없어요.");
    }

    const { data, error, response } = await apiClient.DELETE("/projects/{projectId}", {
      params: { path: { projectId: serverId } },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok || data?.success === false) {
      throw new Error(
        apiErrorMessage(error ?? data, response.status, "프로젝트를 삭제하지 못했습니다."),
      );
    }

    setProjects((prev) => prev.filter((p) => p.id !== projectId));
  }, []);

  return { projects, addProject, leaveProject, deleteProject, loading, error, reload: load };
}
