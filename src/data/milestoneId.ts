/**
 * 마일스톤 id 변환 — 서버의 숫자 id ↔ 화면이 들고 다니는 문자열 id.
 *
 * useMilestones.ts 안에 있던 것을 떼어냈다. 일정 등록이 마일스톤을 연결하면서
 * useSchedules.ts도 같은 변환이 필요해졌는데, useMilestones.ts는 이미
 * useSchedules.ts의 daysLeft를 쓰고 있어 그대로 가져다 쓰면 순환 import가 된다.
 */

const MILESTONE_ID_PREFIX = "srv-m-";

/** 서버 숫자 id → 화면 문자열 id */
export function clientMilestoneIdOf(id: number): string {
  return `${MILESTONE_ID_PREFIX}${id}`;
}

/** 화면 문자열 id → 서버 숫자 id. 서버에서 온 id가 아니면 null. */
export function milestoneServerIdOf(milestoneId: string | undefined): number | null {
  if (!milestoneId?.startsWith(MILESTONE_ID_PREFIX)) return null;
  const n = Number(milestoneId.slice(MILESTONE_ID_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}
