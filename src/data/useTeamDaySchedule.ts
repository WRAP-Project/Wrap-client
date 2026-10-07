import { useMemo } from "react";
import { useSchedulesContext } from "./SchedulesContext";
import { useProjectsContext } from "./ProjectsContext";
import { useTeamMembers } from "./useTeamMembers";

/**
 * 캘린더 "팀원 일정" 탭 전용 훅.
 *
 * 하루치 팀원 타임라인을 만든다 — 팀원 명단은 실제 프로젝트 멤버
 * (useTeamMembers), 일정 블록은 실제 등록된 일정(useSchedules)에서 담당자
 * 이니셜로 매칭한다. 둘 다 서버 데이터이므로, 그날 잡힌 일정이 없는 팀원은
 * 빈 줄로 남는다 — 지어내서 채우지 않는다.
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

export type TeamStatus = "blocked" | "done" | "progress";

export interface TeamTaskBlock {
  id: string;
  title: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  done: boolean;
}

export interface TeamMemberDay {
  id: string;
  name: string;
  role: string;
  initials: string;
  projectId: string;
  projectName: string;
  status: TeamStatus;
  tasks: TeamTaskBlock[];
}

/** 타임라인이 그리는 시간 창 — 바의 좌표 계산에 화면과 훅이 함께 쓴다. */
export const DAY_START_MIN = 9 * 60;
export const DAY_END_MIN = 19 * 60;

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export const STATUS_LABEL: Record<TeamStatus, string> = {
  blocked: "막힘",
  done: "완료",
  progress: "진행 중",
};

// ── 조립 ──────────────────────────────────────────────────────────────────────

/** 시작 시각 순으로 정렬하고, 앞 블록과 겹치는 블록은 버린다. */
function normalize(tasks: TeamTaskBlock[]): TeamTaskBlock[] {
  const sorted = [...tasks].sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime));
  const out: TeamTaskBlock[] = [];
  let cursor = DAY_START_MIN;
  for (const t of sorted) {
    const start = toMinutes(t.startTime);
    const end = toMinutes(t.endTime);
    if (start < cursor || end > DAY_END_MIN || end <= start) continue;
    out.push(t);
    cursor = end;
  }
  return out;
}

export function useTeamDaySchedule(projectId: string | null, date: string) {
  const { projects } = useProjectsContext();
  const { schedules } = useSchedulesContext();
  const { members: serverMembers, loading } = useTeamMembers(projectId);

  const rows = useMemo<TeamMemberDay[]>(() => {
    const targets = projectId ? projects.filter((p) => p.id === projectId) : projects;

    // 명단(useTeamMembers)은 대상 프로젝트 전부를 합쳐 중복까지 걸러 돌려주고,
    // 각 멤버가 어느 프로젝트로 집계됐는지(member.projectId)를 달고 온다 —
    // 여기서는 그 기준으로 프로젝트별 줄로 나눈다.
    return targets.flatMap((project) =>
      serverMembers
        .filter((member) => member.projectId === project.id)
        .map((member) => {
          // 그날 이 사람에게 잡힌 일정만 — 담당자 이니셜로 매칭한다.
          const tasks = normalize(
            schedules
              .filter(
                (s) =>
                  s.date === date &&
                  s.projectId === project.id &&
                  (s.assignees ?? []).includes(member.initials),
              )
              .map((s) => ({
                id: s.id,
                title: s.title,
                startTime: s.startTime,
                endTime: s.endTime,
                done: s.checked ?? false,
              })),
          );

          // 막힘(blocked)을 알려주는 엔드포인트가 아직 없다 — 그날 일정이 전부
          // 완료 표시면 완료, 아니면 진행 중으로만 구분한다.
          const allDone = tasks.length > 0 && tasks.every((t) => t.done);

          return {
            id: `${project.id}-${member.id}`,
            name: member.name,
            role: member.role,
            initials: member.initials,
            projectId: project.id,
            projectName: project.name,
            status: allDone ? ("done" as TeamStatus) : ("progress" as TeamStatus),
            tasks,
          };
        }),
    );
  }, [projectId, projects, schedules, date, serverMembers]);

  return { rows, loading };
}
