/**
 * useMilestones
 *
 * 마일스톤 = 팀이 특정 시점까지 달성해야 하는 공동 목표.
 * 태스크(useTasks.ts)와의 관계는 1:N이다 — 태스크는 마일스톤을 이루는 작업
 * 항목이고, 마일스톤에 속하지 않는 태스크는 milestoneId가 비어 있다.
 *
 * 진행률과 달성 여부는 서버가 태스크에서 집계한 값을 그대로 쓴다
 * (MilestoneResponse의 totalTaskCount / doneTaskCount / status). 프론트에서
 * 다시 세지 않는다 — 같은 수를 두 곳에서 계산하면 반드시 어긋난다.
 *
 * 일정(useSchedules.ts)은 여기에 관여하지 않는다. 일정은 캘린더 위의 시간
 * 블록이고 개인 일정도 될 수 있어, 팀 목표의 달성 근거가 될 수 없다.
 *
 * 백엔드 — GET/POST /projects/{projectId}/milestones. 계약: api/openapi.yaml.
 * 목록 조회가 프로젝트별이라, 전역 목록은 참여 중인 서버 프로젝트마다 한 번씩
 * 불러 합친다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import { useProjectsContext } from "./ProjectsContext";
import { REQUEST_TIMEOUT_MS, clientIdOfServerProject, serverIdOf } from "./useProjects";
import { daysLeft } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  /** 이 마일스톤이 무엇을 달성하려는지. 서버가 비워 보내면 undefined. */
  description?: string;
  /** 목표일 — YYYY-MM-DD. 일정과 달리 시각은 갖지 않는다(팀 목표라 하루 단위). */
  dueDate: string;
  /** 서버가 태스크에서 집계한 개수 */
  totalTaskCount: number;
  doneTaskCount: number;
  /** 서버가 저장한 달성 상태 */
  status: "IN_PROGRESS" | "DONE";
}

/** 추가 폼이 넘기는 입력값 */
export interface MilestoneDraft {
  title: string;
  dueDate: string;
}

/** 화면이 읽는 형태 — 태스크 집계에서 파생한 진행 상태가 붙어 있다. */
export interface MilestoneView extends Milestone {
  dday: number;
  /** 서버가 달성으로 표시했거나, 연결된 태스크가 전부 완료됐으면 true */
  done: boolean;
  doneCount: number;
  totalCount: number;
  /** 연결된 태스크의 완료 비율(%) — 연결이 없으면 0 */
  readyPercent: number;
}

// ── 서버 id ↔ 화면 id ─────────────────────────────────────────────────────────
// 서버 마일스톤 id는 숫자다. 화면은 문자열 id를 라우트에 그대로 싣고 다니고,
// 일정(useSchedules.ts)의 milestoneId도 문자열이라 접두사를 붙여 구분한다.

const MILESTONE_ID_PREFIX = "srv-m-";

