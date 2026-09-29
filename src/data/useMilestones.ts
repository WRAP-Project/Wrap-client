/**
 * useMilestones
 *
 * 마일스톤 = 팀이 특정 시점까지 달성해야 하는 공동 목표.
 * 일정(useSchedules.ts)과의 관계는 1:N이다 — 일정은 마일스톤을 달성하기 위해
 * 구성원별로 수행하는 날짜 기반 실행 항목이고, 마일스톤에 속하지 않는
 * 일정(개인 약속 등)은 milestoneId가 비어 있다.
 *
 * 완료는 저장하지 않고 파생한다: 연결된 일정이 모두 체크되면 그 마일스톤은
 * 완료다. 그래서 캘린더에서 개인이 일정을 체크하면 프로젝트 상세의 전체
 * 진행률이 곧바로 올라간다. 서버 응답의 status·doneTaskCount는 쓰지 않는다 —
 * 그쪽은 태스크(아직 미연동) 기준이라 일정 기준 진행률과 어긋난다.
 *
 * 백엔드 — GET/POST /projects/{projectId}/milestones. 계약: api/openapi.yaml.
 * 목록 조회가 프로젝트별이라, 전역 목록은 참여 중인 서버 프로젝트마다 한 번씩
 * 불러 합친다.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient, apiErrorMessage } from "@/lib/api/client";
import { useProjectsContext } from "./ProjectsContext";
import { REQUEST_TIMEOUT_MS, clientIdOfServerProject, serverIdOf } from "./useProjects";
import { useSchedulesContext } from "./SchedulesContext";
import { daysLeft, type Schedule } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  /** 목표일 — YYYY-MM-DD. 일정과 달리 시각은 갖지 않는다(팀 목표라 하루 단위). */
  dueDate: string;
}

/** 추가 폼이 넘기는 입력값 */
export interface MilestoneDraft {
  title: string;
  dueDate: string;
}

/** 화면이 읽는 형태 — 연결된 일정에서 파생한 진행 상태가 붙어 있다. */
export interface MilestoneView extends Milestone {
  dday: number;
  /** 연결된 일정이 하나 이상이고 전부 완료됐으면 true */
  done: boolean;
  doneCount: number;
  totalCount: number;
  /** 연결된 일정의 완료 비율(%) — 연결이 없으면 0 */
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
 * 연결된 일정에서 완료 상태를 파생한다.
 *
 * 연결된 일정이 0개면 미완료로 둔다 — 공집합을 "전부 완료"로 보면 방금 만든
 * 마일스톤이 곧바로 달성 처리되어 진행률이 거짓으로 오른다.
 */
export function toView(milestone: Milestone, linked: Schedule[]): MilestoneView {
  const totalCount = linked.length;
  const doneCount = linked.filter((s) => s.checked === true).length;

  return {
    ...milestone,
    dday: daysLeft(milestone.dueDate),
    done: totalCount > 0 && doneCount === totalCount,
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
  dueDate?: string;
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
    dueDate: m.dueDate,
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
  const { schedules } = useSchedulesContext();
  const { projects } = useProjectsContext();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 서버에 실제로 존재하는 프로젝트만 조회 대상이다. mock 프로젝트("1"~"3")는
  // serverIdOf가 null을 주므로 건너뛴다 — 보내면 남의 프로젝트를 열거나 404다.
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

  const views = useMemo(() => {
    // 일정을 milestoneId로 한 번만 묶어두고 각 마일스톤이 꺼내 쓴다.
    const byMilestone = new Map<string, Schedule[]>();
    for (const s of schedules) {
      if (!s.milestoneId) continue;
      const bucket = byMilestone.get(s.milestoneId);
      if (bucket) bucket.push(s);
      else byMilestone.set(s.milestoneId, [s]);
    }
    return milestones.map((m) => toView(m, byMilestone.get(m.id) ?? []));
  }, [milestones, schedules]);

  /**
   * 마일스톤을 추가한다(POST /projects/{projectId}/milestones).
   * 서버에 저장한 뒤 응답으로 받은 마일스톤을 목록에 넣는다. 실패하면 예외를
   * 던지고 — 화면(ProjectDetail의 추가 시트)이 사유를 그대로 보여준다.
   */
  const addMilestone = useCallback(
    async (projectId: string, draft: MilestoneDraft): Promise<Milestone> => {
      const serverProjectId = serverIdOf(projectId);
      if (serverProjectId === null) {
        throw new Error("샘플 프로젝트에는 마일스톤을 추가할 수 없어요.");
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
