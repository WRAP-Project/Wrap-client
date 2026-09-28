/**
 * MilestoneChecklistContext
 *
 * 마일스톤 안의 "제출 체크리스트"를 마일스톤별로 들고 있다.
 *
 * 마일스톤에 연결된 일정(useSchedules.ts)과는 별개다 — 일정은 날짜가 있는
 * 실행 항목이고, 이쪽은 "산출물 3종 첨부"처럼 날짜 없는 제출물이다.
 * 마일스톤 달성 판정은 일정 쪽만 본다(useMilestones.ts).
 *
 * 왜 Context인가 — 체크리스트는 마일스톤 상세 화면에서만 쓰이지만, 화면을 나갔다
 * 들어오면 컴포넌트가 다시 mount된다. 화면 로컬 state로 두면 추가한 항목이 그때
 * 사라지므로 화면 바깥에 둔다.
 *
 * 백엔드 — api/openapi.yaml에 마일스톤 리소스가 아직 없다. 생기면 이 파일
 * 내부만 fetch로 바꾸면 되고, 소비하는 화면·훅은 그대로다.
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
// 마일스톤별 초기 체크리스트. 키는 useMilestones.ts의 MOCK_MILESTONES id다.
// 제출물은 마일스톤마다 다르므로 프로젝트가 아니라 마일스톤 단위로 갖는다.

const INITIAL_CHECKLISTS: Record<string, ChecklistItem[]> = {
  // 프로젝트 루프 — D-3 중간 발표
  "m3": [
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

  // 오로라 리브랜딩 — D-2 브랜드 가이드 확정
  "m6": [
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
  "m9": [
    { id: "c3-1", label: "레퍼런스 조사 정리", assignee: "NA", status: "done" },
    { id: "c3-2", label: "콘셉트 후보 3안 정리", assignee: "SJ", status: "in_progress" },
    { id: "c3-3", label: "카피 톤 방향 확정", assignee: "확정 회의 필요", status: "pending" },
  ],
};

/** mock에 없는 마일스톤(새로 만든 것 등)은 빈 체크리스트로 시작한다. */
const EMPTY: ChecklistItem[] = [];

// ── Context ───────────────────────────────────────────────────────────────────

interface MilestoneChecklistContextValue {
  /** 해당 마일스톤의 제출물 체크리스트. milestoneId가 없으면 빈 배열. */
  checklistOf: (milestoneId: string | undefined) => ChecklistItem[];
  /** 체크리스트 맨 뒤에 항목을 추가한다. */
  addChecklistItem: (milestoneId: string, draft: ChecklistDraft) => void;
}

const MilestoneChecklistContext = createContext<MilestoneChecklistContextValue | null>(null);

export function MilestoneChecklistProvider({ children }: { children: ReactNode }) {
  const [byMilestone, setByMilestone] = useState<Record<string, ChecklistItem[]>>(INITIAL_CHECKLISTS);

  const checklistOf = useCallback(
    (milestoneId: string | undefined) => (milestoneId && byMilestone[milestoneId]) || EMPTY,
    [byMilestone],
  );

  const addChecklistItem = useCallback((milestoneId: string, draft: ChecklistDraft) => {
    setByMilestone((prev) => {
      const item: ChecklistItem = {
        // 서버 연동 전까지의 임시 id — 서버가 id를 주기 시작하면 그 값을 쓴다.
        id: `local-${milestoneId}-${Date.now()}`,
        label: draft.label.trim(),
        assignee: draft.assignee,
        status: draft.status,
      };
      return { ...prev, [milestoneId]: [...(prev[milestoneId] ?? []), item] };
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
