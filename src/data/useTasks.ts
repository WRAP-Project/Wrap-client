/**
 * useTasks
 *
 * 태스크 = 마일스톤을 구성하는 작업 항목. 마일스톤과 1:N이고, 마일스톤의
 * 달성 여부·진행률이 여기서 집계된다(MilestoneResponse의 totalTaskCount /
 * doneTaskCount가 그 결과다).
 *
 * 일정(useSchedules.ts)과 혼동하면 안 된다 — 일정은 캘린더 위의 시간 블록이고
 * 개인 일정도 될 수 있다(projectId 없음). 마일스톤에 매달리는 건 태스크뿐이다.
 *
 * deliverable 플래그가 화면의 두 섹션을 가른다:
 *   deliverable = false → "연결된 작업"
 *   deliverable = true  → "제출 체크리스트"
 * 둘은 같은 목록을 나눈 것이라 조회는 한 번이면 된다.
 *
 * 백엔드 — GET/POST /projects/{projectId}/tasks, PATCH .../tasks/{taskId},
 * PATCH .../tasks/{taskId}/status, DELETE .../tasks/{taskId}.
 * 계약: api/openapi.yaml.
 */

import { useCallback, useEffect, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { useMilestonesContext } from "./MilestonesContext";
import { initialsOf } from "./projectMemberDisplay";

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 서버 enum을 그대로 쓴다 — 중간 표현을 두면 왕복하며 값이 뭉개진다. */
export type TaskStatus = "TODO" | "IN_PROGRESS" | "NEEDS_REVIEW" | "DONE" | "HOLD";

export type TaskPriority = "HIGH" | "MEDIUM" | "LOW";

export interface TaskAssignee {
  nickname: string;
  /** 아바타 표기용 1~2자 */
  initials: string;
}

export interface Task {
  id: string;
  projectId: string;
  /** 어느 마일스톤에 기여하는지. 마일스톤에 속하지 않은 태스크는 null. */
  milestoneId: string | null;
  title: string;
  description?: string;
  status: TaskStatus;
  /** 마감일 — YYYY-MM-DD. 일정과 달리 구간이 아니라 시점 하나다. */
  dueDate?: string;
  /** 0~100. 이진 완료보다 세밀한 표시가 필요할 때 쓴다. */
  progress: number;
  priority?: TaskPriority;
  /** true면 제출물(제출 체크리스트), false면 일반 작업. */
  deliverable: boolean;
  assignee?: TaskAssignee;
}

/**
 * 일정 추가 폼이 넘기는 입력값.
 *
 * status와 progress는 없다 — 서버가 TODO / 0으로 초기화하므로 보낼 필요가 없다.
 * 담당자·우선순위·마감일을 비워두면 서버 기본값(담당 미정 / MEDIUM / 없음)이다.
 */
export interface TaskDraft {
  title: string;
  /** 비워두면 마일스톤에 연결되지 않은 일정이 된다 */
  milestoneId?: string | null;
  dueDate?: string;
  deliverable?: boolean;
}

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "대기",
  IN_PROGRESS: "진행 중",
  NEEDS_REVIEW: "검토 필요",
  HOLD: "보류",
  DONE: "완료",
};

/** 주의를 끌어야 하는 상태 — 화면에서 경고색으로 칠한다. */
export function isTaskStalled(status: TaskStatus): boolean {
  return status === "HOLD" || status === "NEEDS_REVIEW";
}

// ── 서버 id ↔ 화면 id ─────────────────────────────────────────────────────────
// 마일스톤(useMilestones.ts)과 같은 방식이다 — 서버 id는 숫자, 화면 id는 접두사
// 붙인 문자열. 접두사가 있어야 라우트 파라미터만 보고 무엇의 id인지 알 수 있다.

const TASK_ID_PREFIX = "srv-t-";
const MILESTONE_ID_PREFIX = "srv-m-";

function clientTaskIdOf(id: number): string {
  return `${TASK_ID_PREFIX}${id}`;
}

