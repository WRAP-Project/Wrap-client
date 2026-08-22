import { useMemo } from "react";

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
  avatarBg: string;
  timeAgo: string;
  statusText: string;
  blocked: boolean;
}

export interface TeamActivityData {
  header: TeamActivityHeader;
  filters: string[];
  members: MemberActivity[];
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId}/activity 준비되면 교체) ──────
// 화면 컴포넌트(screens/TeamActivity.tsx)는 건드릴 필요 없음.
// projectId·팀 구성은 useProjects.ts / useProjectDetail.ts와 맞춰져 있다.
// 실제 서비스에서 한 사람이 여러 프로젝트에 동시에 속하는 경우는 사실상 없으므로,
// mock도 프로젝트 간 팀원이 겹치지 않게 구성한다(이름·이니셜 모두 유일).

const MOCK_BY_PROJECT: Record<string, MemberActivity[]> = {
  // 프로젝트 루프
  "1": [
    { name: "김민서", role: "PM",     initials: "KM", avatarBg: "#A78BFA", timeAgo: "12분 전",  statusText: "발표 흐름 검토 중",       blocked: false },
    { name: "이주연", role: "디자인", initials: "LJ", avatarBg: "#A78BFA", timeAgo: "24분 전",  statusText: "키 비주얼 3페이지 반영",  blocked: false },
    { name: "박준",   role: "개발",   initials: "PJ", avatarBg: "#60A5FA", timeAgo: "1시간 전", statusText: "데일리 링크 체크 완료",   blocked: false },
    { name: "최서현", role: "마케팅", initials: "CS", avatarBg: "#374151", timeAgo: "2시간 전", statusText: "클라이언트 콘텐츠 정리",  blocked: false },
    { name: "윤채원", role: "기획",   initials: "YC", avatarBg: "#4B5563", timeAgo: "3시간 전", statusText: "온보딩 카피 초안 정리",   blocked: false },
    { name: "정하늘", role: "QA",     initials: "JH", avatarBg: "#6B7280", timeAgo: "어제",     statusText: "검증 데이터 미수신",      blocked: true  },
  ],

  // 오로라 리브랜딩
  "2": [
    { name: "문가온", role: "PM",     initials: "MG", avatarBg: "#A78BFA", timeAgo: "35분 전",  statusText: "리뷰 안건 정리 중",       blocked: false },
    { name: "오세린", role: "디자인", initials: "OS", avatarBg: "#A78BFA", timeAgo: "1시간 전", statusText: "로고 시안 3차 작업 중",   blocked: false },
    { name: "신하람", role: "브랜딩", initials: "SH", avatarBg: "#F472B6", timeAgo: "2시간 전", statusText: "브랜드 보이스 가이드 초안", blocked: false },
    { name: "배도윤", role: "마케팅", initials: "BD", avatarBg: "#374151", timeAgo: "이틀 전",  statusText: "런칭 채널 확정 대기",     blocked: true  },
  ],

  // 캠페인 라디오
  "3": [
    { name: "서지훈", role: "마케팅", initials: "SJ", avatarBg: "#F59E0B", timeAgo: "20분 전",  statusText: "캠페인 콘셉트 후보 정리", blocked: false },
    { name: "노아린", role: "기획",   initials: "NA", avatarBg: "#4B5563", timeAgo: "4시간 전", statusText: "녹음 스튜디오 섭외 완료", blocked: false },
    { name: "강태오", role: "개발",   initials: "KT", avatarBg: "#60A5FA", timeAgo: "사흘 전",  statusText: "랜딩 페이지 착수 대기",   blocked: true  },
  ],
};

/**
 * 팀원 명단만 필요한 곳(캘린더 "팀원 일정")이 같은 mock을 공유하도록 노출한다.
 * 이름·역할·이니셜이 화면마다 어긋나지 않게 하려는 목적 — 백엔드 연동 시에도
 * 멤버 조회는 한 곳에서만 바뀐다.
 */
export function getProjectMembers(projectId: string): MemberActivity[] {
  return MOCK_BY_PROJECT[projectId] ?? [];
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
// 백엔드 GET /projects/{projectId}/activity 준비되면 이 훅 내부만 fetch로 교체.

export function useTeamActivity(projectId: string | undefined) {
  const data = useMemo(
    () => buildActivity((projectId && MOCK_BY_PROJECT[projectId]) || []),
    [projectId],
  );
  return { data, loading: false, error: null as Error | null };
}
