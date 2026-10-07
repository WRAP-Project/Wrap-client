/**
 * SchedulesContext
 *
 * 일정은 캘린더(등록/조회), 조율 상세, 팀 하루 일정이 함께 읽는 유일한 출처다.
 * 프로젝트 "전체 일정" 화면은 여기를 읽지 않는다 — 그 화면은 마일스톤 계층
 * (마일스톤 → 할 일)만 보여주고, 일정은 그 계층에 속하는 개념이 아니다.
 * 화면마다 useSchedules()를 따로 호출하면 캘린더에서 등록한 일정이
 * 다른 화면에 안 보이므로 Context로 전역화한다.
 *
 * 소비 측은 useSchedulesContext()만 알면 된다.
 * 내부가 mock인지 fetch인지는 이 파일 + useSchedules.ts 안에서만 결정된다.
 */

import { createContext, useContext, type ReactNode } from "react";
import {
  useSchedules,
  type Schedule,
  type ScheduleDraft,
  type ReminderChecklistState,
} from "./useSchedules";

export type { Schedule, ScheduleDraft, ReminderChecklistState };

interface SchedulesContextValue {
  schedules: Schedule[];
  addSchedule: (draft: ScheduleDraft) => Promise<Schedule>;
  /** 마감 리마인드 체크리스트 항목을 완료/막힘으로 바꾸거나 되돌린다. */
  setChecklistState: (scheduleId: string, itemId: string, state: ReminderChecklistState) => Promise<void>;
  reload: () => Promise<void>;
  loading: boolean;
  error: Error | null;
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
