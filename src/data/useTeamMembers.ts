import { useMemo } from "react";
import { getProjectMembers } from "./useTeamActivity";
import { useProjectsContext } from "./ProjectsContext";

// 일정 공유 대상 팀원 목록. 백엔드에 프로젝트 멤버 조회 API가 아직 없어
// (api/openapi.yaml에 없음) mock만 존재한다 — 준비되면 이 훅 내부만 교체한다.
// 명단 자체는 useTeamActivity.ts 하나에서만 관리한다(화면마다 이름이 어긋나지 않게).

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** 아바타에 쓰는 한 글자 — 이름 첫 글자 */
  letter: string;
}

/** projectId가 null이면 참여 중인 모든 프로젝트의 팀원을 합쳐서 돌려준다. */
export function useTeamMembers(projectId: string | null) {
  const { projects } = useProjectsContext();

  const members = useMemo<TeamMember[]>(() => {
    const targets = projectId ? projects.filter((p) => p.id === projectId) : projects;
    return targets.flatMap((p) =>
      getProjectMembers(p.id).map((m) => ({
        id: `${p.id}-${m.initials}`,
        name: m.name,
        role: m.role,
        initials: m.initials,
        letter: m.name.slice(0, 1),
      })),
    );
  }, [projectId, projects]);

  return { members, loading: false };
}
