/**
 * 프로젝트 멤버를 화면에 표시할 때 쓰는 공용 변환.
 *
 * 백엔드 ProjectMemberResponse는 nickname / role(OWNER|MEMBER)만 주고,
 * 이니셜 같은 표시용 값은 없다. 팀원 목록을 보여주는 곳이 여러 군데라 여기
 * 모아둔다.
 *
 * 아바타 "색"은 여기서 정하지 않는다 — 팀원은 프로젝트에 속하므로 색은 그
 * 프로젝트의 색을 따라야 한다(lib/color.ts의 memberAvatar). 사람 이름 해시로
 * 색을 뽑으면 같은 프로젝트 안에 그 프로젝트와 무관한 색이 섞인다.
 */

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "관리자",
  MEMBER: "팀원",
};

export function roleLabelOf(role: string | undefined): string {
  return ROLE_LABEL[role ?? "MEMBER"] ?? "팀원";
}

/** 닉네임은 앞 2자, 이메일은 @ 앞 2자를 이니셜로 쓴다. */
export function initialsOf(name: string): string {
  const base = name.includes("@") ? name.slice(0, name.indexOf("@")) : name;
  return base.slice(0, 2).toUpperCase();
}
