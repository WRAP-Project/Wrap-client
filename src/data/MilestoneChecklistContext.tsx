/**
 * MilestoneChecklistContext
 *
 * 마일스톤 안의 "제출 체크리스트"를 프로젝트별로 들고 있는다.
 *
 * 왜 Context인가 — 체크리스트는 마일스톤 상세 화면에서만 쓰이지만, 화면을 나갔다
 * 들어오면 컴포넌트가 다시 mount된다. 화면 로컬 state로 두면 추가한 항목이 그때
 * 사라지므로 화면 바깥에 둔다.
 *
 * 백엔드 — api/openapi.yaml에 마일스톤 엔티티가 아직 없다(일정의 type 값으로만
 * 존재하고, ScheduleResponse에 체크리스트를 담을 필드가 없다). 마일스톤 API가
 * 생기면 이 파일 내부만 fetch로 바꾸면 되고, 소비하는 화면·훅은 그대로다.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ChecklistStatus = "done" | "in_progress" | "blocked" | "pending";

export interface ChecklistItem {
  /** 같은 label이 중복될 수 있어 별도 id를 둔다(목록 key). */
  id: string;
  label: string;
  /** 아바타/부가 설명에 쓰는 담당자 표기 — 비워두면 "담당 미정"으로 보인다. */
  assignee: string;
  status: ChecklistStatus;
  /** 상태만으로 설명이 부족할 때의 한 줄(예: "오늘 16시 이후 일정 영향") */
  note?: string;
}

/** 추가 폼이 넘기는 입력값 */
export interface ChecklistDraft {
  label: string;
  assignee: string;
  status: ChecklistStatus;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 프로젝트별 초기 체크리스트. useProjects.ts의 MOCK_PROJECTS와 id가 1:1로 맞춰져
// 있고, useMilestoneDetail.ts의 나머지 마일스톤 정보(상태 배지·파일 수 등)와
// 같은 프로젝트를 가리킨다.

const INITIAL_CHECKLISTS: Record<string, ChecklistItem[]> = {
  // 프로젝트 루프 — D-3 중간 발표 자료 제출
  "1": [
    { id: "c1-1", label: "발표 흐름 및 목차 확정", assignee: "KM", status: "done" },
    { id: "c1-2", label: "키 비주얼 슬라이드 반영", assignee: "LJ", status: "in_progress" },
    {
      id: "c1-3",
      label: "발표 수치 검증 대기",
      assignee: "데이터 마무리",
      status: "blocked",
      note: "오늘 16시 이후 일정 영향",
    },
    { id: "c1-4", label: "최종 PDF 및 원본 업로드", assignee: "마감 전 최종 확인 필요", status: "pending" },
  ],

  // 오로라 리브랜딩 — D-2 브랜드 가이드 리뷰
  "2": [
    { id: "c2-1", label: "컬러·타이포 규칙 정리", assignee: "OS", status: "done" },
    { id: "c2-2", label: "브랜드 보이스 가이드 초안", assignee: "SH", status: "in_progress" },
    {
      id: "c2-3",
      label: "런칭 채널 확정 대기",
      assignee: "BD",
      status: "blocked",
      note: "채널 확정 전까지 자산 제작 보류",
    },
    { id: "c2-4", label: "리뷰용 PDF 공유", assignee: "리뷰 전날까지", status: "pending" },
  ],

  // 캠페인 라디오 — D-5 캠페인 콘셉트 확정
  "3": [
    { id: "c3-1", label: "레퍼런스 조사 정리", assignee: "NA", status: "done" },
    { id: "c3-2", label: "콘셉트 후보 3안 정리", assignee: "SJ", status: "in_progress" },
    { id: "c3-3", label: "카피 톤 방향 확정", assignee: "확정 회의 필요", status: "pending" },
  ],
};

/** mock에 없는 프로젝트(새로 만든 프로젝트 등)는 빈 체크리스트로 시작한다. */
const EMPTY: ChecklistItem[] = [];

// ── Context ───────────────────────────────────────────────────────────────────

interface MilestoneChecklistContextValue {
  /** 해당 프로젝트 마일스톤의 체크리스트. projectId가 없으면 빈 배열. */
  checklistOf: (projectId: string | undefined) => ChecklistItem[];
  /** 체크리스트 맨 뒤에 항목을 추가한다. */
  addChecklistItem: (projectId: string, draft: ChecklistDraft) => void;
}

const MilestoneChecklistContext = createContext<MilestoneChecklistContextValue | null>(null);

export function MilestoneChecklistProvider({ children }: { children: ReactNode }) {
  const [byProject, setByProject] = useState<Record<string, ChecklistItem[]>>(INITIAL_CHECKLISTS);

  const checklistOf = useCallback(
    (projectId: string | undefined) => (projectId && byProject[projectId]) || EMPTY,
    [byProject],
  );

  const addChecklistItem = useCallback((projectId: string, draft: ChecklistDraft) => {
    setByProject((prev) => {
      const item: ChecklistItem = {
        // 서버 연동 전까지의 임시 id — 서버가 id를 주기 시작하면 그 값을 쓴다.
        id: `local-${projectId}-${Date.now()}`,
        label: draft.label.trim(),
        assignee: draft.assignee,
        status: draft.status,
      };
      return { ...prev, [projectId]: [...(prev[projectId] ?? []), item] };
    });
  }, []);

  const value = useMemo(
    () => ({ checklistOf, addChecklistItem }),
    [checklistOf, addChecklistItem],
  );

  return (
    <MilestoneChecklistContext.Provider value={value}>
      {children}
    </MilestoneChecklistContext.Provider>
  );
}

// ── 소비 훅 ──────────────────────────────────────────────────────────────────

export function useMilestoneChecklistContext(): MilestoneChecklistContextValue {
  const ctx = useContext(MilestoneChecklistContext);
  if (!ctx) {
    throw new Error("useMilestoneChecklistContext는 MilestoneChecklistProvider 안에서만 사용 가능합니다.");
  }
  return ctx;
}