function serverTaskIdOf(id: string): number | null {
  if (!id.startsWith(TASK_ID_PREFIX)) return null;
  const n = Number(id.slice(TASK_ID_PREFIX.length));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

function serverMilestoneIdOf(id: string): number | null {
  if (!id.startsWith(MILESTONE_ID_PREFIX)) return null;
  const n = Number(id.slice(MILESTONE_ID_PREFIX.length));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// ── 서버 응답 매핑 ────────────────────────────────────────────────────────────

interface TaskAssigneeResponse {
  projectMemberId?: number;
  memberId?: number;
  nickname?: string;
  role?: string;
}

interface TaskResponse {
  id?: number;
  projectId?: number;
  milestoneId?: number;
  assignee?: TaskAssigneeResponse;
  title?: string;
  description?: string;
  status?: TaskStatus;
  dueDate?: string;
  progress?: number;
  priority?: TaskPriority;
  deliverable?: boolean;
}

/**
 * 서버 응답 하나를 화면용 태스크로 바꾼다.
 *
 * id나 제목이 없으면 버린다 — 목록에서 키도 라벨도 만들 수 없다. 스펙상 전부
 * optional이지만 실제로 빠져 내려오는 경우는 없다.
 */
function toTask(t: TaskResponse, projectId: string): Task | null {
  if (t.id == null || !t.title) return null;
  return {
    id: clientTaskIdOf(t.id),
    projectId,
    milestoneId: t.milestoneId == null ? null : `${MILESTONE_ID_PREFIX}${t.milestoneId}`,
    title: t.title,
    description: t.description,
    status: t.status ?? "TODO",
    dueDate: t.dueDate,
    progress: t.progress ?? 0,
    priority: t.priority,
    deliverable: t.deliverable === true,
    assignee: t.assignee?.nickname
      ? { nickname: t.assignee.nickname, initials: initialsOf(t.assignee.nickname) }
      : undefined,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * 한 프로젝트의 태스크 전부를 읽는다.
 *
 * 마일스톤별로 따로 조회하지 않는 건, 한 화면에서 여러 마일스톤을 오갈 때마다
 * 요청이 나가는 걸 피하기 위해서다 — 프로젝트 하나의 태스크 수는 목록 하나에
 * 담아둘 만한 규모다. 소비 측은 milestoneId로 걸러 쓴다.
 */
export function useProjectTasks(projectId: string | undefined) {
  const { reload: reloadMilestones } = useMilestonesContext();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const serverProjectId = projectId === undefined ? null : serverIdOf(projectId);

  const load = useCallback(async () => {
    // mock 프로젝트("1"~"3")는 서버에 없다 — 보내면 남의 프로젝트를 열거나 404다.
    if (serverProjectId === null) {
      setTasks([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: responseError, response } = await apiClient.GET(
        "/projects/{projectId}/tasks",
        {
          params: { path: { projectId: serverProjectId } },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok || data?.success === false) {
        throw new Error(
          apiErrorMessage(responseError ?? data, response.status, "작업을 불러오지 못했습니다."),
        );
      }

      const clientProjectId = projectId!;
      setTasks(
        ((data?.data ?? []) as TaskResponse[])
          .map((t) => toTask(t, clientProjectId))
          .filter((t): t is Task => t !== null),
      );
      setError(null);
    } catch (e) {
      setTasks([]);
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e
          : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setLoading(false);
    }
  }, [serverProjectId, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * 일정을 추가한다.
   *
   * 상태 변경과 달리 낙관적 반영을 하지 않는다 — 서버가 id를 쥐고 있어서 응답
   * 전에는 목록에 넣을 행을 만들 수 없고, 담당자·우선순위 기본값도 서버가 정한다.
   *
   * 저장에 성공하면 마일스톤 목록을 다시 읽는다. 진행률의 분모(totalTaskCount)가
   * 서버 집계라, 갱신하지 않으면 방금 추가한 일정이 진행률에 빠진 채로 남는다.
   */
  const addTask = useCallback(
    async (draft: TaskDraft): Promise<void> => {
      if (serverProjectId === null) return;

      const { data, error: responseError, response } = await apiClient.POST(
        "/projects/{projectId}/tasks",
        {
          params: { path: { projectId: serverProjectId } },
          body: {
            title: draft.title,
            // 마일스톤 미연결이면 필드 자체를 빼서 보낸다.
            ...(draft.milestoneId
              ? { milestoneId: serverMilestoneIdOf(draft.milestoneId) ?? undefined }
              : {}),
            ...(draft.dueDate ? { dueDate: draft.dueDate } : {}),
            ...(draft.deliverable ? { deliverable: true } : {}),
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok || data?.success === false) {
        throw new Error(
          apiErrorMessage(responseError ?? data, response.status, "일정을 추가하지 못했습니다."),
        );
      }

      const created = toTask((data?.data ?? {}) as TaskResponse, projectId!);
      // 응답이 비어 오면 목록을 다시 읽어 메운다 — 추가는 됐는데 화면에만 없는
      // 상태로 두지 않는다.
      if (created) setTasks((prev) => [...prev, created]);
      else await load();

      setError(null);
      await reloadMilestones();
    },
    [serverProjectId, projectId, load, reloadMilestones],
  );

  /**
   * 태스크 상태를 바꾼다. 화면에 먼저 반영하고 서버에 저장한다.
   *
   * 저장에 성공하면 마일스톤 목록을 다시 읽는다 — 진행률(doneTaskCount)이
   * 서버 집계값이라, 여기서 갱신하지 않으면 헤더의 진행률만 옛 값으로 남는다.
   */
  const setTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus): Promise<void> => {
      const task = tasks.find((t) => t.id === taskId);
      const serverTaskId = serverTaskIdOf(taskId);
      if (!task || serverProjectId === null || serverTaskId === null) return;

      const applyStatus = (next: TaskStatus) => {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: next } : t)));
      };

      const previousStatus = task.status;
      applyStatus(status);
      try {
        const { data, error: responseError, response } = await apiClient.PATCH(
          "/projects/{projectId}/tasks/{taskId}/status",
          {
            params: { path: { projectId: serverProjectId, taskId: serverTaskId } },
            body: { status },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );

        if (!response.ok || data?.success === false) {
          throw new Error(
            apiErrorMessage(responseError ?? data, response.status, "작업 상태를 저장하지 못했습니다."),
          );
        }

        const saved = (data?.data as TaskResponse | undefined)?.status;
        if (saved) applyStatus(saved);
        setError(null);
        await reloadMilestones();
      } catch (e) {
        applyStatus(previousStatus);
        setError(
          e instanceof Error && e.name !== "TimeoutError"
            ? e
            : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
        );
      }
    },
    [tasks, serverProjectId, reloadMilestones],
  );

  /** 완료 ↔ 대기만 뒤집는다. 진행 중·보류는 상태 변경 UI에서 따로 고른다. */
  const toggleTaskDone = useCallback(
    (taskId: string) => {
      const task = tasks.find((t) => t.id === taskId);
      if (!task) return;
      return setTaskStatus(taskId, task.status === "DONE" ? "TODO" : "DONE");
    },
    [tasks, setTaskStatus],
  );

  return { tasks, addTask, setTaskStatus, toggleTaskDone, reload: load, loading, error };
}

/** 한 마일스톤에 걸린 태스크만 — 마감일이 이른 순. 마감일 없는 것은 뒤로. */
export function tasksOfMilestone(tasks: Task[], milestoneId: string | undefined): Task[] {
  if (!milestoneId) return [];
  return tasks
    .filter((t) => t.milestoneId === milestoneId)
    .sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"));
}

/** 서로 다른 담당자 수 — 마일스톤 상세의 "참여자" 통계. */
export function participantCountOf(tasks: Task[]): number {
  return new Set(tasks.map((t) => t.assignee?.nickname).filter(Boolean)).size;
}
