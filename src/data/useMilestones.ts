/**
 * useMilestones
 *
 * 마일스톤 = 팀이 특정 시점까지 달성해야 하는 공동 목표.
 * 일정(useSchedules.ts)과의 관계는 1:N이다 — 일정은 마일스톤을 달성하기 위해
 * 구성원별로 수행하는 날짜 기반 실행 항목이고, 마일스톤에 속하지 않는
 * 일정(개인 약속 등)은 milestoneId가 비어 있다.
 *
 * 완료는 저장하지 않고 파생한다: 연결된 일정이 모두 체크되면 그 마일스톤은
 * 완료다. 그래서 캘린더에서 개인이 일정을 체크하면 프로젝트 상세의 전체
 * 진행률이 곧바로 올라간다.
 *
 * 백엔드 — api/openapi.yaml에 마일스톤 리소스가 아직 없다. 생기면
 * (GET/POST /projects/{projectId}/milestones) 이 파일 내부만 fetch로 바꾸면
 * 되고, 소비하는 화면·훅은 그대로다.
 */

import { useCallback, useMemo, useState } from "react";
import { useSchedulesContext } from "./SchedulesContext";
import { daysLeft, type Schedule } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  /** 목표일 — YYYY-MM-DD. 일정과 달리 시각은 갖지 않는다(팀 목표라 하루 단위). */
  dueDate: string;
}

/** 추가 폼이 넘기는 입력값 */
export interface MilestoneDraft {
  title: string;
  dueDate: string;
}

/** 화면이 읽는 형태 — 연결된 일정에서 파생한 진행 상태가 붙어 있다. */
export interface MilestoneView extends Milestone {
  dday: number;
  /** 연결된 일정이 하나 이상이고 전부 완료됐으면 true */
  done: boolean;
  doneCount: number;
  totalCount: number;
  /** 연결된 일정의 완료 비율(%) — 연결이 없으면 0 */
  readyPercent: number;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// useProjects.ts의 MOCK_PROJECTS, useSchedules.ts의 MOCK_SCHEDULES와 id가
// 1:1로 맞춰져 있다. 일정 쪽 milestoneId가 여기 id를 가리킨다.
// 오늘 기준 상대 날짜라 D-day가 항상 유효하다.

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dueIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return toLocalDateStr(d);
}

const MOCK_MILESTONES: Milestone[] = [
  // ── 프로젝트 루프 ──
  { id: "m1", projectId: "1", title: "스프린트 1 마무리", dueDate: dueIn(-2) },
  { id: "m2", projectId: "1", title: "UI 시안 확정", dueDate: dueIn(1) },
  { id: "m3", projectId: "1", title: "중간 발표", dueDate: dueIn(3) },
  { id: "m4", projectId: "1", title: "최종 산출물 납품", dueDate: dueIn(14) },

  // ── 오로라 리브랜딩 ──
  { id: "m5", projectId: "2", title: "무드보드 확정", dueDate: dueIn(-4) },
  { id: "m6", projectId: "2", title: "브랜드 가이드 확정", dueDate: dueIn(2) },
  { id: "m7", projectId: "2", title: "리브랜딩 발표", dueDate: dueIn(21) },

  // ── 캠페인 라디오 ──
  { id: "m8", projectId: "3", title: "캠페인 킥오프", dueDate: dueIn(-6) },
  { id: "m9", projectId: "3", title: "캠페인 콘셉트 확정", dueDate: dueIn(5) },
  { id: "m10", projectId: "3", title: "라디오 광고 제작", dueDate: dueIn(12) },
];

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "7월 30일 수요일 목표" — 마일스톤 헤더용. 일정과 달리 시각이 없다. */
export function formatMilestoneDue(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_KO[d.getDay()]}요일 목표`;
}

/** 목표일이 가까운 순 — 다가오는 것을 앞에, 지난 것은 뒤에 최근 것부터. */
export function byDue(a: Milestone, b: Milestone): number {
  const la = daysLeft(a.dueDate);
  const lb = daysLeft(b.dueDate);
  const aPast = la < 0;
  const bPast = lb < 0;
  if (aPast !== bPast) return aPast ? 1 : -1;
  return aPast ? lb - la : la - lb;
}

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/**
 * 연결된 일정에서 완료 상태를 파생한다.
 *
 * 연결된 일정이 0개면 미완료로 둔다 — 공집합을 "전부 완료"로 보면 방금 만든
 * 마일스톤이 곧바로 달성 처리되어 진행률이 거짓으로 오른다.
 */
export function toView(milestone: Milestone, linked: Schedule[]): MilestoneView {
  const totalCount = linked.length;
  const doneCount = linked.filter((s) => s.checked === true).length;

  return {
    ...milestone,
    dday: daysLeft(milestone.dueDate),
    done: totalCount > 0 && doneCount === totalCount,
    doneCount,
    totalCount,
    readyPercent: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
  };
}

/** 프로젝트 진행률 — 달성한 마일스톤 수가 곧 진행률이다. */
export interface MilestoneProgress {
  percent: number;
  done: number;
  total: number;
}

/**
 * 진행률 계산은 반드시 이 함수 하나만 쓴다.
 *
 * 프로젝트 목록(ProjectSelect)과 프로젝트 상세(useProjectDetail)가 각자
 * 계산하던 때에는 같은 프로젝트가 68%와 50%로 다르게 보였다 — 계산식이 한
 * 곳에만 있으면 그런 어긋남이 생길 수 없다.
 */
export function progressOf(milestones: MilestoneView[]): MilestoneProgress {
  const total = milestones.length;
  const done = milestones.filter((m) => m.done).length;
  return {
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    done,
    total,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 마일스톤 API가 생기면 이 훅 내부만 fetch로 교체.

export function useMilestones() {
  const { schedules } = useSchedulesContext();
  const [milestones, setMilestones] = useState<Milestone[]>(MOCK_MILESTONES);

  const views = useMemo(() => {
    // 일정을 milestoneId로 한 번만 묶어두고 각 마일스톤이 꺼내 쓴다.
    const byMilestone = new Map<string, Schedule[]>();
    for (const s of schedules) {
      if (!s.milestoneId) continue;
      const bucket = byMilestone.get(s.milestoneId);
      if (bucket) bucket.push(s);
      else byMilestone.set(s.milestoneId, [s]);
    }
    return milestones.map((m) => toView(m, byMilestone.get(m.id) ?? []));
  }, [milestones, schedules]);

  /**
   * 마일스톤을 추가한다.
   *
   * 지금은 로컬 배열에 넣는다 — 백엔드가 생기면 여기서 POST를 보내고 응답으로
   * 배열을 갱신하도록 바꾸면 되고, 호출하는 화면은 그대로다. 그래서 지금부터
   * Promise를 돌려준다(나중에 시그니처가 바뀌지 않도록).
   */
  const addMilestone = useCallback(
    async (projectId: string, draft: MilestoneDraft): Promise<Milestone> => {
      const created: Milestone = {
        id: `local-m-${Date.now()}`,
        projectId,
        title: draft.title.trim(),
        dueDate: draft.dueDate,
      };
      setMilestones((prev) => [...prev, created]);
      return created;
    },
    [],
  );

  return { milestones: views, addMilestone };
}
