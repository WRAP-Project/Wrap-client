import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { MemberState } from "@/lib/color";
import { initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { useProjectMilestones } from "./MilestonesContext";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { formatMilestoneDue, progressOf, type MilestoneView } from "./useMilestones";

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 마감 임박 카드 — 가장 가까운 미완료 마일스톤이다(일정이 아니다). */
export interface UrgentTask {
  /** 마일스톤 상세로 이동할 때 쓴다 */
  id: string;
  dday: number;
  title: string;
  datetime: string;
  tags: string[];
}

export interface Member {
  initials: string;
  role: string;
  /** 아바타 색은 화면이 프로젝트 색과 이 상태로 정한다(lib/color.ts memberAvatar). */
  state: MemberState;
}

/** "이 프로젝트의 마일스톤" 목록의 한 줄 */
export interface ProjectMilestoneRow {
  id: string;
  /** 목표일(YYYY-MM-DD) — 화면이 D-day 라벨을 만든다. 지난 것은 D+n이 된다. */
  dueDate: string;
  dday: number;
  /** 달성 여부 — 지난 것과 달성한 것을 다르게 칠해야 한다 */
  done: boolean;
  label: string;
  /** 연결된 작업 중 몇 개가 끝났는지 — "2/3" */
  doneCount: number;
  totalCount: number;
}

export interface Progress {
  percent: number;
  /** 완료된 마일스톤 수 / 전체 마일스톤 수 */
  done: number;
  total: number;
  /** 진행 바 양 끝에 놓는 첫·마지막 마일스톤 제목 */
  startLabel: string;
  endLabel: string;
}

export interface ProjectDetailData {
  /** 남은 마일스톤이 없으면 null */
  urgentTask: UrgentTask | null;
  members: Member[];
  /** 이 프로젝트의 마일스톤 전부 — 지난 것도 달성한 것도 포함한다 */
  milestones: ProjectMilestoneRow[];
  progress: Progress;
}

// ── Mock 데이터 (백엔드 GET /projects/{projectId} 준비되면 이 파일만 교체) ────
// 화면 컴포넌트(screens/ProjectDetail.tsx)는 건드릴 필요 없음.
// projectId는 useProjects.ts의 MOCK_PROJECTS와 1:1로 맞춰져 있다.
//
//
// 일정(다가오는 일정 / 마감 임박)은 여기서 하드코딩하지 않는다 —
// useSchedules.ts의 일정 목록(앱 전체의 유일한 출처)에서 파생시킨다.
// 그래서 캘린더에서 일정을 추가하면 이 화면에도 즉시 반영된다.

// 진행률은 더 이상 여기 하드코딩하지 않는다 — 마일스톤 완료 수에서 파생한다.
interface ProjectDetailSeed {
  members: Member[];
}

const MOCK_BY_PROJECT: Record<string, ProjectDetailSeed> = {
  // 프로젝트 루프
  // delayed인 사람은 useTeamActivity.ts에서 blocked로 잡힌 사람과 같다 —
  // 두 화면이 같은 사람을 다른 상태로 보여주면 안 된다.
  "1": {
    members: [
      { initials: "KM", role: "PM",    state: "active"   },
      { initials: "LJ", role: "디자인", state: "active"   },
      { initials: "PJ", role: "개발",   state: "active"   },
      { initials: "CS", role: "마케팅", state: "active"   },
      { initials: "JH", role: "QA",    state: "delayed"  },
      { initials: "YC", role: "기획",   state: "inactive" },
    ],
  },

  // 오로라 리브랜딩
  "2": {
    members: [
      { initials: "MG", role: "PM",    state: "active"  },
      { initials: "OS", role: "디자인", state: "active"  },
      { initials: "SH", role: "브랜딩", state: "active"  },
      { initials: "BD", role: "마케팅", state: "delayed" },
    ],
  },

  // 캠페인 라디오
  "3": {
    members: [
      { initials: "SJ", role: "마케팅", state: "active"  },
      { initials: "NA", role: "기획",   state: "active"  },
      { initials: "KT", role: "개발",   state: "delayed" },
    ],
  },
};

/** mock에 없는 프로젝트(새로 만든 프로젝트 등)는 빈 상태로 시작한다. */
const EMPTY_SEED: ProjectDetailSeed = {
  members: [],
};

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

const EMPTY_PROGRESS: Progress = {
  percent: 0,
  done: 0,
  total: 0,
  startLabel: "착수",
  endLabel: "완료",
};

function buildDetail(
  seed: ProjectDetailSeed,
  projectMilestones: MilestoneView[],
): ProjectDetailData {
  // projectMilestones는 이미 목표일이 가까운 순(다가오는 것 먼저, 지난 것은
  // 뒤에 최근 것부터). 목록은 이 순서를 그대로 쓴다 — 지난 마일스톤도 이
  // 프로젝트의 기록이라 감추지 않는다.
  //
  // 반면 "마감 임박" 카드는 다음에 할 일 하나를 집는 자리라, 거기에만
  // 남은 것 중 가장 가까운 하나를 따로 고른다.
  const nearest = projectMilestones.find((m) => !m.done && m.dday >= 0);

  // 진행률은 목록 화면과 공유하는 계산식을 쓴다(값이 어긋나면 안 된다).
  const { percent, done, total } = progressOf(projectMilestones);

  // projectMilestones는 "가까운 순"이라 지난 것이 뒤로 밀려 있다.
  // 진행 바 양 끝 라벨은 시간 순서가 필요하므로 따로 정렬한다.
  const chronological = [...projectMilestones].sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return {
    urgentTask: nearest
      ? {
          id: nearest.id,
          dday: nearest.dday,
          title: nearest.title,
          datetime: formatMilestoneDue(nearest.dueDate),
          tags: [
            "마일스톤",
            ...(nearest.totalCount > 0
              ? [`작업 ${nearest.doneCount}/${nearest.totalCount}`]
              : ["연결된 작업 없음"]),
          ],
        }
      : null,
    milestones: projectMilestones.map((m) => ({
      id: m.id,
      dueDate: m.dueDate,
      dday: m.dday,
      done: m.done,
      label: m.title,
      doneCount: m.doneCount,
      totalCount: m.totalCount,
    })),
    members: seed.members,
    progress:
      total === 0
        ? EMPTY_PROGRESS
        : {
            percent,
            done,
            total,
            // 진행 바 양 끝은 이 프로젝트의 첫 마일스톤과 마지막 마일스톤이다.
            startLabel: chronological[0].title,
            endLabel: chronological[total - 1].title,
          },
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 GET /projects/{projectId} 준비되면 이 훅 내부만 fetch로 교체.
// 마일스톤은 MilestonesContext(= useMilestones.ts)에서 그대로 파생된다.

export function useProjectDetail(projectId: string | undefined) {
  const projectMilestones = useProjectMilestones(projectId);
  const serverId = useMemo(() => serverIdOf(projectId), [projectId]);

  // 서버 프로젝트의 팀원은 실제로 불러온다. mock 프로젝트는 서버에 없으므로
  // 호출하지 않고 위의 seed를 그대로 쓴다.
  const [serverMembers, setServerMembers] = useState<Member[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (serverId === null) {
      setServerMembers(null);
      return;
    }
    let cancelled = false;

    async function load(id: number) {
      setLoading(true);
      try {
        const { data } = await apiClient.GET("/projects/{projectId}/members", {
          params: { path: { projectId: id } },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        if (cancelled) return;
        // 실패해도 화면은 "팀원 없음"으로 두고 넘어간다 — 상세 화면 전체를
        // 막을 만한 정보가 아니다.
        const members: Member[] = (data?.data ?? [])
          .filter((m) => m.status !== "LEFT")
          .map((m) => {
            const name = m.nickname ?? "이름 없음";
            return {
              initials: initialsOf(name),
              role: roleLabelOf(m.role),
              // 서버는 아직 지연 여부를 주지 않는다 — 참여 중인지만 구분한다.
              state: m.status === "JOINED" ? ("active" as const) : ("inactive" as const),
            };
          });
        setServerMembers(members);
      } catch {
        if (!cancelled) setServerMembers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load(serverId);
    return () => {
      cancelled = true;
    };
  }, [serverId]);

  const data = useMemo(() => {
    const seed = (projectId && MOCK_BY_PROJECT[projectId]) || EMPTY_SEED;
    const detail = buildDetail(seed, projectMilestones);
    return serverMembers ? { ...detail, members: serverMembers } : detail;
  }, [projectId, projectMilestones, serverMembers]);

  return { data, loading, error: null as Error | null };
}
