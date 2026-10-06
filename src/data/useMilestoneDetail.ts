/**
 * useMilestoneDetail
 *
 * 마일스톤 상세 화면이 읽는 데이터 한 덩어리.
 *
 * 화면은 이 마일스톤에 걸린 일정(태스크)을 목록 하나로 보여준다. 예전에는
 * deliverable로 "연결된 작업"과 "제출 체크리스트" 두 섹션으로 갈라 놨지만,
 * 둘은 같은 엔티티라 조작도 달성 판정도 똑같았다 — 목록을 나누는 대신 행에
 * 제출물 표시만 남기고 하나로 합쳤다.
 */

import { useCallback, useMemo } from "react";
import { useMilestone } from "./MilestonesContext";
import { formatMilestoneDue } from "./useMilestones";
import {
  participantCountOf,
  tasksOfMilestone,
  useProjectTasks,
  type Task,
  type TaskDraft,
  type TaskStatus,
} from "./useTasks";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type { Task, TaskStatus } from "./useTasks";

export interface MilestoneHeader {
  dday: number;
  statusBadge: string;
  title: string;
  /** 목표 설명 — 서버가 비워 보내면 undefined */
  description?: string;
  datetime: string;
  /** 목표일 원본(YYYY-MM-DD) — 일정 추가 시 마감일 기본값으로 쓴다 */
  dueDate: string;
  /** 연결된 태스크의 완료 비율 — 마일스톤 달성 판정과 같은 근거를 쓴다 */
  readyPercent: number;
  /** 담당자가 한 명이라도 있는 태스크 기준 — 헤더 카드에 한 줄로 붙는다 */
  participantCount: number;
}

export interface MilestoneDetailData {
  /** 해당 id의 마일스톤이 없으면 false — 화면이 "찾을 수 없음"을 보여준다 */
  exists: boolean;
  header: MilestoneHeader;
  /** 이 마일스톤에 걸린 일정 전부 — 제출물 여부는 각 행의 deliverable로 구분한다 */
  tasks: Task[];
  /** 완료된 일정 수 — 목록 헤더의 "n / m" */
  doneCount: number;
}

// 제목·설명·목표일·진행 상태는 여기서 지어내지 않는다 — 마일스톤
// 본체(useMilestones.ts)와 서버의 태스크 집계에서 파생시켜야 프로젝트 상세와
// 값이 어긋나지 않는다.
//
// 첨부 파일과 "최근 업데이트"는 api/openapi.yaml에 대응 필드가 아예 없어,
// 화면에서 함께 걷어냈다. 스펙에 생기면 그때 되살린다 — 영구히 0인 숫자를
// 띄워두면 기능이 고장 난 것처럼 보인다.

const NOT_STARTED_BADGE = "준비 중";

/** 해당 id의 마일스톤 자체가 없을 때 보여줄 값 */
const NOT_FOUND: MilestoneDetailData = {
  exists: false,
  header: {
    dday: 0,
    statusBadge: "찾을 수 없음",
    title: "마일스톤을 찾을 수 없어요",
    datetime: "삭제되었거나 주소가 잘못되었습니다",
    dueDate: "",
    readyPercent: 0,
    participantCount: 0,
  },
  tasks: [],
  doneCount: 0,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMilestoneDetail(
  projectId: string | undefined,
  milestoneId: string | undefined,
) {
  const milestone = useMilestone(milestoneId);
  const { tasks, addTask, setTaskStatus, toggleTaskDone, loading, error } = useProjectTasks(projectId);

  const data = useMemo<MilestoneDetailData>(() => {
    if (!milestone) return NOT_FOUND;

    const milestoneTasks = tasksOfMilestone(tasks, milestone.id);

    return {
      exists: true,
      header: {
        dday: milestone.dday,
        // 달성한 마일스톤은 부가 배지보다 "달성"이 먼저다.
        statusBadge: milestone.done ? "달성" : NOT_STARTED_BADGE,
        title: milestone.title,
        description: milestone.description,
        datetime: formatMilestoneDue(milestone.dueDate),
        dueDate: milestone.dueDate,
        readyPercent: milestone.readyPercent,
        participantCount: participantCountOf(milestoneTasks),
      },
      tasks: milestoneTasks,
      doneCount: milestoneTasks.filter((t) => t.status === "DONE").length,
    };
  }, [milestone, tasks]);

  /**
   * 이 마일스톤에 걸린 일정을 추가한다.
   *
   * 화면은 milestoneId를 넘기지 않는다 — 이미 이 훅이 어느 마일스톤인지 알고
   * 있어서, 화면이 라우트 파라미터를 다시 풀어 쓰게 할 이유가 없다.
   */
  const addMilestoneTask = useCallback(
    (draft: Omit<TaskDraft, "milestoneId">) => addTask({ ...draft, milestoneId: milestoneId ?? null }),
    [addTask, milestoneId],
  );

  /** 태스크 완료를 켜고 끈다. 두 목록 어느 쪽이든 같은 함수를 쓴다. */
  const toggleDone = useCallback((taskId: string) => void toggleTaskDone(taskId), [toggleTaskDone]);

  /** 대기·진행 중·검토 필요·보류로 직접 바꾼다. */
  const setStatus = useCallback(
    (taskId: string, status: TaskStatus) => void setTaskStatus(taskId, status),
    [setTaskStatus],
  );

  return { data, addTask: addMilestoneTask, toggleDone, setStatus, loading, error };
}
