import { useMemo } from "react";
import { useProjectSchedules } from "./SchedulesContext";
import { daysLeft, formatScheduleDatetime, type Schedule as ScheduleSource } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type ChecklistStatus = "done" | "in_progress" | "blocked" | "pending";

export interface ChecklistItem {
  label: string;
  assignee: string;
  status: ChecklistStatus;
  note?: string;
}

export interface MilestoneHeader {
  dday: number;
  statusBadge: string;
  title: string;
  datetime: string;
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
  header: MilestoneHeader;
  stats: MilestoneStats;
  checklist: ChecklistItem[];
  /** 아직 공유된 업데이트가 없으면 null */
  update: MilestoneUpdate | null;
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId}/milestones/{id} 준비되면 교체) ──
// 화면 컴포넌트(screens/MilestoneDetail.tsx)는 건드릴 필요 없음.
// 이 화면은 프로젝트 상세의 "마감 임박" 카드에서 들어오므로, 각 프로젝트에서
// D-day가 가장 가까운 일정과 제목·D-day·담당이 일치해야 한다
// (useProjectDetail.ts의 MOCK_BY_PROJECT 첫 일정 참고).

interface MilestoneSeed {
  statusBadge: string;
  fileCount: number;
  participantCount: number;
  checklist: ChecklistItem[];
  update: MilestoneUpdate | null;
}

const MOCK_BY_PROJECT: Record<string, MilestoneSeed> = {
  // 프로젝트 루프 — D-3 중간 발표 자료 제출
  "1": {
    statusBadge: "초안 검토 중",
    fileCount: 2,
    participantCount: 4,
    checklist: [
      { label: "발표 흐름 및 목차 확정", assignee: "KM", status: "done" },
      { label: "키 비주얼 슬라이드 반영", assignee: "LJ", status: "in_progress" },
      {
        label: "발표 수치 검증 대기",
        assignee: "데이터 마무리",
        status: "blocked",
        note: "오늘 16시 이후 일정 영향",
      },
      { label: "최종 PDF 및 원본 업로드", assignee: "마감 전 최종 확인 필요", status: "pending" },
    ],
    update: {
      author: "LJ",
      text: "3페이지 시안 반영했고 수치만 확인하면 돼요.",
      time: "12분 전",
    },
  },

  // 오로라 리브랜딩 — D-2 브랜드 가이드 리뷰
  "2": {
    statusBadge: "리뷰 대기",
    fileCount: 3,
    participantCount: 3,
    checklist: [
      { label: "컬러·타이포 규칙 정리", assignee: "OS", status: "done" },
      { label: "브랜드 보이스 가이드 초안", assignee: "SH", status: "in_progress" },
      {
        label: "런칭 채널 확정 대기",
        assignee: "BD",
        status: "blocked",
        note: "채널 확정 전까지 자산 제작 보류",
      },
      { label: "리뷰용 PDF 공유", assignee: "리뷰 전날까지", status: "pending" },
    ],
    update: {
      author: "SH",
      text: "보이스 가이드 톤 예시만 더 채우면 공유 가능해요.",
      time: "1시간 전",
    },
  },

  // 캠페인 라디오 — D-5 캠페인 콘셉트 확정
  "3": {
    statusBadge: "논의 중",
    fileCount: 1,
    participantCount: 2,
    checklist: [
      { label: "레퍼런스 조사 정리", assignee: "NA", status: "done" },
      { label: "콘셉트 후보 3안 정리", assignee: "SJ", status: "in_progress" },
      { label: "카피 톤 방향 확정", assignee: "확정 회의 필요", status: "pending" },
    ],
    update: {
      author: "SJ",
      text: "후보 2안까지 정리했고 내일 회의에서 좁힐게요.",
      time: "20분 전",
    },
  },
};

/** mock에 없는 프로젝트(새로 만든 프로젝트 등)는 빈 상태 */
const EMPTY_SEED: MilestoneSeed = {
  statusBadge: "등록된 마일스톤 없음",
  fileCount: 0,
  participantCount: 0,
  checklist: [],
  update: null,
};

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/**
 * 제목·D-day·일시는 그 프로젝트에서 마감이 가장 가까운 일정(= 프로젝트 상세의
 * "마감 임박" 카드)에서 파생하고, 체크리스트 수치·준비 진행률은 체크리스트에서
 * 파생한다 — 화면끼리 값이 어긋나지 않게 한다.
 */
function buildMilestone(seed: MilestoneSeed, nearest: ScheduleSource | undefined): MilestoneDetailData {
  const total = seed.checklist.length;
  const done = seed.checklist.filter((c) => c.status === "done").length;
  const inProgress = seed.checklist.filter((c) => c.status === "in_progress").length;

  const assignees = nearest?.assignees?.length ? ` · 담당 ${nearest.assignees.join(", ")}` : "";

  return {
    header: {
      dday: nearest ? daysLeft(nearest.date) : 0,
      statusBadge: nearest ? seed.statusBadge : "등록된 마일스톤 없음",
      title: nearest ? nearest.title : "예정된 마일스톤이 없어요",
      datetime: nearest
        ? `${formatScheduleDatetime(nearest)}${assignees}`
        : "캘린더에서 일정을 추가해보세요",
      // 진행 중 항목은 절반만 반영
      readyPercent: total === 0 ? 0 : Math.round(((done + inProgress * 0.5) / total) * 100),
    },
    stats: {
      checklistDone: done,
      checklistTotal: total,
      fileCount: seed.fileCount,
      participantCount: seed.participantCount,
    },
    checklist: seed.checklist,
    update: seed.update,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 GET /projects/{projectId}/milestones/{id} 준비되면 이 훅 내부만 fetch로 교체.

export function useMilestoneDetail(projectId: string | undefined) {
  const projectSchedules = useProjectSchedules(projectId);
  const data = useMemo(() => {
    // 마감이 가까운 순으로 정렬돼 있으니, 아직 지나지 않은 첫 일정이 곧 마일스톤
    const nearest = projectSchedules.find((s) => daysLeft(s.date) >= 0);
    return buildMilestone((projectId && MOCK_BY_PROJECT[projectId]) || EMPTY_SEED, nearest);
  }, [projectId, projectSchedules]);
  return { data, loading: false, error: null as Error | null };
}
