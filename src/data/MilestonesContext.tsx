/**
 * MilestonesContext
 *
 * 마일스톤은 프로젝트 상세(마감 임박·다가오는 마일스톤·전체 진행률)와
 * 마일스톤 상세가 함께 읽고 쓴다. 화면마다 useMilestones()를 따로 호출하면
 * 프로젝트 상세에서 추가한 마일스톤이 다른 화면에 안 보이므로 전역화한다.
 *
 * 진행률은 서버가 태스크에서 집계해 주므로 일정·태스크 Provider와의 순서
 * 제약은 없다. 대신 태스크 상태를 바꾼 쪽(useTasks.ts)이 reload를 불러
 * 집계값을 다시 읽어 간다.
 */

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  useMilestones,
  byDue,
  progressOf,
  type Milestone,
  type MilestoneDraft,
  type MilestoneProgress,
  type MilestoneView,
} from "./useMilestones";

export type { Milestone, MilestoneDraft, MilestoneProgress, MilestoneView };

interface MilestonesContextValue {
  milestones: MilestoneView[];
  addMilestone: (projectId: string, draft: MilestoneDraft) => Promise<Milestone>;
  /** 서버에서 처음 불러오는 중 — 목록이 빈 것과 아직 모르는 것을 구분하려고 노출한다. */
  loading: boolean;
  error: Error | null;
  /** 목록을 서버에서 다시 불러온다. */
  reload: () => Promise<void>;
}

const MilestonesContext = createContext<MilestonesContextValue | null>(null);

export function MilestonesProvider({ children }: { children: ReactNode }) {
  const value = useMilestones();
  return <MilestonesContext.Provider value={value}>{children}</MilestonesContext.Provider>;
}

export function useMilestonesContext(): MilestonesContextValue {
  const ctx = useContext(MilestonesContext);
  if (!ctx) {
    throw new Error("useMilestonesContext는 MilestonesProvider 안에서만 사용 가능합니다.");
  }
  return ctx;
}

/** 특정 프로젝트의 마일스톤만 — 목표일이 가까운 순으로 정렬해 돌려준다. */
export function useProjectMilestones(projectId: string | undefined): MilestoneView[] {
  const { milestones } = useMilestonesContext();
  return useMemo(
    () => (projectId ? milestones.filter((m) => m.projectId === projectId).sort(byDue) : []),
    [milestones, projectId],
  );
}

/**
 * 프로젝트 진행률 — 목록 화면과 상세 화면이 같은 값을 보도록 이 훅만 쓴다.
 * 마일스톤이 하나도 없으면 total이 0이므로, 호출 측이 바를 숨길지 정한다.
 */
export function useProjectProgress(projectId: string | undefined): MilestoneProgress {
  const milestones = useProjectMilestones(projectId);
  return useMemo(() => progressOf(milestones), [milestones]);
}

/** 마일스톤 하나 — 없으면 undefined */
export function useMilestone(milestoneId: string | undefined): MilestoneView | undefined {
  const { milestones } = useMilestonesContext();
  return useMemo(
    () => (milestoneId ? milestones.find((m) => m.id === milestoneId) : undefined),
    [milestones, milestoneId],
  );
}
