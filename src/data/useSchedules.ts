import { useCallback, useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 일정 유형·마감 리마인드 여부는 백엔드 스키마(ScheduleResponse)에 없는 프론트 전용 필드. */
export type ScheduleType = "deadline" | "meeting" | "milestone";

export interface Schedule {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  type: ScheduleType;
  reminder: boolean;
}

/** Calendar 화면의 일정 등록 폼이 넘기는 입력값 */
export interface ScheduleDraft {
  projectId: string;
  projectName?: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  type: ScheduleType;
  reminder: boolean;
}

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

export function daysLeft(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드가 아직 준비되지 않아 하드코딩만 사용한다. 백엔드 GET /schedules/me가
// 준비되면 이 파일 내부만 fetch 기반으로 교체 — 화면 쪽은 건드릴 필요 없음.
// 오늘 기준 상대 날짜로 만들어 D-day가 항상 유효하다. projectId/이름은
// useProjects.ts의 MOCK_PROJECTS와 맞춰져 있다.

const today = new Date();

const MOCK_SCHEDULES: Schedule[] = [
  {
    id: "s1",
    projectId: "1",
    projectName: "프로젝트 루프",
    title: "UI 시안 최종 전달",
    date: toLocalDateStr(addDays(today, 1)),
    startTime: "10:00",
    endTime: "11:00",
    type: "deadline",
    reminder: true,
  },
  {
    id: "s2",
    projectId: "3",
    projectName: "캠페인 라디오",
    title: "온보딩 플로우 개선",
    date: toLocalDateStr(addDays(today, 7)),
    startTime: "14:00",
    endTime: "15:00",
    type: "milestone",
    reminder: true,
  },
  {
    id: "s3",
    projectId: "2",
    projectName: "오로라 리브랜딩",
    title: "브랜드 가이드 리뷰",
    date: toLocalDateStr(addDays(today, 3)),
    startTime: "13:00",
    endTime: "14:00",
    type: "meeting",
    reminder: false,
  },
  {
    id: "s4",
    projectId: "1",
    projectName: "프로젝트 루프",
    title: "스프린트 회고",
    date: toLocalDateStr(addDays(today, -2)),
    startTime: "16:00",
    endTime: "17:00",
    type: "meeting",
    reminder: false,
  },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>(MOCK_SCHEDULES);

  const addSchedule = useCallback(async (draft: ScheduleDraft): Promise<Schedule> => {
    const created: Schedule = { id: crypto.randomUUID(), ...draft };
    setSchedules((prev) => [...prev, created]);
    return created;
  }, []);

  return { schedules, addSchedule, loading: false };
}
