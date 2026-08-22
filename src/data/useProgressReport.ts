import { useMemo } from "react";

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
// percent·태스크 수치는 useProjectDetail.ts의 progress와 맞춰져 있다.

const MOCK_BY_PROJECT: Record<string, ProgressReportData> = {
  // 프로젝트 루프 — useProjectDetail progress 67%
  "1": {
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
  },

  // 오로라 리브랜딩 — 42%
  "2": {
    percent: 42,
    doneCount: 4,
    inProgressCount: 4,
    needsCheckCount: 1,
    areas: [
      { area: "브랜딩", percent: 60, delayed: false },
      { area: "디자인", percent: 45, delayed: false },
      { area: "마케팅", percent: 20, delayed: true, note: "지연" },
    ],
    risks: [
      {
        title: "런칭 채널 확정이 미뤄지고 있어요",
        detail: "마케팅 자산 제작 착수가 함께 밀립니다",
      },
    ],
  },

  // 캠페인 라디오 — 25%
  "3": {
    percent: 25,
    doneCount: 3,
    inProgressCount: 5,
    needsCheckCount: 1,
    areas: [
      { area: "기획", percent: 55, delayed: false },
      { area: "콘텐츠", percent: 30, delayed: false },
      { area: "개발", percent: 0, delayed: true, note: "착수 전" },
    ],
    risks: [
      {
        title: "랜딩 페이지 착수가 아직 시작되지 않았어요",
        detail: "콘셉트 확정(D-5) 이후로 일정이 몰릴 수 있습니다",
      },
    ],
  },
};

/** mock에 없는 프로젝트(새로 만든 프로젝트 등)는 빈 리포트 */
const EMPTY_REPORT: ProgressReportData = {
  percent: 0,
  doneCount: 0,
  inProgressCount: 0,
  needsCheckCount: 0,
  areas: [],
  risks: [],
};

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 GET /projects/{projectId}/report 준비되면 이 훅 내부만 fetch로 교체.

export function useProgressReport(projectId: string | undefined) {
  const data = useMemo(
    () => (projectId && MOCK_BY_PROJECT[projectId]) || EMPTY_REPORT,
    [projectId],
  );
  return { data, loading: false, error: null as Error | null };
}
