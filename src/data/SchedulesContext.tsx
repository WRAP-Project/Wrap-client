/**
 * SchedulesContext
 *
 * 일정은 캘린더(등록/조회), 프로젝트 상세(다가오는 일정·마감 임박),
 * 전체 일정 화면, 마일스톤 상세가 함께 읽는 유일한 출처다.
 * 화면마다 useSchedules()를 따로 호출하면 캘린더에서 등록한 일정이
 * 다른 화면에 안 보이므로 Context로 전역화한다.
 *
 * 소비 측은 useSchedulesContext()만 알면 된다.
 * 내부가 mock인지 fetch인지는 이 파일 + useSchedules.ts 안에서만 결정된다.
 */

import { createContext, useContext, type ReactNode } from "react";
import { useSchedules, byImminence, type Schedule, type ScheduleDraft } from "./useSchedules";

export type { Schedule, ScheduleDraft };

interface SchedulesContextValue {
  schedules: Schedule[];
  addSchedule: (draft: ScheduleDraft) => Promise<Schedule>;
  loading: boolean;
}

const SchedulesContext = createContext<SchedulesContextValue | null>(null);

export function SchedulesProvider({ children }: { children: ReactNode }) {
  const value = useSchedules();
  return <SchedulesContext.Provider value={value}>{children}</SchedulesContext.Provider>;
}

export function useSchedulesContext(): SchedulesContextValue {
  const ctx = useContext(SchedulesContext);
  if (!ctx) {
    throw new Error("useSchedulesContext는 SchedulesProvider 안에서만 사용 가능합니다.");
  }
  return ctx;
}

/** 특정 프로젝트의 일정만 — 마감이 가까운 순으로 정렬해 돌려준다. */
export function useProjectSchedules(projectId: string | undefined): Schedule[] {
  const { schedules } = useSchedulesContext();
  if (!projectId) return [];
  return schedules.filter((s) => s.projectId === projectId).sort(byImminence);
}
