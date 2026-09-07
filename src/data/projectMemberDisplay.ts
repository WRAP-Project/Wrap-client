/**
 * 프로젝트 멤버를 화면에 표시할 때 쓰는 공용 변환.
 *
 * 백엔드 ProjectMemberResponse는 nickname / role(OWNER|MEMBER)만 주고,
 * 이니셜·아바타 색 같은 표시용 값은 없다. 팀원 목록을 보여주는 곳이
 * 두 군데(useProjectInvite, useProjectDetail)라 여기 모아둔다.
 */

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "관리자",
  MEMBER: "팀원",
};

export function roleLabelOf(role: string | undefined): string {
  return ROLE_LABEL[role ?? "MEMBER"] ?? "팀원";
}

// 아바타 배경. 같은 이름이면 항상 같은 색이 나오도록 해시로 고른다.
const AVATAR_COLORS = ["#7B46F8", "#5B39C4", "#EB3E88", "#3A6EA5", "#3A3A3C"];

export function avatarBgOf(seed: string): string {
  let hash = 0;
  for (const ch of seed) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

/** 닉네임은 앞 2자, 이메일은 @ 앞 2자를 이니셜로 쓴다. */
export function initialsOf(name: string): string {
  const base = name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
  return base.slice(0, 2).toUpperCase();
}
