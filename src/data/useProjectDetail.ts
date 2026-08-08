import { useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface UrgentTask {
  dday: number;
  title: string;
  datetime: string;
  tags: string[];
}

export interface Member {
  initials: string;
  role: string;
  avatarBg: string;
  active: boolean;
}

export interface Schedule {
  dday: number;
  label: string;
  ddayColor: string;
}

export interface Progress {
  percent: number;
  done: number;
  total: number;
  remaining: number;
  remainingTotal: number;
}

export interface ProjectDetailData {
  urgentTask: UrgentTask;
  members: Member[];
  schedules: Schedule[];
  progress: Progress;
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId} 준비되면 이 파일만 교체) ────
// 화면 컴포넌트(screens/ProjectDetail.tsx)는 건드릴 필요 없음.

const MOCK_DETAIL: ProjectDetailData = {
  urgentTask: {
    dday: 3,
    title: "중간 발표 자료 제출",
    datetime: "7월 30일 수요일 오전 10시 마감",
    tags: ["초안 검토 중", "담당: KM, LJ"],
  },
  members: [
    { initials: "KM", role: "PM",    avatarBg: "#A78BFA", active: true  },
    { initials: "LJ", role: "디자인", avatarBg: "#A78BFA", active: true  },
    { initials: "PJ", role: "개발",   avatarBg: "#60A5FA", active: true  },
    { initials: "CS", role: "마케팅", avatarBg: "#374151", active: true  },
    { initials: "JH", role: "QA",    avatarBg: "#6B7280", active: false },
    { initials: "YC", role: "기획",   avatarBg: "#4B5563", active: true  },
  ],
  schedules: [
    { dday: 3,  label: "중간 발표 자료 제출", ddayColor: "#EB3E88" },
    { dday: 7,  label: "클라이언트 검토 미팅", ddayColor: "#A78BFA" },
    { dday: 14, label: "최종 산출물 납품",    ddayColor: "#60A5FA" },
  ],
  progress: {
    percent: 67,
    done: 6,
    total: 15,
    remaining: 8,
    remainingTotal: 10,
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────
// projectId를 받아두지만 지금은 모든 프로젝트에 같은 mock을 반환한다.
// 백엔드 GET /projects/{projectId} 준비되면 이 훅 내부만 fetch로 교체.

export function useProjectDetail(_projectId: string | undefined) {
  const [data] = useState<ProjectDetailData>(MOCK_DETAIL);
  return { data, loading: false, error: null as Error | null };
}
