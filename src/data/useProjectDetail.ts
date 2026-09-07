import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { avatarBgOf, initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { useProjectSchedules } from "./SchedulesContext";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { daysLeft, formatScheduleDatetime, type Schedule as ScheduleSource } from "./useSchedules";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface UrgentTask {
  dday: number;
  title: string;
  datetime: string;
  tags: string[];
}

export interface Member {
  initials: string;
  role: string;
  avatarBg: string;
  active: boolean;
}

export interface Schedule {
  dday: number;
  label: string;
  ddayColor: string;
}

export interface Progress {
  percent: number;
  done: number;
  total: number;
  remaining: number;
  remainingTotal: number;
}

export interface ProjectDetailData {
  /** 일정이 하나도 없는 프로젝트면 null */
  urgentTask: UrgentTask | null;
  members: Member[];
  schedules: Schedule[];
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

interface ProjectDetailSeed {
  members: Member[];
  progress: Progress;
}

const MOCK_BY_PROJECT: Record<string, ProjectDetailSeed> = {
  // 프로젝트 루프
  "1": {
    members: [
      { initials: "KM", role: "PM",    avatarBg: "#A78BFA", active: true  },
      { initials: "LJ", role: "디자인", avatarBg: "#A78BFA", active: true  },
      { initials: "PJ", role: "개발",   avatarBg: "#60A5FA", active: true  },
      { initials: "CS", role: "마케팅", avatarBg: "#374151", active: true  },
      { initials: "JH", role: "QA",    avatarBg: "#6B7280", active: false },
      { initials: "YC", role: "기획",   avatarBg: "#4B5563", active: true  },
    ],
    progress: { percent: 67, done: 6, total: 15, remaining: 8, remainingTotal: 10 },
  },

  // 오로라 리브랜딩
  "2": {
    members: [
      { initials: "MG", role: "PM",    avatarBg: "#A78BFA", active: true  },
      { initials: "OS", role: "디자인", avatarBg: "#A78BFA", active: true  },
      { initials: "SH", role: "브랜딩", avatarBg: "#F472B6", active: true  },
      { initials: "BD", role: "마케팅", avatarBg: "#374151", active: false },
    ],
    progress: { percent: 42, done: 4, total: 12, remaining: 8, remainingTotal: 12 },
  },

  // 캠페인 라디오
  "3": {
    members: [
      { initials: "SJ", role: "마케팅", avatarBg: "#F59E0B", active: true  },
      { initials: "NA", role: "기획",   avatarBg: "#4B5563", active: true  },
      { initials: "KT", role: "개발",   avatarBg: "#60A5FA", active: false },
    ],
    progress: { percent: 25, done: 3, total: 14, remaining: 11, remainingTotal: 14 },
  },
};

/** mock에 없는 프로젝트(새로 만든 프로젝트 등)는 빈 상태로 시작한다. */
const EMPTY_SEED: ProjectDetailSeed = {
  members: [],
  progress: { percent: 0, done: 0, total: 0, remaining: 0, remainingTotal: 0 },
};

// ── 파생 로직 ─────────────────────────────────────────────────────────────────

/** D-day가 급할수록 강한 색 */
function ddayColorOf(dday: number): string {
  if (dday <= 3) return "#EB3E88";
  if (dday <= 7) return "#A78BFA";
  return "#60A5FA";
}

const TYPE_TAG: Record<ScheduleSource["type"], string> = {
  deadline: "마감",
  meeting: "미팅",
  milestone: "마일스톤",
};

/** 카드에 미리 보여줄 다가오는 일정 개수 — 전체는 /schedule 화면에서 본다. */
const UPCOMING_PREVIEW_COUNT = 3;

function buildDetail(seed: ProjectDetailSeed, projectSchedules: ScheduleSource[]): ProjectDetailData {
  // projectSchedules는 이미 마감이 가까운 순 — 지난 일정은 제외하고 본다.
  const upcoming = projectSchedules.filter((s) => daysLeft(s.date) >= 0);
  const nearest = upcoming[0];

  return {
    urgentTask: nearest
      ? {
          dday: daysLeft(nearest.date),
          title: nearest.title,
          datetime: formatScheduleDatetime(nearest),
          tags: [
            TYPE_TAG[nearest.type],
            ...(nearest.assignees?.length ? [`담당: ${nearest.assignees.join(", ")}`] : []),
          ],
        }
      : null,
    schedules: upcoming.slice(0, UPCOMING_PREVIEW_COUNT).map((s) => ({
      dday: daysLeft(s.date),
      label: s.title,
      ddayColor: ddayColorOf(daysLeft(s.date)),
    })),
    members: seed.members,
    progress: seed.progress,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────────
// 백엔드 GET /projects/{projectId} 준비되면 이 훅 내부만 fetch로 교체.
// 일정은 SchedulesContext(= useSchedules.ts)에서 그대로 파생된다.

export function useProjectDetail(projectId: string | undefined) {
  const projectSchedules = useProjectSchedules(projectId);
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
              avatarBg: avatarBgOf(name),
              active: m.status === "JOINED",
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
    const detail = buildDetail(seed, projectSchedules);
    return serverMembers ? { ...detail, members: serverMembers } : detail;
  }, [projectId, projectSchedules, serverMembers]);

  return { data, loading, error: null as Error | null };
}
