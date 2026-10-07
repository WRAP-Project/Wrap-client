/**
 * useProjectTimeline
 *
 * 프로젝트 "전체 일정" 화면이 읽는 한 덩어리.
 *
 * 이 프로젝트에 걸린 것 전부를 날짜 하나로 줄 세운다:
 *   마일스톤 — 팀이 특정 시점까지 달성해야 하는 공동 목표
 *   태스크   — 그 목표를 위해 구성원별로 수행하는 날짜 기반 실행 항목(= 일정)
 *   일정     — 마일스톤과 무관하게 따로 등록한 캘린더 일정
 *
 * 세 출처를 화면에서 합치지 않고 여기서 합치는 이유는, 정렬·D-day·"내 일정"
 * 판정이 셋 모두에 같은 규칙으로 걸려야 해서다 — 화면마다 따로 계산하면
 * 같은 항목이 화면마다 다른 날짜 순서로 보인다.
 */

import { useMemo } from "react";
import { useAuthContext } from "./AuthContext";
import { useProjectMilestones } from "./MilestonesContext";
import { useProjectSchedules } from "./SchedulesContext";
import { daysLeft } from "./useSchedules";
import { isTaskStalled, TASK_STATUS_LABEL, useProjectTasks } from "./useTasks";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type TimelineKind = "milestone" | "task" | "schedule";

/** 전체 일정 목록의 한 줄 */
export interface TimelineItem {
  /** 목록 key. 종류가 섞이므로 출처 id를 그대로 쓰면 충돌할 수 있어 접두사를 붙인다. */
  key: string;
  kind: TimelineKind;
  title: string;
  /** 목표일·마감일(YYYY-MM-DD). 기한 없는 태스크는 null. */
  date: string | null;
  /** 기한 없는 항목은 null — 화면이 D-day 뱃지 대신 "기한 없음"을 보인다. */
  dday: number | null;
  /** 시작 시각(HH:mm) — 시각을 가진 건 캘린더 일정뿐이다. */
  time?: string;
  done: boolean;
  /** 부제 — 담당자 / 작업 진행 / 상태 문구 */
  subtitle?: string;
  /** 부제를 경고색으로 — 보류·검토 필요처럼 끌어올려야 하는 상태 */
  alert: boolean;
  /** "내 일정" 필터가 남길 항목인지 */
  mine: boolean;
  /** 눌렀을 때 열 마일스톤 상세. 열 곳이 없으면 null(일정·미연결 태스크). */
  milestoneId: string | null;
}

// ── 정렬 ──────────────────────────────────────────────────────────────────────

/**
 * 다가오는 것을 가까운 순으로 앞에, 지난 것은 뒤에 최근 것부터.
 * 기한 없는 항목은 비교할 날짜가 없으므로 맨 뒤로 보낸다.
 *
 * useSchedules의 byImminence와 같은 규칙이다 — 종류가 섞여도 사용자가 보는
 * 순서 규칙은 하나여야 한다.
 */
function byImminence(a: TimelineItem, b: TimelineItem): number {
  if (a.dday === null || b.dday === null) {
    if (a.dday === b.dday) return a.title.localeCompare(b.title);
    return a.dday === null ? 1 : -1;
  }
  const aPast = a.dday < 0;
  const bPast = b.dday < 0;
  if (aPast !== bPast) return aPast ? 1 : -1;
  return aPast ? b.dday - a.dday : a.dday - b.dday;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjectTimeline(projectId: string | undefined) {
  const milestones = useProjectMilestones(projectId);
  const { tasks, loading: tasksLoading } = useProjectTasks(projectId);
  const schedules = useProjectSchedules(projectId);
  const { member } = useAuthContext();
  const myNickname = member?.nickname ?? null;

  const items = useMemo<TimelineItem[]>(() => {
    const milestoneRows: TimelineItem[] = milestones.map((m) => ({
      key: `m-${m.id}`,
      kind: "milestone",
      title: m.title,
      date: m.dueDate,
      dday: m.dday,
      done: m.done,
      subtitle: m.done
        ? "달성"
        : m.totalCount === 0
          ? "연결된 일정 없음"
          : `일정 ${m.doneCount}/${m.totalCount} 완료`,
      alert: false,
      // 마일스톤은 팀 공동 목표라 개인에게 배정되지 않는다 — "내 일정"에서는 빠진다.
      mine: false,
      milestoneId: m.id,
    }));

    const taskRows: TimelineItem[] = tasks.map((t) => ({
      key: `t-${t.id}`,
      kind: "task",
      title: t.title,
      date: t.dueDate ?? null,
      dday: t.dueDate ? daysLeft(t.dueDate) : null,
      done: t.status === "DONE",
      // 담당자가 먼저다 — 누구 일인지가 목록에서 가장 먼저 읽혀야 한다.
      subtitle: isTaskStalled(t.status)
        ? TASK_STATUS_LABEL[t.status]
        : (t.assignee?.nickname ?? "담당 미정"),
      alert: isTaskStalled(t.status),
      mine: myNickname !== null && t.assignee?.nickname === myNickname,
      milestoneId: t.milestoneId,
    }));

    const scheduleRows: TimelineItem[] = schedules.map((s) => ({
      key: `s-${s.id}`,
      kind: "schedule",
      title: s.title,
      date: s.date,
      dday: daysLeft(s.date),
      time: s.startTime,
      done: s.checked === true,
      subtitle: s.assignees?.length ? s.assignees.join(", ") : undefined,
      alert: false,
      // 일정은 담당자를 이니셜로만 들고 있어 닉네임으로 맞출 수 없다.
      // 따로 등록한 일정은 등록한 사람의 것으로 보고 "내 일정"에 남긴다.
      mine: true,
      milestoneId: null,
    }));

    return [...milestoneRows, ...taskRows, ...scheduleRows].sort(byImminence);
  }, [milestones, tasks, schedules, myNickname]);

  return { items, loading: tasksLoading };
}

/** 특정 날짜에 걸린 항목 수 — 달력 카드의 "예정된 일정 n개" */
export function countOnDate(items: TimelineItem[], date: string): number {
  return items.filter((i) => i.date === date).length;
}