export function milestoneServerIdOf(milestoneId: string | undefined): number | null {
  if (!milestoneId?.startsWith(MILESTONE_ID_PREFIX)) return null;
  const n = Number(milestoneId.slice(MILESTONE_ID_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}

// ── 날짜 헬퍼 ─────────────────────────────────────────────────────────────────

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "7월 30일 수요일 목표" — 마일스톤 헤더용. 일정과 달리 시각이 없다. */
export function formatMilestoneDue(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${WEEKDAY_KO[d.getDay()]}요일 목표`;
}

/** 목표일이 가까운 순 — 다가오는 것을 앞에, 지난 것은 뒤에 최근 것부터. */
export function byDue(a: Milestone, b: Milestone): number {
  const la = daysLeft(a.dueDate);
  const lb = daysLeft(b.dueDate);
  const aPast = la < 0;
  const bPast = lb < 0;
  if (aPast !== bPast) return aPast ? 1 : -1;
  return aPast ? lb - la : la - lb;
}

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/**
 * 서버가 집계한 태스크 개수에서 표시용 진행 상태를 만든다.
 *
 * 달성 판정에 서버 status만 쓰지 않는 이유 — status가 아직 IN_PROGRESS인데
 * 태스크가 전부 완료된 순간이 있을 수 있고, 그때 진행률만 100%이고 달성은
 * 아닌 상태로 보인다. 두 값이 같은 근거를 보도록 태스크 쪽도 함께 본다.
 *
 * 연결된 태스크가 0개면 미완료로 둔다 — 공집합을 "전부 완료"로 보면 방금 만든
 * 마일스톤이 곧바로 달성 처리되어 진행률이 거짓으로 오른다.
 */
export function toView(milestone: Milestone): MilestoneView {
  const { totalTaskCount: totalCount, doneTaskCount: doneCount } = milestone;

  return {
    ...milestone,
    dday: daysLeft(milestone.dueDate),
    done: milestone.status === "DONE" || (totalCount > 0 && doneCount === totalCount),
    doneCount,
    totalCount,
    readyPercent: totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100),
  };
}

/** 프로젝트 진행률 — 달성한 마일스톤 수가 곧 진행률이다. */
export interface MilestoneProgress {
  percent: number;
  done: number;
  total: number;
}

/**
 * 진행률 계산은 반드시 이 함수 하나만 쓴다.
 *
 * 프로젝트 목록(ProjectSelect)과 프로젝트 상세(useProjectDetail)가 각자
 * 계산하던 때에는 같은 프로젝트가 68%와 50%로 다르게 보였다 — 계산식이 한
 * 곳에만 있으면 그런 어긋남이 생길 수 없다.
 */
export function progressOf(milestones: MilestoneView[]): MilestoneProgress {
  const total = milestones.length;
  const done = milestones.filter((m) => m.done).length;
  return {
    percent: total === 0 ? 0 : Math.round((done / total) * 100),
    done,
    total,
  };
}

// ── 백엔드 연동 ───────────────────────────────────────────────────────────────
// 응답 봉투는 ApiResponse<T> = { success, data, message, error }이고 null 필드는
// 빠져서 내려온다 — 필드 존재 여부가 아니라 success로 분기한다(useProjects.ts와 동일).

type MilestoneResponse = {
  id?: number;
  title?: string;
  description?: string;
  dueDate?: string;
  status?: "IN_PROGRESS" | "DONE";
  totalTaskCount?: number;
  doneTaskCount?: number;
};

/**
 * 서버 응답 하나를 화면용 마일스톤으로 바꾼다.
 *
 * id나 목표일이 없으면 버린다 — 목표일이 없으면 D-day를 계산할 수 없어 화면
 * 전체가 NaN으로 물든다. 스펙상 둘 다 optional이지만 생성 시 필수 필드다.
 */
function toMilestone(m: MilestoneResponse, serverProjectId: number): Milestone | null {
  if (m.id == null || !m.dueDate) return null;
  return {
    id: `${MILESTONE_ID_PREFIX}${m.id}`,
    projectId: clientIdOfServerProject(serverProjectId),
    title: m.title ?? "",
    // 빈 문자열은 undefined로 접는다 — 화면이 "설명 있음"으로 보고 빈 줄을 띄우지 않게.
    description: m.description?.trim() || undefined,
    dueDate: m.dueDate,
    // 집계 필드는 태스크가 0개면 빠져 내려올 수 있어 0으로 받는다.
    totalTaskCount: m.totalTaskCount ?? 0,
    doneTaskCount: m.doneTaskCount ?? 0,
    status: m.status ?? "IN_PROGRESS",
  };
}

async function fetchMilestones(serverProjectId: number): Promise<Milestone[]> {
  const { data, error, response } = await apiClient.GET("/projects/{projectId}/milestones", {
    params: { path: { projectId: serverProjectId } },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok || data?.success === false) {
    throw new Error(
      apiErrorMessage(error ?? data, response.status, "마일스톤을 불러오지 못했습니다."),
    );
  }

  return (data?.data ?? [])
    .map((m) => toMilestone(m, serverProjectId))
    .filter((m): m is Milestone => m !== null);
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMilestones() {
  const { projects } = useProjectsContext();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 서버에 실제로 존재하는 프로젝트만 조회 대상이다(serverIdOf가 null이면 건너뛴다 —
  // 보내면 남의 프로젝트를 열거나 404다).
  // 목록을 그대로 의존성에 쓰면 프로젝트 배열이 새로 만들어질 때마다 재조회하므로
  // id만 뽑아 문자열로 굳힌다.
  const serverProjectIdsKey = useMemo(
    () =>
      projects
        .map((p) => serverIdOf(p.id))
        .filter((id): id is number => id !== null)
        .join(","),
    [projects],
  );

  const load = useCallback(async () => {
    const serverProjectIds = serverProjectIdsKey
      .split(",")
      .filter((s) => s !== "")
      .map(Number);

    if (serverProjectIds.length === 0) {
      setMilestones([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    // 한 프로젝트 조회가 실패해도 나머지는 살린다 — allSettled가 아니라 all을
    // 쓰면 프로젝트 하나 때문에 전체 목록이 비고 진행률이 0%로 보인다.
    const results = await Promise.allSettled(serverProjectIds.map(fetchMilestones));

    setMilestones(results.flatMap((r) => (r.status === "fulfilled" ? r.value : [])));

    const failed = results.find((r) => r.status === "rejected");
    setError(
      failed
        ? failed.reason instanceof Error
          ? failed.reason
          : new Error("마일스톤을 불러오지 못했습니다.")
        : null,
    );
    setLoading(false);
  }, [serverProjectIdsKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const views = useMemo(() => milestones.map(toView), [milestones]);

  /**
   * 마일스톤을 추가한다(POST /projects/{projectId}/milestones).
   * 서버에 저장한 뒤 응답으로 받은 마일스톤을 목록에 넣는다. 실패하면 예외를
   * 던지고 — 화면(ProjectDetail의 추가 시트)이 사유를 그대로 보여준다.
   */
  const addMilestone = useCallback(
    async (projectId: string, draft: MilestoneDraft): Promise<Milestone> => {
      const serverProjectId = serverIdOf(projectId);
      if (serverProjectId === null) {
        throw new Error("프로젝트를 찾을 수 없어 마일스톤을 추가할 수 없어요.");
      }

      const { data, error, response } = await apiClient.POST(
        "/projects/{projectId}/milestones",
        {
          params: { path: { projectId: serverProjectId } },
          body: { title: draft.title.trim(), dueDate: draft.dueDate },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );

      if (!response.ok || data?.success === false || !data?.data) {
        throw new Error(
          apiErrorMessage(error ?? data, response.status, "마일스톤을 추가하지 못했습니다."),
        );
      }

      const created = toMilestone(data.data, serverProjectId);
      if (!created) {
        // 저장 자체는 됐지만 응답이 id나 목표일을 빼먹은 경우다. 목록에 못 넣으므로
        // 서버에서 다시 읽어 화면과 서버를 맞춘다.
        await load();
        throw new Error("마일스톤을 저장했지만 목록을 갱신하지 못했어요. 새로고침해 주세요.");
      }

      setMilestones((prev) => [...prev, created]);
      return created;
    },
    [load],
  );

  return { milestones: views, addMilestone, loading, error, reload: load };
}
