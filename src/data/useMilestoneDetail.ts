/**
 * useMilestoneDetail
 *
 * 마일스톤 상세 화면이 읽는 데이터 한 덩어리.
 *
 * 화면의 두 목록은 같은 태스크 목록을 deliverable로 가른 것이다:
 *   deliverable = false → linkedTasks ("연결된 작업")
 *   deliverable = true  → checklist   ("제출 체크리스트")
 * 그래서 조회는 useProjectTasks 한 번이면 되고, 어느 쪽을 완료로 바꾸든
 * 마일스톤 진행률에 똑같이 반영된다.
 */

import { useCallback, useMemo } from "react";
import { useMilestone } from "./MilestonesContext";
import { formatMilestoneDue } from "./useMilestones";
import {
  participantCountOf,
  tasksOfMilestone,
  useProjectTasks,
  type Task,
  type TaskStatus,
} from "./useTasks";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type { Task, TaskStatus } from "./useTasks";

export interface MilestoneHeader {
  dday: number;
  statusBadge: string;
  title: string;
  datetime: string;
  /** 연결된 태스크의 완료 비율 — 마일스톤 달성 판정과 같은 근거를 쓴다 */
  readyPercent: number;
}

export interface MilestoneStats {
  checklistDone: number;
  checklistTotal: number;
  fileCount: number;
  participantCount: number;
}

export interface MilestoneUpdate {
  author: string;
  text: string;
  time: string;
}

export interface MilestoneDetailData {
  /** 해당 id의 마일스톤이 없으면 false — 화면이 "찾을 수 없음"을 보여준다 */
  exists: boolean;
  header: MilestoneHeader;
  stats: MilestoneStats;
  /** 마일스톤을 이루는 작업 (deliverable = false) */
  linkedTasks: Task[];
  /** 제출물로 표시된 작업 (deliverable = true) */
  checklist: Task[];
  /** 아직 공유된 업데이트가 없으면 null */
  update: MilestoneUpdate | null;
}

// ── 아직 서버에 없는 부가 정보 ────────────────────────────────────────────────
// 제목·목표일·진행 상태는 여기 두지 않는다 — 마일스톤 본체(useMilestones.ts)와
// 서버의 태스크 집계에서 파생시켜야 프로젝트 상세와 값이 어긋나지 않는다.
//
// 남은 건 어느 엔티티에도 속하지 않은 부가 정보뿐이다. 첨부 파일과 업데이트는
// api/openapi.yaml에 대응 필드가 없어 아직 비워둔다. 참여자 수는 태스크
// 담당자에서 셀 수 있으므로 여기 두지 않는다.

const NOT_STARTED_BADGE = "준비 중";
const FILE_COUNT_UNAVAILABLE = 0;
const NO_UPDATE: MilestoneUpdate | null = null;

/** 해당 id의 마일스톤 자체가 없을 때 보여줄 값 */
const NOT_FOUND: MilestoneDetailData = {
  exists: false,
  header: {
    dday: 0,
    statusBadge: "찾을 수 없음",
    title: "마일스톤을 찾을 수 없어요",
    datetime: "삭제되었거나 주소가 잘못되었습니다",
    readyPercent: 0,
  },
  stats: { checklistDone: 0, checklistTotal: 0, fileCount: 0, participantCount: 0 },
  linkedTasks: [],
  checklist: [],
  update: null,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMilestoneDetail(
  projectId: string | undefined,
  milestoneId: string | undefined,
) {
  const milestone = useMilestone(milestoneId);
  const { tasks, setTaskStatus, toggleTaskDone, loading, error } = useProjectTasks(projectId);

  const data = useMemo<MilestoneDetailData>(() => {
    if (!milestone) return NOT_FOUND;

    const milestoneTasks = tasksOfMilestone(tasks, milestone.id);
    const checklist = milestoneTasks.filter((t) => t.deliverable);

    return {
      exists: true,
      header: {
        dday: milestone.dday,
        // 달성한 마일스톤은 부가 배지보다 "달성"이 먼저다.
        statusBadge: milestone.done ? "달성" : NOT_STARTED_BADGE,
        title: milestone.title,
        datetime: formatMilestoneDue(milestone.dueDate),
        readyPercent: milestone.readyPercent,
      },
      stats: {
        checklistDone: checklist.filter((t) => t.status === "DONE").length,
        checklistTotal: checklist.length,
        fileCount: FILE_COUNT_UNAVAILABLE,
        participantCount: participantCountOf(milestoneTasks),
      },
      linkedTasks: milestoneTasks.filter((t) => !t.deliverable),
      checklist,
      update: NO_UPDATE,
    };
  }, [milestone, tasks]);

  /** 태스크 완료를 켜고 끈다. 두 목록 어느 쪽이든 같은 함수를 쓴다. */
  const toggleDone = useCallback((taskId: string) => void toggleTaskDone(taskId), [toggleTaskDone]);

  /** 대기·진행 중·검토 필요·보류로 직접 바꾼다. */
  const setStatus = useCallback(
    (taskId: string, status: TaskStatus) => void setTaskStatus(taskId, status),
    [setTaskStatus],
  );

  return { data, toggleDone, setStatus, loading, error };
}
