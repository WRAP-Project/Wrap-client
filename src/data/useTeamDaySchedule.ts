import { useMemo } from "react";
import { getProjectMembers } from "./useTeamActivity";
import { useSchedulesContext } from "./SchedulesContext";
import { useProjectsContext } from "./ProjectsContext";

/**
 * 캘린더 "팀원 일정" 탭 전용 훅.
 *
 * 하루치 팀원 타임라인을 만든다 — 팀원 명단은 useTeamActivity의 mock,
 * 일정 블록은 실제 등록된 일정(useSchedules)에서 담당자 이니셜로 매칭한다.
 * 등록된 일정이 없는 날은 화면이 통째로 비어 보이므로 프로젝트별 일과 mock으로
 * 채운다. 백엔드 GET /projects/{projectId}/schedules 가 준비되면 이 파일
 * 내부만 fetch 기반으로 교체하면 된다 — 화면은 건드릴 필요 없음.
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

// ── 일과 mock ─────────────────────────────────────────────────────────────────
// 등록된 일정만으로는 하루가 거의 비어 보여서, 프로젝트 성격에 맞는 일과를
// 날짜+팀원 순서로 결정적(deterministic)으로 뽑아 채운다. 같은 날짜를 다시 보면
// 항상 같은 결과가 나온다.

const TASK_POOL: Record<string, string[]> = {
  "1": ["디자인 리뷰", "온보딩 플로우 정리", "컴포넌트 정비", "QA 검토", "기획 정리", "수정 반영"],
  "2": ["로고 시안 작업", "브랜드 가이드 정리", "무드보드 리뷰", "카피 다듬기", "런칭 채널 정리"],
  "3": ["캠페인 콘셉트 정리", "채널 리서치", "녹음 대본 검토", "랜딩 페이지 작업", "성과 지표 정리"],
};

const FALLBACK_POOL = ["업무 정리", "리뷰", "문서 작성", "회의 준비"];

const SLOTS: [string, string][] = [
  ["09:30", "11:00"],
  ["10:00", "12:00"],
  ["11:00", "12:30"],
  ["13:00", "14:30"],
  ["14:00", "16:00"],
  ["15:00", "16:30"],
  ["16:30", "18:00"],
  ["17:00", "18:30"],
];

/** 날짜 문자열을 정수 시드로 — 같은 날은 항상 같은 일과가 나온다. */
function seedOf(date: string): number {
  let acc = 0;
  for (let i = 0; i < date.length; i++) acc = (acc * 31 + date.charCodeAt(i)) % 100_000;
  return acc;
}

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

  const rows = useMemo<TeamMemberDay[]>(() => {
    const targets = projectId ? projects.filter((p) => p.id === projectId) : projects;
    const seed = seedOf(date);
    const out: TeamMemberDay[] = [];

    // 팀원은 프로젝트 간 겹치지 않는다(useTeamActivity.ts 참고) —
    // 전체 보기에서도 중복 제거 없이 프로젝트 순서대로 이어 붙이면 된다.
    targets.forEach((project) => {
      const pool = TASK_POOL[project.id] ?? FALLBACK_POOL;

      getProjectMembers(project.id).forEach((member, i) => {
        // 1) 실제 등록된 일정 — 담당자 이니셜이 맞는 것만
        const fromSchedules: TeamTaskBlock[] = schedules
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
            done: false,
          }));

        // 2) 남는 자리를 일과 mock으로 채운다
        const fillerCount = 1 + ((seed + i) % 2);
        const filler: TeamTaskBlock[] = Array.from({ length: fillerCount }, (_, k) => {
          const [start, end] = SLOTS[(seed + i * 3 + k * 5) % SLOTS.length];
          return {
            id: `${project.id}-${member.initials}-${date}-${k}`,
            title: pool[(seed + i * 2 + k * 3) % pool.length],
            startTime: start,
            endTime: end,
            done: false,
          };
        });

        const memberDone = !member.blocked && (seed + i) % 4 === 2;
        const tasks = normalize([...fromSchedules, ...filler]).map((t) => ({
          ...t,
          done: memberDone,
        }));

        out.push({
          id: `${project.id}-${member.initials}`,
          name: member.name,
          role: member.role,
          initials: member.initials,
          projectId: project.id,
          projectName: project.name,
          status: member.blocked ? "blocked" : memberDone ? "done" : "progress",
          tasks,
        });
      });
    });

    return out;
  }, [projectId, projects, schedules, date]);

  return { rows, loading: false };
}
