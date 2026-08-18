import { useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ChecklistStatus = "done" | "in_progress" | "blocked" | "pending";

export interface ChecklistItem {
  label: string;
  assignee: string;
  status: ChecklistStatus;
  note?: string;
}

export interface MilestoneHeader {
  dday: number;
  statusBadge: string;
  title: string;
  datetime: string;
  readyPercent: number;
}

export interface MilestoneStats {
  checklistDone: number;
  checklistTotal: number;
  fileCount: number;
  participantCount: number;
}

export interface MilestoneUpdate {
  author: string;
  text: string;
  time: string;
}

export interface MilestoneDetailData {
  header: MilestoneHeader;
  stats: MilestoneStats;
  checklist: ChecklistItem[];
  update: MilestoneUpdate;
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId}/milestones/{id} 준비되면 교체) ──
// 화면 컴포넌트(screens/MilestoneDetail.tsx)는 건드릴 필요 없음.

const MOCK_MILESTONE: MilestoneDetailData = {
  header: {
    dday: 3,
    statusBadge: "초안 검토 중",
    title: "중간 발표 자료 제출",
    datetime: "7월 30일 수요일 오전 10시 마감 · 담당 KM, LJ",
    readyPercent: 65,
  },
  stats: {
    checklistDone: 6,
    checklistTotal: 9,
    fileCount: 2,
    participantCount: 4,
  },
  checklist: [
    { label: "발표 흐름 및 목차 확정", assignee: "KM", status: "done" },
    { label: "키 비주얼 슬라이드 반영", assignee: "LJ", status: "in_progress" },
    {
      label: "발표 수치 검증 대기",
      assignee: "데이터 마무리",
      status: "blocked",
      note: "오늘 16시 이후 일정 영향",
    },
    { label: "최종 PDF 및 원본 업로드", assignee: "마감 전 최종 확인 필요", status: "pending" },
  ],
  update: {
    author: "LJ",
    text: "3페이지 시안 반영했고 수치만 확인하면 돼요.",
    time: "12분 전",
  },
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMilestoneDetail(_projectId: string | undefined) {
  const [data] = useState<MilestoneDetailData>(MOCK_MILESTONE);
  return { data, loading: false, error: null as Error | null };
}
