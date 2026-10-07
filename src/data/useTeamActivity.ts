import { useMemo } from "react";
import { useTeamMembers } from "./useTeamMembers";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface TeamActivityHeader {
  activeCount: number;
  totalCount: number;
  updatePercent: number;
  summary: string;
  inProgressCount: number;
  doneCount: number;
  needsCheckCount: number;
}

export interface MemberActivity {
  name: string;
  role: string;
  initials: string;
  timeAgo: string;
  statusText: string;
  blocked: boolean;
}

export interface TeamActivityData {
  header: TeamActivityHeader;
  filters: string[];
  members: MemberActivity[];
}

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/** 헤더 수치는 멤버 목록에서 파생 — 목록과 요약이 어긋나지 않게 한다. */
function buildActivity(members: MemberActivity[]): TeamActivityData {
  const total = members.length;
  const needsCheck = members.filter((m) => m.blocked).length;
  const done = members.filter((m) => !m.blocked && m.statusText.includes("완료")).length;
  const active = total - needsCheck;

  return {
    header: {
      activeCount: active,
      totalCount: total,
      updatePercent: total === 0 ? 0 : Math.round((active / total) * 100),
      summary:
        total === 0
          ? "아직 등록된 팀원이 없어요"
          : `오늘 ${active}명이 활동 상태를 공유했어요`,
      inProgressCount: active - done,
      doneCount: done,
      needsCheckCount: needsCheck,
    },
    // 이 프로젝트에 실제로 있는 역할만 필터로 노출
    filters: ["전체", ...Array.from(new Set(members.map((m) => m.role)))],
    members,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 명단은 실제 프로젝트 멤버(GET /projects/{projectId}/members)에서 온다.
//
// 다만 "무엇을 하고 있는지"(timeAgo·statusText·blocked)를 주는 엔드포인트는
// 아직 없다(api/openapi.yaml에 activity 경로 없음). 그래서 활동 내용은 비워
// 두고 명단만 보여준다 — 지어내면 화면이 거짓을 말하게 된다.
// GET /projects/{projectId}/activity 가 생기면 이 훅 내부만 교체하면 된다.

export function useTeamActivity(projectId: string | undefined) {
  const { members, loading } = useTeamMembers(projectId ?? null);

  const data = useMemo(
    () =>
      buildActivity(
        members.map((m) => ({
          name: m.name,
          role: m.role,
          initials: m.initials,
          timeAgo: "—",
          statusText: "활동 기록 없음",
          blocked: false,
        })),
      ),
    [members],
  );

  return { data, loading, error: null as Error | null };
}
