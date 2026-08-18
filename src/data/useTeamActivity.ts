import { useState } from "react";

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

const MOCK_TEAM_ACTIVITY: TeamActivityData = {
  header: {
    activeCount: 5,
    totalCount: 6,
    updatePercent: 89,
    summary: "오늘 5명이 활동 상태를 공유했어요",
    inProgressCount: 3,
    doneCount: 1,
    needsCheckCount: 1,
  },
  filters: ["전체", "PM", "디자인", "개발", "기획"],
  members: [
    {
      name: "김민서",
      role: "PM",
      initials: "KM",
      avatarBg: "#A78BFA",
      timeAgo: "12분 전",
      statusText: "발표 흐름 검토 중",
      blocked: false,
    },
    {
      name: "이주연",
      role: "디자인",
      initials: "LJ",
      avatarBg: "#A78BFA",
      timeAgo: "24분 전",
      statusText: "키 비주얼 3페이지 반영",
      blocked: false,
    },
    {
      name: "박준",
      role: "개발",
      initials: "PJ",
      avatarBg: "#60A5FA",
      timeAgo: "1시간 전",
      statusText: "데일리 링크 체크 완료",
      blocked: false,
    },
    {
      name: "최서현",
      role: "마케팅",
      initials: "CS",
      avatarBg: "#374151",
      timeAgo: "2시간 전",
      statusText: "클라이언트 콘텐츠 정리",
      blocked: false,
    },
    {
      name: "정하늘",
      role: "QA",
      initials: "JH",
      avatarBg: "#6B7280",
      timeAgo: "검증 데이터 미수신",
      statusText: "검증 데이터 미수신",
      blocked: true,
    },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTeamActivity(_projectId: string | undefined) {
  const [data] = useState<TeamActivityData>(MOCK_TEAM_ACTIVITY);
  return { data, loading: false, error: null as Error | null };
}
