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
  /** 담당자 이니셜 — 프론트 전용(백엔드 스키마에 없음). 마감 임박 카드 등에서 쓴다. */
  assignees?: string[];
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

/** D-3 / D-day / D+2 */
export function ddayLabel(dateStr: string): string {
  const left = daysLeft(dateStr);
  if (left === 0) return "D-day";
  return left > 0 ? `D-${left}` : `D+${-left}`;
}

/**
 * 마감이 가까운 순 정렬 — 다가오는 일정을 앞에 두고(가까운 순),
 * 이미 지난 일정은 뒤에 최근 것부터 놓는다.
 */
export function byImminence(a: Schedule, b: Schedule): number {
  const la = daysLeft(a.date);
  const lb = daysLeft(b.date);
  const aPast = la < 0;
  const bPast = lb < 0;
  if (aPast !== bPast) return aPast ? 1 : -1;
  return aPast ? lb - la : la - lb;
}

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "7월 30일 수요일 오전 10시 마감" 형태 — 마감 임박 카드/마일스톤 헤더용 */
export function formatScheduleDatetime(s: Schedule): string {
  const d = new Date(s.date + "T00:00:00");
  const [hh, mm] = s.startTime.split(":").map(Number);
  const ampm = hh < 12 ? "오전" : "오후";
  const hour12 = hh % 12 === 0 ? 12 : hh % 12;
  const time = mm === 0 ? `${ampm} ${hour12}시` : `${ampm} ${hour12}시 ${mm}분`;
  const suffix = s.type === "deadline" ? " 마감" : "";
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_KO[d.getDay()]}요일 ${time}${suffix}`;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드가 아직 준비되지 않아 하드코딩만 사용한다. 백엔드 GET /schedules/me가
// 준비되면 이 파일 내부만 fetch 기반으로 교체 — 화면 쪽은 건드릴 필요 없음.
// 오늘 기준 상대 날짜로 만들어 D-day가 항상 유효하다. projectId/이름은
// useProjects.ts의 MOCK_PROJECTS와 맞춰져 있다.

const today = new Date();

// 이 배열이 앱 전체 일정의 유일한 출처다 — 캘린더, 프로젝트 상세의 다가오는
// 일정/마감 임박, 전체 일정 화면, 마일스톤 상세가 모두 여기서 파생된다.

const MOCK_SCHEDULES: Schedule[] = [
  // ── 프로젝트 루프 ──
  {
    id: "s1", projectId: "1", projectName: "프로젝트 루프",
    title: "스프린트 회고",
    date: toLocalDateStr(addDays(today, -2)), startTime: "16:00", endTime: "17:00",
    type: "meeting", reminder: false, assignees: ["KM"],
  },
  {
    id: "s2", projectId: "1", projectName: "프로젝트 루프",
    title: "UI 시안 최종 전달",
    date: toLocalDateStr(addDays(today, 1)), startTime: "10:00", endTime: "11:00",
    type: "deadline", reminder: true, assignees: ["LJ"],
  },
  {
    id: "s3", projectId: "1", projectName: "프로젝트 루프",
    title: "중간 발표 자료 제출",
    date: toLocalDateStr(addDays(today, 3)), startTime: "10:00", endTime: "11:00",
    type: "deadline", reminder: true, assignees: ["KM", "LJ"],
  },
  {
    id: "s4", projectId: "1", projectName: "프로젝트 루프",
    title: "클라이언트 검토 미팅",
    date: toLocalDateStr(addDays(today, 7)), startTime: "14:00", endTime: "15:30",
    type: "meeting", reminder: false, assignees: ["KM"],
  },
  {
    id: "s5", projectId: "1", projectName: "프로젝트 루프",
    title: "최종 산출물 납품",
    date: toLocalDateStr(addDays(today, 14)), startTime: "18:00", endTime: "18:30",
    type: "deadline", reminder: true, assignees: ["PJ"],
  },

  // ── 오로라 리브랜딩 ──
  {
    id: "s6", projectId: "2", projectName: "오로라 리브랜딩",
    title: "무드보드 정리",
    date: toLocalDateStr(addDays(today, -4)), startTime: "11:00", endTime: "12:00",
    type: "milestone", reminder: false, assignees: ["SH"],
  },
  {
    id: "s7", projectId: "2", projectName: "오로라 리브랜딩",
    title: "브랜드 가이드 리뷰",
    date: toLocalDateStr(addDays(today, 2)), startTime: "13:00", endTime: "14:00",
    type: "meeting", reminder: true, assignees: ["MG"],
  },
  {
    id: "s8", projectId: "2", projectName: "오로라 리브랜딩",
    title: "로고 시안 3차 공유",
    date: toLocalDateStr(addDays(today, 9)), startTime: "11:00", endTime: "12:00",
    type: "milestone", reminder: false, assignees: ["OS", "SH"],
  },
  {
    id: "s9", projectId: "2", projectName: "오로라 리브랜딩",
    title: "리브랜딩 발표",
    date: toLocalDateStr(addDays(today, 21)), startTime: "15:00", endTime: "16:00",
    type: "deadline", reminder: true, assignees: ["MG"],
  },

  // ── 캠페인 라디오 ──
  {
    id: "s10", projectId: "3", projectName: "캠페인 라디오",
    title: "캠페인 킥오프 미팅",
    date: toLocalDateStr(addDays(today, -6)), startTime: "10:00", endTime: "11:00",
    type: "meeting", reminder: false, assignees: ["SJ"],
  },
  {
    id: "s11", projectId: "3", projectName: "캠페인 라디오",
    title: "캠페인 콘셉트 확정",
    date: toLocalDateStr(addDays(today, 5)), startTime: "16:00", endTime: "17:00",
    type: "deadline", reminder: true, assignees: ["SJ"],
  },
  {
    id: "s12", projectId: "3", projectName: "캠페인 라디오",
    title: "라디오 광고 녹음",
    date: toLocalDateStr(addDays(today, 12)), startTime: "09:00", endTime: "12:00",
    type: "milestone", reminder: true, assignees: ["NA"],
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
