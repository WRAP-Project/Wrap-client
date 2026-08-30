import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

// ── 일정 조정 요청 ─────────────────────────────────────────────────────────────
// 캘린더 아이콘 → 일정 조정 흐름(요청 목록 → 가능 시간 칠하기 → 추천 시간 →
// 전체 시간 대조)의 데이터. 백엔드에 관련 엔드포인트가 아직 없어(openapi.yaml
// 기준) 전부 mock이며, 준비되면 이 파일 내부만 교체한다.
//
// "나"는 memberId "me"로 표현한다(프로필 사용자). 나머지 memberIds는
// useTeamMembers의 id(`${projectId}-${initials}`)를 그대로 쓴다.

export const ME_ID = "me";

export interface AdjustRequest {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  /** 공유 대상 팀원(나 포함) */
  memberIds: string[];
  /** 팀원별 제출한 가능 시간 — memberId → 슬롯 키("YYYY-MM-DDTHH") 배열 */
  submissions: Record<string, string[]>;
  status: "active" | "closed";
  /** 마감(확정) 표시용 라벨 — "07.11" */
  closedOn?: string;
}

export interface AdjustRequestDraft {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  memberIds: string[];
}

// ── 슬롯 헬퍼 ─────────────────────────────────────────────────────────────────

export function slotKey(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}`;
}

/** 요청의 날짜 범위 — 그리드가 감당 가능하게 최대 7일까지만 */
export function requestDays(req: AdjustRequest): string[] {
  const out: string[] = [];
  const d = new Date(req.startDate + "T00:00:00");
  const end = new Date(req.endDate + "T00:00:00");
  while (d <= end && out.length < 7) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    out.push(`${y}-${m}-${day}`);
    d.setDate(d.getDate() + 1);
  }
  return out;
}

/** 요청의 시간 범위(시 단위) — [9, 10, …, 19] */
export function requestHours(req: AdjustRequest): number[] {
  const start = Number(req.startTime.slice(0, 2));
  const end = Number(req.endTime.slice(0, 2));
  return Array.from({ length: Math.max(0, end - start) }, (_, i) => start + i);
}

/** 슬롯별 가능한 팀원 id 목록 */
export function cellAvailability(req: AdjustRequest): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [memberId, slots] of Object.entries(req.submissions)) {
    for (const key of slots) {
      const list = map.get(key) ?? [];
      list.push(memberId);
      map.set(key, list);
    }
  }
  return map;
}

export interface RecommendedSlot {
  key: string;
  date: string;
  hour: number;
  /** 가능한 인원 수 */
  count: number;
  /** 불가(미제출 포함) 팀원 id */
  unavailable: string[];
}

/** 가능한 인원이 많은 순 → 빠른 시간 순으로 상위 slot들을 추천한다. */
export function recommendSlots(req: AdjustRequest, limit = 3): RecommendedSlot[] {
  const avail = cellAvailability(req);
  const slots: RecommendedSlot[] = [];
  for (const date of requestDays(req)) {
    for (const hour of requestHours(req)) {
      const key = slotKey(date, hour);
      const ok = avail.get(key) ?? [];
      if (ok.length === 0) continue;
      slots.push({
        key, date, hour,
        count: ok.length,
        unavailable: req.memberIds.filter((id) => !ok.includes(id)),
      });
    }
  }
  slots.sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));
  return slots.slice(0, limit);
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}
function shiftDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** memberId+요청 범위에서 결정적으로 가능 시간을 만들어낸다(mock 전용). */
function mockSlots(memberId: string, days: string[], hours: number[]): string[] {
  let hash = 0;
  for (const ch of memberId) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  const out: string[] = [];
  days.forEach((date, di) => {
    hours.forEach((hour, hi) => {
      // 팀원마다 다른 패턴으로 6~7할 정도 가능
      if ((hash + di * 7 + hi * 3) % 10 < 7) out.push(slotKey(date, hour));
    });
  });
  return out;
}

/** 시드 요청: 나를 제외한 팀원 4명은 이미 제출한 상태 — 카드에 4/5로 보인다. */
function seedRequests(): AdjustRequest[] {
  const others = ["1-KM", "1-LJ", "1-PJ", "1-CS"];
  const active: AdjustRequest = {
    id: "adj-1",
    title: "정기 회의 시간 정하기",
    startDate: shiftDays(0),
    endDate: shiftDays(6),
    startTime: "09:00",
    endTime: "20:00",
    memberIds: [ME_ID, ...others],
    submissions: {},
    status: "active",
  };
  const days = requestDays(active);
  const hours = requestHours(active);
  for (const id of others) active.submissions[id] = mockSlots(id, days, hours);

  const closed: AdjustRequest = {
    id: "adj-0",
    title: "정기 회의 시간 정하기",
    startDate: shiftDays(-7),
    endDate: shiftDays(-4),
    startTime: "09:00",
    endTime: "20:00",
    memberIds: [ME_ID, ...others, "1-YC"],
    submissions: {},
    status: "closed",
    closedOn: (() => {
      const d = new Date();
      d.setDate(d.getDate() - 5);
      return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
    })(),
  };
  for (const id of closed.memberIds) closed.submissions[id] = [];

  return [active, closed];
}

// ── Context ───────────────────────────────────────────────────────────────────
// 목록·생성 폼·칠하기·추천·대조 화면이 같은 요청 상태를 공유하므로 전역화한다.

interface AdjustRequestsContextValue {
  requests: AdjustRequest[];
  addRequest: (draft: AdjustRequestDraft) => AdjustRequest;
  /** 가능 시간 제출(다시 제출하면 덮어쓴다) */
  submitAvailability: (requestId: string, memberId: string, slots: string[]) => void;
  /** 시간 확정 — 요청을 마감 처리한다 */
  closeRequest: (requestId: string) => void;
  loading: boolean;
}

const AdjustRequestsContext = createContext<AdjustRequestsContextValue | null>(null);

export function AdjustRequestsProvider({ children }: { children: ReactNode }) {
  const [requests, setRequests] = useState<AdjustRequest[]>(seedRequests);

  const addRequest = useCallback((draft: AdjustRequestDraft): AdjustRequest => {
    const created: AdjustRequest = {
      id: crypto.randomUUID(),
      ...draft,
      submissions: {},
      status: "active",
    };
    setRequests((prev) => [created, ...prev]);
    return created;
  }, []);

  const submitAvailability = useCallback((requestId: string, memberId: string, slots: string[]) => {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId ? { ...r, submissions: { ...r.submissions, [memberId]: slots } } : r,
      ),
    );
  }, []);

  const closeRequest = useCallback((requestId: string) => {
    const today = new Date();
    const label = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "closed", closedOn: label } : r)),
    );
  }, []);

  const value = useMemo(
    () => ({ requests, addRequest, submitAvailability, closeRequest, loading: false }),
    [requests, addRequest, submitAvailability, closeRequest],
  );

  return <AdjustRequestsContext.Provider value={value}>{children}</AdjustRequestsContext.Provider>;
}

export function useAdjustRequests() {
  const ctx = useContext(AdjustRequestsContext);
  if (!ctx) throw new Error("useAdjustRequests는 AdjustRequestsProvider 안에서만 사용 가능합니다.");
  return ctx;
}
