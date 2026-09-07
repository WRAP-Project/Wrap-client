import { useCallback, useEffect, useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";
import { clientIdOfServerProject, REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { useProjectsContext } from "./ProjectsContext";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ScheduleType = "deadline" | "meeting" | "milestone";

/** 마감 리마인드 체크리스트 항목의 진행 상태 */
export type ChecklistState = "done" | "inProgress" | "blocked";

/**
 * 마감 리마인드 카드를 펼치면 보이는 체크리스트 항목.
 * 백엔드 일정 체크 API는 일정 단위 checked만 제공한다. 서버 일정은 화면 호환을 위해
 * 단일 체크 항목으로 보여주고, mock 일정은 기존 체크리스트를 그대로 쓴다.
 */
export interface ChecklistItem {
  id: string;
  title: string;
  state: ChecklistState;
  /** "완료" / "진행 중" / "데이터 미수신" 등 상태 문구 */
  statusLabel: string;
  assignee: string;
  /** 막힘 신호 배너에서 쓰는 부가 정보 */
  assigneeRole?: string;
  assigneeInitials?: string;
}

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
  /** 마감 리마인드 체크리스트 — reminder가 true인 일정에만 채워진다. */
  checklist?: ChecklistItem[];
  source?: "mock" | "server";
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
// mock 프로젝트("1"~"3")는 서버 프로젝트가 아니므로 기존 데모 일정을 유지한다.
// 서버 프로젝트 일정은 GET /schedules/me 결과를 뒤에 붙인다.
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
    checklist: [
      { id: "c1", title: "발표 흐름 및 목차 확정", state: "done", statusLabel: "완료", assignee: "박희성" },
      { id: "c2", title: "키 비주얼 슬라이드 반영", state: "inProgress", statusLabel: "진행 중", assignee: "이제희" },
      {
        id: "c3", title: "발표 수치 검증 대기", state: "blocked", statusLabel: "데이터 미수신",
        assignee: "김민지", assigneeRole: "디자인", assigneeInitials: "KM",
      },
    ],
  },
  {
    id: "s3", projectId: "1", projectName: "프로젝트 루프",
    title: "중간 발표 자료 제출",
    date: toLocalDateStr(addDays(today, 3)), startTime: "10:00", endTime: "11:00",
    type: "deadline", reminder: true, assignees: ["KM", "LJ"],
    checklist: [
      { id: "c4", title: "발표 대본 초안", state: "done", statusLabel: "완료", assignee: "이주연" },
      {
        id: "c5", title: "검증 데이터 취합", state: "blocked", statusLabel: "데이터 미수신",
        assignee: "정하늘", assigneeRole: "QA", assigneeInitials: "JH",
      },
    ],
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
    checklist: [
      { id: "c6", title: "산출물 패키징", state: "inProgress", statusLabel: "진행 중", assignee: "박준" },
    ],
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
    checklist: [
      { id: "c7", title: "리뷰 안건 정리", state: "inProgress", statusLabel: "진행 중", assignee: "문가온" },
    ],
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
    checklist: [
      { id: "c8", title: "콘셉트 후보 정리", state: "done", statusLabel: "완료", assignee: "서지훈" },
      { id: "c9", title: "채널 믹스 검토", state: "inProgress", statusLabel: "진행 중", assignee: "노아린" },
    ],
  },
  {
    id: "s12", projectId: "3", projectName: "캠페인 라디오",
    title: "라디오 광고 녹음",
    date: toLocalDateStr(addDays(today, 12)), startTime: "09:00", endTime: "12:00",
    type: "milestone", reminder: true, assignees: ["NA"],
  },
];

type ScheduleResponse = components["schemas"]["ScheduleResponse"];
type ScheduleDetailResponse = components["schemas"]["ScheduleDetailResponse"];

const SERVER_SCHEDULE_PREFIX = "srv-sch-";

function clientScheduleIdOf(id: number): string {
  return `${SERVER_SCHEDULE_PREFIX}${id}`;
}

function serverScheduleIdOf(id: string): number | null {
  if (!id.startsWith(SERVER_SCHEDULE_PREFIX)) return null;
  const n = Number(id.slice(SERVER_SCHEDULE_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}

function dateTimeOf(date: string, time: string): string {
  return `${date}T${time.length === 5 ? `${time}:00` : time}`;
}

function splitDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: toLocalDateStr(new Date()), time: "00:00" };
  const [date, rawTime = "00:00:00"] = value.split("T");
  return { date, time: rawTime.slice(0, 5) };
}

function normalizeType(type: ScheduleResponse["type"] | undefined): ScheduleType {
  return type ?? "meeting";
}

function serverProjectName(projectId: number | undefined, projects: { id: string; name: string }[]): string | undefined {
  if (projectId === undefined) return undefined;
  return projects.find((p) => serverIdOf(p.id) === projectId)?.name;
}

function serverProjectClientId(projectId: number | undefined): string {
  return projectId === undefined ? "" : clientIdOfServerProject(projectId);
}

