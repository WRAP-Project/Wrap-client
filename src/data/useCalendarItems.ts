/**
 * 캘린더가 표시할 날짜 항목을 한 곳에서 조립한다.
 *
 * Schedule과 Milestone은 서버에서 서로 다른 엔티티다. 마일스톤을 일정으로
 * 복제하지 않고, 화면에 그릴 때만 공통 CalendarItem으로 합쳐 데이터의 원본을
 * 하나씩 유지한다.
 */

import { useMemo } from "react";
import { useMilestonesContext, type MilestoneView } from "./MilestonesContext";
import { useSchedulesContext } from "./SchedulesContext";
import type { Schedule } from "./useSchedules";

export type CalendarItem =
  | {
      key: string;
      kind: "schedule";
      id: string;
      projectId: string;
      title: string;
      date: string;
      schedule: Schedule;
    }
  | {
      key: string;
      kind: "milestone";
      id: string;
      projectId: string;
      title: string;
      date: string;
      milestone: MilestoneView;
    };

export type CalendarMilestoneItem = Extract<CalendarItem, { kind: "milestone" }>;

export function useCalendarItems(projectId: string | null) {
  const { schedules } = useSchedulesContext();
  const { milestones, loading: milestonesLoading, error: milestonesError } = useMilestonesContext();

  const items = useMemo<CalendarItem[]>(() => {
    const scheduleItems: CalendarItem[] = schedules
      .filter((schedule) => projectId === null || schedule.projectId === projectId)
      .map((schedule) => ({
        key: `schedule:${schedule.id}`,
        kind: "schedule",
        id: schedule.id,
        projectId: schedule.projectId,
        title: schedule.title,
        date: schedule.date,
        schedule,
      }));

    const milestoneItems: CalendarItem[] = milestones
      .filter((milestone) => projectId === null || milestone.projectId === projectId)
      .map((milestone) => ({
        key: `milestone:${milestone.id}`,
        kind: "milestone",
        id: milestone.id,
        projectId: milestone.projectId,
        title: milestone.title,
        date: milestone.dueDate,
        milestone,
      }));

    return [...scheduleItems, ...milestoneItems];
  }, [milestones, projectId, schedules]);

  const milestoneItems = useMemo<CalendarMilestoneItem[]>(
    () => items.filter((item): item is CalendarMilestoneItem => item.kind === "milestone"),
    [items],
  );

  return { items, milestoneItems, milestonesLoading, milestonesError };
}

