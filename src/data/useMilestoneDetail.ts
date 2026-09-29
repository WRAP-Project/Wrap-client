import { useCallback, useMemo } from "react";
import { useMilestone } from "./MilestonesContext";
import { useProjectSchedules } from "./SchedulesContext";
import {
  useMilestoneChecklistContext,
  type ChecklistDraft,
  type ChecklistItem,
} from "./MilestoneChecklistContext";
import { formatMilestoneDue } from "./useMilestones";
import { ddayLabel, type Schedule } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

// 제출물 체크리스트는 추가가 가능해야 해서 상태를 Context가 들고 있다
// (MilestoneChecklistContext.tsx). 소비 측이 import 경로를 하나만 알면 되도록
// 여기서 그대로 re-export한다.
export type { ChecklistStatus, ChecklistItem, ChecklistDraft } from "./MilestoneChecklistContext";

export interface MilestoneHeader {
  dday: number;
  statusBadge: string;
  title: string;
  datetime: string;
  /** 연결된 일정의 완료 비율 — 마일스톤 달성 판정과 같은 근거를 쓴다 */
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

/** 이 마일스톤을 달성하기 위해 구성원이 수행하는 일정 한 건 */
export interface LinkedSchedule {
  id: string;
  title: string;
  ddayLabel: string;
  checked: boolean;
  assignees: string[];
}

export interface MilestoneDetailData {
  /** 해당 id의 마일스톤이 없으면 false — 화면이 "찾을 수 없음"을 보여준다 */
  exists: boolean;
  header: MilestoneHeader;
  stats: MilestoneStats;
  /** 마일스톤 달성의 근거가 되는 일정들 */
  linkedSchedules: LinkedSchedule[];
  /** 일정과 별개인 제출물 체크리스트 */
  checklist: ChecklistItem[];
  /** 아직 공유된 업데이트가 없으면 null */
  update: MilestoneUpdate | null;
}

// ── 아직 서버에 없는 부가 정보 ────────────────────────────────────────────────
// 제목·목표일·진행 상태는 여기 두지 않는다 — 마일스톤 본체(useMilestones.ts)와
// 거기 연결된 일정에서 파생시켜야 프로젝트 상세와 값이 어긋나지 않는다.
//
// 남은 건 어느 엔티티에도 속하지 않은 부가 정보뿐이고, MilestoneResponse에도
// 대응 필드가 없다. 마일스톤별 mock은 걷어냈다 — 서버 마일스톤 id와 맞을 수가
// 없어 어차피 한 건도 쓰이지 않는다. 파일·참여자·업데이트가 스펙에 생기면
// 이 상수 대신 응답에서 채운다.

interface MilestoneSeed {
  statusBadge: string;
  fileCount: number;
  participantCount: number;
  update: MilestoneUpdate | null;
}

const EMPTY_SEED: MilestoneSeed = {
  statusBadge: "준비 중",
  fileCount: 0,
  participantCount: 0,
  update: null,
};

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
  linkedSchedules: [],
  checklist: [],
  update: null,
};

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

function toLinked(s: Schedule): LinkedSchedule {
  return {
    id: s.id,
    title: s.title,
    ddayLabel: ddayLabel(s.date),
    checked: s.checked === true,
    assignees: s.assignees ?? [],
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 GET /projects/{projectId}/milestones/{milestoneId} 준비되면 이 훅
// 내부만 fetch로 교체.

export function useMilestoneDetail(
  projectId: string | undefined,
  milestoneId: string | undefined,
) {
  const milestone = useMilestone(milestoneId);
  const projectSchedules = useProjectSchedules(projectId);
  const { checklistOf, addChecklistItem } = useMilestoneChecklistContext();
  const checklist = checklistOf(milestoneId);

  const data = useMemo<MilestoneDetailData>(() => {
    if (!milestone) return NOT_FOUND;

    const seed = EMPTY_SEED;
    const linked = projectSchedules.filter((s) => s.milestoneId === milestone.id);

    return {
      exists: true,
      header: {
        dday: milestone.dday,
        // 달성한 마일스톤은 부가 배지보다 "달성"이 먼저다.
        statusBadge: milestone.done ? "달성" : seed.statusBadge,
        title: milestone.title,
        datetime: formatMilestoneDue(milestone.dueDate),
        readyPercent: milestone.readyPercent,
      },
      stats: {
        checklistDone: checklist.filter((c) => c.status === "done").length,
        checklistTotal: checklist.length,
        fileCount: seed.fileCount,
        participantCount: seed.participantCount,
      },
      linkedSchedules: linked.map(toLinked),
      checklist,
      update: seed.update,
    };
  }, [milestone, projectSchedules, checklist]);

  /** 제출물 체크리스트에 항목을 추가한다. milestoneId가 없으면 아무 일도 하지 않는다. */
  const addItem = useCallback(
    (draft: ChecklistDraft) => {
      if (!milestoneId) return;
      addChecklistItem(milestoneId, draft);
    },
    [milestoneId, addChecklistItem],
  );

  return { data, addChecklistItem: addItem, loading: false, error: null as Error | null };
}
