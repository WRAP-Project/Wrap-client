import { useState } from "react";

// 일정 공유 대상 팀원 목록. 백엔드에 프로젝트 멤버 조회 API가 아직 없어
// (api/openapi.yaml에 없음) mock만 존재한다 — 준비되면 이 훅 내부만 교체한다.

export interface TeamMember {
  id: string;
  name: string;
}

const MOCK_MEMBERS: TeamMember[] = [
  { id: "m1", name: "팀원A" },
  { id: "m2", name: "팀원B" },
  { id: "m3", name: "팀원C" },
  { id: "m4", name: "팀원D" },
];

export function useTeamMembers() {
  const [members] = useState<TeamMember[]>(MOCK_MEMBERS);
  return { members, loading: false };
}