function checklistForServerSchedule(schedule: ScheduleDetailResponse | ScheduleResponse): ChecklistItem[] | undefined {
  if (!schedule.reminder || schedule.id === undefined) return undefined;
  const checked = "checked" in schedule ? schedule.checked === true : false;
  const assignee = "creatorNickname" in schedule ? schedule.creatorNickname : undefined;
  return [
    {
      id: `${clientScheduleIdOf(schedule.id)}-checked`,
      title: "일정 확인",
      state: checked ? "done" : "inProgress",
      statusLabel: checked ? "완료" : "진행 중",
      assignee: assignee ?? "담당자",
      assigneeInitials: assignee?.slice(0, 2).toUpperCase(),
    },
  ];
}

function mapScheduleResponse(
  schedule: ScheduleResponse | ScheduleDetailResponse,
  projects: { id: string; name: string }[],
): Schedule | null {
  if (schedule.id === undefined || !schedule.title || !schedule.startAt || !schedule.endAt) return null;
  const start = splitDateTime(schedule.startAt);
  const end = splitDateTime(schedule.endAt);
  return {
    id: clientScheduleIdOf(schedule.id),
    projectId: serverProjectClientId(schedule.projectId),
    projectName: "projectName" in schedule ? schedule.projectName : serverProjectName(schedule.projectId, projects),
    title: schedule.title,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    type: normalizeType(schedule.type),
    reminder: schedule.reminder ?? false,
    assignees: "creatorNickname" in schedule && schedule.creatorNickname ? [schedule.creatorNickname.slice(0, 2).toUpperCase()] : [],
    checklist: checklistForServerSchedule(schedule),
    source: "server",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSchedules() {
  const { projects } = useProjectsContext();
  const [schedules, setSchedules] = useState<Schedule[]>(MOCK_SCHEDULES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { data, response } = await apiClient.GET("/schedules/me", {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error?.message ?? "일정을 불러오지 못했습니다.");
      }
      const serverSchedules = (data?.data ?? [])
        .map((schedule) => mapScheduleResponse(schedule, projects))
        .filter((schedule): schedule is Schedule => schedule !== null);
      setSchedules([...MOCK_SCHEDULES, ...serverSchedules]);
      setError(null);
    } catch (e) {
      setSchedules(MOCK_SCHEDULES);
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e
          : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setLoading(false);
    }
  }, [projects]);

  useEffect(() => {
    void loadSchedules();
  }, [loadSchedules]);

  const addSchedule = useCallback(async (draft: ScheduleDraft): Promise<Schedule> => {
    const projectId = serverIdOf(draft.projectId);
    if (projectId === null) {
      const created: Schedule = { id: crypto.randomUUID(), ...draft, source: "mock" };
      setSchedules((prev) => [...prev, created]);
      return created;
    }

    const { data, response } = await apiClient.POST("/schedules", {
      body: {
        projectId,
        title: draft.title,
        startAt: dateTimeOf(draft.date, draft.startTime),
        endAt: dateTimeOf(draft.date, draft.endTime),
        shared: true,
        type: draft.type,
        reminder: draft.reminder,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok || data?.success === false || !data?.data) {
      throw new Error(data?.error?.message ?? "일정 등록에 실패했습니다.");
    }

    const created = mapScheduleResponse(data.data, projects);
    if (!created) throw new Error("일정 응답을 해석하지 못했습니다.");
    setSchedules((prev) => [...prev, created]);
    return created;
  }, [projects]);

  /** 체크리스트 항목 완료 토글 — 완료 ↔ 진행 중(막힘 항목도 완료 처리 가능). */
  const toggleChecklistItem = useCallback(async (scheduleId: string, itemId: string) => {
    const serverScheduleId = serverScheduleIdOf(scheduleId);
    if (serverScheduleId !== null) {
      const current = schedules.find((s) => s.id === scheduleId);
      const checked = current?.checklist?.find((item) => item.id === itemId)?.state === "done";
      const path = checked ? "/schedules/{scheduleId}/uncheck" : "/schedules/{scheduleId}/check";
      const { data, response } = await apiClient.PATCH(path, {
        params: { path: { scheduleId: serverScheduleId } },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok || data?.success === false || !data?.data) {
        throw new Error(data?.error?.message ?? "일정 체크 상태를 변경하지 못했습니다.");
      }
      const updated = mapScheduleResponse(data.data, projects);
      if (!updated) return;
      setSchedules((prev) => prev.map((s) => (s.id === scheduleId ? updated : s)));
      return;
    }

    setSchedules((prev) =>
      prev.map((s) => {
        if (s.id !== scheduleId || !s.checklist) return s;
        return {
          ...s,
          checklist: s.checklist.map((item) => {
            if (item.id !== itemId) return item;
            return item.state === "done"
              ? { ...item, state: "inProgress", statusLabel: "진행 중" }
              : { ...item, state: "done", statusLabel: "완료" };
          }),
        };
      }),
    );
  }, [projects, schedules]);

  return { schedules, addSchedule, toggleChecklistItem, reload: loadSchedules, loading, error };
}
