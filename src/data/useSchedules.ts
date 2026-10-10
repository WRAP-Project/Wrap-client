import { useCallback, useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";
import { clientIdOfServerProject, REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { useProjectsContext } from "./ProjectsContext";
import { initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { milestoneServerIdOf } from "./milestoneId";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ScheduleType = "deadline" | "meeting" | "milestone";

/** 마감 리마인드 체크리스트 항목의 진행 상태 */
export type ReminderChecklistState = "pending" | "done" | "inProgress" | "blocked";
export type ReminderChecklistSource = "milestone" | "task" | "schedule" | "aiUpdate";

/**
 * 마감 리마인드 카드를 펼치면 보이는 체크리스트 항목.
 * 직접 생성하는 데이터가 아니라 마일스톤/태스크/일정/AI 업데이트를 모은 리마인드 집계 결과다.
 */
export interface ReminderChecklistItem {
  id: string;
  sourceType: ReminderChecklistSource;
  sourceId?: number;
  title: string;
  state: ReminderChecklistState;
  /** "완료" / "진행 중" / "데이터 미수신" 등 상태 문구 */
  statusLabel: string;
  assignee?: string;
  /** 막힘 신호 배너에서 쓰는 부가 정보 */
  assigneeRole?: string;
  assigneeInitials?: string;
  dueDate?: string;
}

export interface Schedule {
  id: string;
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  date: string;       // YYYY-MM-DD
  startTime: string;  // HH:mm
  endTime: string;    // HH:mm
  type: ScheduleType;
  reminder: boolean;
  checked?: boolean;
  /** 담당자 이니셜 — 프론트 전용(백엔드 스키마에 없음). 마감 임박 카드 등에서 쓴다. */
  assignees?: string[];
  /** 마감 리마인드 API가 내려준 표시 대상 여부. */
  isDeadlineReminder?: boolean;
  /** 마감 리마인드 집계 체크리스트. */
  reminderChecklist?: ReminderChecklistItem[];
  source?: "server";
}

/**
 * Calendar 화면의 일정 등록 폼이 넘기는 입력값.
 *
 * reminder는 받지 않는다 — 캘린더 하단 목록이 리마인드 여부와 무관하게 그 날짜의
 * 모든 일정을 보여주므로, 폼에서 켜고 끌 의미가 없다.
 */
export interface ScheduleDraft {
  projectId: string;
  projectName?: string;
  title: string;
  description?: string;
  date: string;
  startTime: string;
  endTime: string;
  type: ScheduleType;
  /**
   * 연결할 마일스톤(화면 id). 고르지 않고 등록할 수 있어 선택값이다.
   * 서버는 같은 프로젝트에 속한 마일스톤만 받는다 — 아니면 404.
   */
  milestoneId?: string;
}

/** 일정 제목 길이 상한 — ScheduleCreateRequest.title의 maxLength와 같다. */
export const SCHEDULE_TITLE_MAX = 100;

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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

// ── 일정의 출처 ───────────────────────────────────────────────────────────────
// 일정은 전부 서버에서 온다(GET /schedules/me). 이 훅이 돌려주는 schedules가
// 앱 전체 일정의 유일한 출처다 — 캘린더와 전체 일정 화면이 여기서 파생된다.
//
// 마일스톤과는 무관하다. 마일스톤을 이루는 건 태스크(useTasks.ts)이고, 일정은
// 캘린더 위의 시간 블록일 뿐이다 — 개인 일정도 될 수 있어 팀 목표의 달성
// 근거가 될 수 없다.

type ScheduleResponse = components["schemas"]["ScheduleResponse"];
type ScheduleDetailResponse = components["schemas"]["ScheduleDetailResponse"];
type ScheduleReminderResponse = components["schemas"]["ScheduleReminderResponse"] & {
  checklist?: ServerReminderChecklistItem[];
};

interface ServerReminderChecklistItem {
  id?: string;
  sourceType?: "MILESTONE" | "TASK" | "SCHEDULE" | "AI_UPDATE";
  sourceId?: number;
  title?: string;
  status?: "PENDING" | "IN_PROGRESS" | "DONE" | "BLOCKED";
  statusLabel?: string;
  assigneeNickname?: string;
  assigneeRole?: string;
  dueDate?: string;
}

const SERVER_SCHEDULE_PREFIX = "srv-sch-";

function clientScheduleIdOf(id: number): string {
  return `${SERVER_SCHEDULE_PREFIX}${id}`;
}

function serverScheduleIdOf(id: string): number | null {
  if (!id.startsWith(SERVER_SCHEDULE_PREFIX)) return null;
  const value = Number(id.slice(SERVER_SCHEDULE_PREFIX.length));
  return Number.isSafeInteger(value) && value > 0 ? value : null;
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

const SOURCE_MAP: Record<NonNullable<ServerReminderChecklistItem["sourceType"]>, ReminderChecklistSource> = {
  MILESTONE: "milestone",
  TASK: "task",
  SCHEDULE: "schedule",
  AI_UPDATE: "aiUpdate",
};

const STATUS_MAP: Record<NonNullable<ServerReminderChecklistItem["status"]>, ReminderChecklistState> = {
  PENDING: "pending",
  IN_PROGRESS: "inProgress",
  DONE: "done",
  BLOCKED: "blocked",
};

const SOURCE_TO_SERVER: Record<ReminderChecklistSource, NonNullable<ServerReminderChecklistItem["sourceType"]>> = {
  milestone: "MILESTONE",
  task: "TASK",
  schedule: "SCHEDULE",
  aiUpdate: "AI_UPDATE",
};

const STATUS_TO_SERVER: Record<ReminderChecklistState, NonNullable<ServerReminderChecklistItem["status"]>> = {
  pending: "PENDING",
  inProgress: "IN_PROGRESS",
  done: "DONE",
  blocked: "BLOCKED",
};

function mapReminderChecklistItem(item: ServerReminderChecklistItem): ReminderChecklistItem | null {
  if (!item.title) return null;
  const state = item.status ? STATUS_MAP[item.status] : "pending";
  const sourceType = item.sourceType ? SOURCE_MAP[item.sourceType] : "task";
  return {
    id: item.id ?? `${sourceType}-${item.sourceId ?? item.title}`,
    sourceType,
    sourceId: item.sourceId,
    title: item.title,
    state,
    statusLabel: item.statusLabel ?? statusLabelOf(state),
    assignee: item.assigneeNickname,
    assigneeRole: item.assigneeRole ? roleLabelOf(item.assigneeRole) : undefined,
    assigneeInitials: item.assigneeNickname ? initialsOf(item.assigneeNickname) : undefined,
    dueDate: item.dueDate,
  };
}

function statusLabelOf(state: ReminderChecklistState): string {
  if (state === "done") return "완료";
  if (state === "blocked") return "막힘";
  if (state === "pending") return "대기";
  return "진행 중";
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
    description: schedule.description,
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    type: normalizeType(schedule.type),
    reminder: schedule.reminder ?? false,
    checked: "checked" in schedule ? schedule.checked === true : undefined,
    assignees: "creatorNickname" in schedule && schedule.creatorNickname ? [schedule.creatorNickname.slice(0, 2).toUpperCase()] : [],
    source: "server",
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useSchedules() {
  const { projects } = useProjectsContext();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
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
      const reminderByScheduleId = new Map<string, ReminderChecklistItem[]>();
      const deadlineReminderScheduleIds = new Set<string>();
      const serverProjectIds = projects
        .map((project) => serverIdOf(project.id))
        .filter((projectId): projectId is number => projectId !== null);

      await Promise.all(
        serverProjectIds.map(async (projectId) => {
          try {
            const result = await apiClient.GET("/projects/{projectId}/schedules/reminders", {
              params: { path: { projectId }, query: { days: 30, limit: 20 } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!result.response.ok || result.data?.success === false) return;

            ((result.data?.data ?? []) as ScheduleReminderResponse[]).forEach((reminder) => {
              if (reminder.id === undefined) return;
              const scheduleId = clientScheduleIdOf(reminder.id);
              deadlineReminderScheduleIds.add(scheduleId);
              const checklist = (reminder.checklist ?? [])
                .map(mapReminderChecklistItem)
                .filter((item): item is ReminderChecklistItem => item !== null);
              reminderByScheduleId.set(scheduleId, checklist);
            });
          } catch {
            // 리마인드 체크리스트는 보조 정보이므로 일정 목록 자체는 유지한다.
          }
        }),
      );

      const schedulesWithReminderChecklist = serverSchedules.map((schedule) => ({
        ...schedule,
        isDeadlineReminder: deadlineReminderScheduleIds.has(schedule.id),
        reminderChecklist: reminderByScheduleId.get(schedule.id) ?? schedule.reminderChecklist,
      }));
      setSchedules(schedulesWithReminderChecklist);
      setError(null);
    } catch (e) {
      setSchedules([]);
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
      // 서버에 없는 프로젝트에는 일정을 붙일 수 없다 — 로컬에만 만들면
      // 새로고침에 조용히 사라진다.
      throw new Error("프로젝트를 찾을 수 없어 일정을 등록할 수 없습니다.");
    }

    const milestoneId = milestoneServerIdOf(draft.milestoneId);

    const { data, response } = await apiClient.POST("/schedules", {
      body: {
        projectId,
        title: draft.title,
        ...(draft.description ? { description: draft.description } : {}),
        startAt: dateTimeOf(draft.date, draft.startTime),
        endAt: dateTimeOf(draft.date, draft.endTime),
        // shared는 공개 여부가 아니라 "프로젝트 일정 ↔ 개인 일정" 구분자다.
        // false면 projectId를 같이 보내도 서버가 프로젝트 연결을 끊어서, 그 일정은
        // 프로젝트 캘린더·리마인더 조회에서 빠지고 작성자만 보게 된다.
        // 생성 요청에서는 생략해도 false이므로 반드시 명시한다 (스펙에는 없는 동작).
        shared: true,
        type: draft.type,
        // 마일스톤은 고르지 않을 수 있어 있을 때만 싣는다. 서버는 shared=true이고
        // 같은 프로젝트에 속한 마일스톤만 받는다(아니면 404) — 폼이 프로젝트를
        // 바꿀 때 선택을 비우므로 여기까지 어긋난 값이 오지 않는다.
        ...(milestoneId !== null ? { milestoneId } : {}),
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok || data?.success === false || !data?.data) {
      throw new Error(data?.error?.message ?? "일정 등록에 실패했습니다.");
    }

    const mapped = mapScheduleResponse(data.data, projects);
    if (!mapped) throw new Error("일정 응답을 해석하지 못했습니다.");
    setSchedules((prev) => [...prev, mapped]);
    return mapped;
  }, [projects]);

  /** 마감 리마인드 체크리스트 상태를 화면에 즉시 반영하고 서버에 저장한다. */
  const setChecklistState = useCallback(
    async (scheduleId: string, itemId: string, state: ReminderChecklistState): Promise<void> => {
      const schedule = schedules.find((candidate) => candidate.id === scheduleId);
      const item = schedule?.reminderChecklist?.find((candidate) => candidate.id === itemId);
      if (!schedule || !item) return;

      const applyState = (nextState: ReminderChecklistState) => {
        setSchedules((prev) =>
          prev.map((candidate) =>
            candidate.id !== scheduleId
              ? candidate
              : {
                  ...candidate,
                  reminderChecklist: candidate.reminderChecklist?.map((candidateItem) =>
                    candidateItem.id !== itemId
                      ? candidateItem
                      : { ...candidateItem, state: nextState, statusLabel: statusLabelOf(nextState) },
                  ),
                },
          ),
        );
      };

      const projectId = serverIdOf(schedule.projectId);
      const serverScheduleId = serverScheduleIdOf(schedule.id);
      if (projectId === null || serverScheduleId === null || item.sourceId === undefined) {
        applyState(state);
        return;
      }

      const previousState = item.state;
      applyState(state);
      try {
        const { data, error: responseError, response } = await apiClient.PATCH(
          "/projects/{projectId}/schedules/{scheduleId}/reminder-items/{sourceType}/{sourceId}/status",
          {
            params: {
              path: {
                projectId,
                scheduleId: serverScheduleId,
                sourceType: SOURCE_TO_SERVER[item.sourceType],
                sourceId: item.sourceId,
              },
            },
            body: { status: STATUS_TO_SERVER[state] },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );

        if (!response.ok || data?.success === false) {
          throw new Error(apiErrorMessage(responseError ?? data, response.status, "체크리스트 상태를 저장하지 못했습니다."));
        }

        const savedStatus = data?.data?.status;
        if (savedStatus) applyState(STATUS_MAP[savedStatus]);
        setError(null);
      } catch (requestError) {
        applyState(previousState);
        setError(
          requestError instanceof Error && requestError.name !== "TimeoutError"
            ? requestError
            : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
        );
      }
    },
    [schedules],
  );

  return { schedules, addSchedule, setChecklistState, reload: loadSchedules, loading, error };
}
