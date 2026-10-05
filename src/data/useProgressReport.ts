/**
 * useProgressReport
 *
 * 진행 리포트(`/project/:projectId/report`)는 프로젝트 상세의 "전체 진행률"
 * 카드를 눌러서 들어오는 화면이다. 그래서 두 화면의 퍼센트가 다르면 바로
 * 들킨다 — 리포트는 자체 숫자를 갖지 않고 상세와 **같은 마일스톤 목록**에서
 * 파생한다(progressOf 하나만 쓴다: useMilestones.ts).
 *
 * 영역별(기획/디자인/개발…) 집계는 이 앱의 데이터에 근거가 없다 — 마일스톤에
 * 업무 영역 필드가 없고 백엔드 계약(api/openapi.yaml)에도 없다. 그래서 그
 * 자리는 마일스톤별 진행(연결된 태스크 완료율)으로 채운다. 위험 알림도
 * 마찬가지로 목표일이 지난/임박한 마일스톤에서 만든다.
 *
 * 백엔드에 집계 엔드포인트(GET /projects/{projectId}/report 등)가 생기면 이
 * 훅 내부만 fetch로 교체한다 — 화면(screens/ProgressReport.tsx)은 그대로다.
 */

import { useMemo } from "react";
import { useMilestonesContext, useProjectMilestones } from "./MilestonesContext";
import { progressOf, type MilestoneView } from "./useMilestones";

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 마일스톤 한 줄 — 연결된 태스크 완료율을 바로 표시한다. */
export interface MilestoneProgressRow {
  id: string;
  title: string;
  /** 연결된 태스크의 완료 비율(%) — 연결이 없으면 0 */
  percent: number;
  /** 목표일이 지났는데 아직 달성이 아님 */
  delayed: boolean;
  /** 퍼센트 옆에 덧붙이는 짧은 상태말 — 없으면 퍼센트만 */
  note?: string;
}

export interface RiskAlert {
  /** 같은 마일스톤이 두 번 들어오지 않게 id를 키로 쓴다 */
  id: string;
  title: string;
  detail: string;
}

export interface ProgressReportData {
  /** 상세 화면과 동일 — 달성한 마일스톤 수가 곧 진행률이다 */
  percent: number;
  /** 달성한 마일스톤 수 */
  doneCount: number;
  /** 미달성 중 목표일이 남아 있는 것 */
  inProgressCount: number;
  /** 미달성인데 목표일이 지난 것 */
  needsCheckCount: number;
  milestones: MilestoneProgressRow[];
  risks: RiskAlert[];
  /** 마지막 마일스톤 목표일까지 남은 일수 — 마일스톤이 없으면 null */
  remainingDays: number | null;
}

const EMPTY_REPORT: ProgressReportData = {
  percent: 0,
  doneCount: 0,
  inProgressCount: 0,
  needsCheckCount: 0,
  milestones: [],
  risks: [],
  remainingDays: null,
};

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/** 위험으로 올릴 임박 기준 — 상세 화면의 D-Day 경고 뱃지와 같은 기준이다. */
const RISK_DDAY = 7;

/** 위험 알림은 많이 쌓여도 화면에서 다 읽히지 않는다 — 급한 것만 보여준다. */
const RISK_LIMIT = 3;

function taskDetail(m: MilestoneView): string {
  return m.totalCount === 0
    ? "연결된 작업이 없어 진행을 확인할 수 없습니다"
    : `작업 ${m.doneCount}/${m.totalCount} 완료`;
}

function toRow(m: MilestoneView): MilestoneProgressRow {
  const delayed = !m.done && m.dday < 0;
  return {
    id: m.id,
    title: m.title,
    percent: m.readyPercent,
    delayed,
    note: m.done
      ? "달성"
      : delayed
        ? "지연"
        : m.totalCount === 0
          ? "작업 없음"
          : undefined,
  };
}

/**
 * 목표일이 지난 것을 먼저, 그다음 임박한 것(D-7 이내)을 위험으로 올린다.
 * 달성한 마일스톤은 목표일이 지났어도 위험이 아니다.
 */
function buildRisks(milestones: MilestoneView[]): RiskAlert[] {
  const overdue = milestones
    .filter((m) => !m.done && m.dday < 0)
    .map((m) => ({
      id: m.id,
      title: `${m.title} 목표일이 ${-m.dday}일 지났어요`,
      detail: taskDetail(m),
    }));

  const imminent = milestones
    .filter((m) => !m.done && m.dday >= 0 && m.dday <= RISK_DDAY)
    .map((m) => ({
      id: m.id,
      title: `${m.title} 목표일이 D-${m.dday}예요`,
      detail: taskDetail(m),
    }));

  return [...overdue, ...imminent].slice(0, RISK_LIMIT);
}

function buildReport(milestones: MilestoneView[]): ProgressReportData {
  if (milestones.length === 0) return EMPTY_REPORT;

  const { percent } = progressOf(milestones);
  const unfinished = milestones.filter((m) => !m.done);

  // 남은 기간은 마지막 목표일까지다 — 상세 화면 진행 바의 오른쪽 끝과 같은 지점.
  const lastDday = Math.max(...milestones.map((m) => m.dday));

  return {
    percent,
    doneCount: milestones.length - unfinished.length,
    inProgressCount: unfinished.filter((m) => m.dday >= 0).length,
    needsCheckCount: unfinished.filter((m) => m.dday < 0).length,
    // 목록 순서는 상세 화면과 같다(목표일이 가까운 순) — 두 화면을 번갈아 봐도
    // 같은 줄이 같은 자리에 있어야 한다.
    milestones: milestones.map(toRow),
    risks: buildRisks(milestones),
    remainingDays: lastDday,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProgressReport(projectId: string | undefined) {
  const { loading, error } = useMilestonesContext();
  const milestones = useProjectMilestones(projectId);
  const data = useMemo(() => buildReport(milestones), [milestones]);
  return { data, loading, error };
}
