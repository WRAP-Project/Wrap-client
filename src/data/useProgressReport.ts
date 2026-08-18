import { useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface AreaProgress {
  area: string;
  percent: number;
  delayed: boolean;
  note?: string;
}

export interface RiskAlert {
  title: string;
  detail: string;
}

export interface ProgressReportData {
  percent: number;
  doneCount: number;
  inProgressCount: number;
  needsCheckCount: number;
  areas: AreaProgress[];
  risks: RiskAlert[];
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId}/report 준비되면 교체) ────────
// 화면 컴포넌트(screens/ProgressReport.tsx)는 건드릴 필요 없음.

const MOCK_REPORT: ProgressReportData = {
  percent: 67,
  doneCount: 6,
  inProgressCount: 3,
  needsCheckCount: 2,
  areas: [
    { area: "기획", percent: 100, delayed: false },
    { area: "디자인", percent: 78, delayed: false },
    { area: "개발", percent: 48, delayed: true, note: "지연" },
    { area: "마케팅", percent: 62, delayed: false },
  ],
  risks: [
    {
      title: "개발 일정이 계획보다 2일 늦어요",
      detail: "채널 API 연동이 오늘 전체 일정에 영향을 줍니다",
    },
  ],
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgressReport(_projectId: string | undefined) {
  const [data] = useState<ProgressReportData>(MOCK_REPORT);
  return { data, loading: false, error: null as Error | null };
}
