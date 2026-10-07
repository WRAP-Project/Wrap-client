import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import { useProjectsContext } from "./ProjectsContext";
import { initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";

// 일정 공유 대상 팀원 목록. 명단은 GET /projects/{projectId}/members 하나에서만
// 온다 — 팀 활동·캘린더·공유 대상 선택이 같은 이름을 보게 하려는 것이다.

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** 아바타에 쓰는 한 글자 — 이름 첫 글자 */
  letter: string;
  /** 어느 프로젝트의 멤버로 집계됐는지(Project.id) — 전체 보기에서 줄을 나눌 때 쓴다 */
  projectId: string;
  /**
   * 서버가 준 식별자 두 개를 그대로 들고 있는다 — 일정 담당자 지정처럼 id를
   * 요청에 실어야 하는 곳이 쓴다. 가공한 문자열 id(`pm-12`)로는 복원할 수 없어
   * 원본을 남긴다.
   */
  projectMemberId: number | null;
  memberId: number | null;
}

/**
 * 일정(Task)의 assigneeId로 보낼 값 — projectMemberId다(백엔드 확인 완료).
 *
 * 스펙만으로는 알 수 없는 부분이다. TaskAssigneeResponse가 projectMemberId와
 * memberId를 둘 다 내려주기 때문인데, 서버는 ProjectMember의 PK로 조회하고
 * Task.assignee도 ProjectMember FK다.
 *
 * memberId를 잘못 보내면 404 PROJECT_MEMBER_NOT_FOUND가 나고, 운 나쁘게 같은
 * 값의 projectMemberId가 그 프로젝트에 있으면 조용히 엉뚱한 사람에게 배정된다
 * — 그래서 고르는 자리를 이 함수 하나로 묶어 둔다.
 */
export function assigneeIdOf(member: TeamMember): number | null {
  return member.projectMemberId;
}

async function fetchMembers(clientProjectId: string, serverId: number): Promise<TeamMember[]> {
  const { data, response } = await apiClient.GET("/projects/{projectId}/members", {
    params: { path: { projectId: serverId } },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok || data?.success === false) {
    throw new Error("팀원 목록을 불러오지 못했습니다.");
  }
  return (data?.data ?? [])
    .filter((member) => member.status !== "LEFT")
    .map((member) => {
      const name = member.nickname ?? "이름 없음";
      return {
        id: `pm-${member.projectMemberId}`,
        name,
        role: roleLabelOf(member.role),
        initials: initialsOf(name),
        letter: name.slice(0, 1),
        projectId: clientProjectId,
        projectMemberId: member.projectMemberId ?? null,
        memberId: member.memberId ?? null,
      };
    });
}

/** projectId가 null이면 참여 중인 모든 프로젝트의 팀원을 합쳐서 돌려준다. */
export function useTeamMembers(projectId: string | null) {
  const { projects } = useProjectsContext();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  // 조회 대상 프로젝트의 id 목록. projectId가 주어지면 그 하나만, 아니면 참여
  // 중인 전부다. 배열 identity가 매 렌더마다 바뀌면 effect가 끝없이 돌므로
  // 문자열 키로 묶어서 비교한다.
  const targetKey = useMemo(() => {
    const targets = projectId ? projects.filter((p) => p.id === projectId) : projects;
    return targets
      .filter((p) => serverIdOf(p.id) !== null)
      .map((p) => p.id)
      .join(",");
  }, [projectId, projects]);

  useEffect(() => {
    const targets = targetKey ? targetKey.split(",") : [];
    if (targets.length === 0) {
      setMembers([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    // 한 프로젝트가 실패해도 나머지 명단은 보여준다 — 전체 보기에서 프로젝트
    // 하나 때문에 화면이 통째로 비면 안 된다.
    void Promise.all(
      targets.map((id) =>
        fetchMembers(id, serverIdOf(id) as number).catch((): TeamMember[] => []),
      ),
    )
      .then((lists) => {
        if (cancelled) return;
        // 한 사람이 여러 프로젝트에 속하면 projectMemberId가 달라 중복으로
        // 보인다 — 이름+역할 기준으로 걸러 먼저 나온 프로젝트에 집계한다.
        const seen = new Set<string>();
        setMembers(
          lists.flat().filter((m) => {
            const key = `${m.name}|${m.role}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          }),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [targetKey]);

  return { members, loading };
}
