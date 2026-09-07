import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";
import { REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { useProjectsContext } from "./ProjectsContext";

export const ME_ID = "me";

export interface AdjustRequest {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  memberIds: string[];
  submissions: Record<string, string[]>;
  status: "active" | "closed";
  closedOn?: string;
  totalMemberCount?: number;
  submittedMemberCount?: number;
  mineSubmitted?: boolean;
  recommendedSlots?: RecommendedSlot[];
}

export interface AdjustRequestDraft {
  title: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  memberIds: string[];
}

type AvailabilitySummary = components["schemas"]["AvailabilityRequestSummaryResponse"];
type AvailabilityDetail = components["schemas"]["AvailabilityRequestDetailResponse"];
type AvailabilityResponses = components["schemas"]["AvailabilityResponsesResponse"];
type MyAvailability = components["schemas"]["MyAvailabilityResponse"];
type RecommendedSlotResponse = components["schemas"]["RecommendedSlotResponse"];

export function slotKey(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}`;
}

function dateTimeOf(date: string, hour: number): string {
  return `${date}T${String(hour).padStart(2, "0")}:00:00`;
}

function slotKeyFromDateTime(value: string | undefined): string | null {
  if (!value) return null;
  const [date, time = "00:00:00"] = value.split("T");
  const hour = Number(time.slice(0, 2));
  if (!date || !Number.isInteger(hour)) return null;
  return slotKey(date, hour);
}

function slotRequestFromKey(key: string) {
  const [date, rawHour] = key.split("T");
  const hour = Number(rawHour);
  return {
    startAt: dateTimeOf(date, hour),
    endAt: dateTimeOf(date, hour + 1),
  };
}

function closedLabel(dateStr: string | undefined): string | undefined {
  if (!dateStr) return undefined;
  return `${dateStr.slice(5, 7)}.${dateStr.slice(8, 10)}`;
}

function normalizeTime(value: string | undefined, fallback: string): string {
  return value ? value.slice(0, 5) : fallback;
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
  count: number;
  unavailable: string[];
}

/** 가능한 인원이 많은 순 → 빠른 시간 순으로 상위 slot들을 추천한다. */
export function recommendSlots(req: AdjustRequest, limit = 3): RecommendedSlot[] {
  if (req.recommendedSlots) return req.recommendedSlots.slice(0, limit);

  const avail = cellAvailability(req);
  const slots: RecommendedSlot[] = [];
  for (const date of requestDays(req)) {
    for (const hour of requestHours(req)) {
      const key = slotKey(date, hour);
      const ok = avail.get(key) ?? [];
      if (ok.length === 0) continue;
      slots.push({
        key,
        date,
        hour,
        count: ok.length,
        unavailable: req.memberIds.filter((id) => !ok.includes(id)),
      });
    }
  }
  slots.sort((a, b) => (b.count - a.count) || a.key.localeCompare(b.key));
  return slots.slice(0, limit);
}

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
      if ((hash + di * 7 + hi * 3) % 10 < 7) out.push(slotKey(date, hour));
    });
  });
  return out;
}

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

const SERVER_REQUEST_PREFIX = "srv-av-";

function clientRequestIdOf(id: number): string {
  return `${SERVER_REQUEST_PREFIX}${id}`;
}

function serverRequestIdOf(id: string): number | null {
  if (!id.startsWith(SERVER_REQUEST_PREFIX)) return null;
  const n = Number(id.slice(SERVER_REQUEST_PREFIX.length));
  return Number.isInteger(n) ? n : null;
}

function memberKey(projectMemberId: number | undefined, fallback: number): string {
  return projectMemberId === undefined ? `member-${fallback}` : `pm-${projectMemberId}`;
}

function slotsFromResponse(slots: { startAt?: string }[] | undefined): string[] {
  return (slots ?? [])
    .map((slot) => slotKeyFromDateTime(slot.startAt))
    .filter((key): key is string => key !== null);
}

function recommendedFromResponse(slots: RecommendedSlotResponse[] | undefined): RecommendedSlot[] | undefined {
  if (!slots) return undefined;
  return slots
    .map((slot) => {
      const key = slotKeyFromDateTime(slot.startAt);
      if (!key) return null;
      const [date, rawHour] = key.split("T");
      return {
        key,
        date,
        hour: Number(rawHour),
        count: slot.availableCount ?? 0,
        unavailable: [] as string[],
      };
    })
    .filter((slot): slot is RecommendedSlot => slot !== null);
}

function mapServerRequest(
  summary: AvailabilitySummary,
  detail: AvailabilityDetail | undefined,
  responses: AvailabilityResponses | undefined,
  myResponse: MyAvailability | undefined,
  recommended: RecommendedSlotResponse[] | undefined,
): AdjustRequest | null {
  const id = detail?.availabilityRequestId ?? summary.availabilityRequestId;
  if (id === undefined || !summary.title) return null;

  const members = responses?.members ?? [];
  const memberIds = members.length
    ? members.map((member, index) => memberKey(member.projectMemberId, index))
    : Array.from({ length: detail?.totalMemberCount ?? 0 }, (_, index) => `member-${index + 1}`);

  const submissions: Record<string, string[]> = {};
  members.forEach((member, index) => {
    if (!member.submitted) return;
    submissions[memberKey(member.projectMemberId, index)] = slotsFromResponse(member.slots);
  });

  const mySlots = slotsFromResponse(myResponse?.selectedAvailableSlots);
  const mineSubmitted = myResponse !== undefined && (myResponse.selectedAvailableSlots !== undefined || mySlots.length > 0);
  if (mineSubmitted) submissions[ME_ID] = mySlots;

  const status = detail?.status ?? summary.status;
  const totalMemberCount = detail?.totalMemberCount ?? memberIds.length;
  const submittedMemberCount = detail?.submittedMemberCount ?? Object.keys(submissions).length;

  return {
    id: clientRequestIdOf(id),
    title: summary.title,
    startDate: detail?.startDate ?? summary.startDate ?? toDateStr(new Date()),
    endDate: detail?.endDate ?? summary.endDate ?? toDateStr(new Date()),
    startTime: normalizeTime(detail?.startTime ?? summary.startTime, "09:00"),
    endTime: normalizeTime(detail?.endTime ?? summary.endTime, "20:00"),
    memberIds: memberIds.length ? memberIds : Array.from({ length: totalMemberCount }, (_, index) => `member-${index + 1}`),
    submissions,
    status: status === "OPEN" ? "active" : "closed",
    closedOn: status === "OPEN" ? undefined : closedLabel(detail?.endDate ?? summary.endDate),
    totalMemberCount,
    submittedMemberCount,
    mineSubmitted,
    recommendedSlots: recommendedFromResponse(recommended),
  };
}

interface AdjustRequestsContextValue {
  requests: AdjustRequest[];
  addRequest: (draft: AdjustRequestDraft) => Promise<AdjustRequest>;
  submitAvailability: (requestId: string, memberId: string, slots: string[]) => Promise<void>;
  closeRequest: (requestId: string) => void;
  confirmRequest: (requestId: string, title: string, date: string, hour: number) => Promise<void>;
  loading: boolean;
  error: Error | null;
}

const AdjustRequestsContext = createContext<AdjustRequestsContextValue | null>(null);

export function AdjustRequestsProvider({ children }: { children: ReactNode }) {
  const { projects, selectedProjectId } = useProjectsContext();
  const [requests, setRequests] = useState<AdjustRequest[]>(seedRequests);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const serverProjectId = useMemo(() => {
    const selected = serverIdOf(selectedProjectId ?? undefined);
    if (selected !== null) return selected;
    return projects
      .map((project) => serverIdOf(project.id))
      .find((id): id is number => id !== null) ?? null;
  }, [projects, selectedProjectId]);

  const loadRequests = useCallback(async () => {
    if (serverProjectId === null) {
      setRequests(seedRequests());
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, response } = await apiClient.GET("/projects/{projectId}/availability-requests", {
        params: { path: { projectId: serverProjectId } },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error?.message ?? "가능 시간 요청 목록을 불러오지 못했습니다.");
      }

      const mapped = await Promise.all(
        (data?.data ?? []).map(async (summary) => {
          if (summary.availabilityRequestId === undefined) return null;
          const availabilityRequestId = summary.availabilityRequestId;
          const [detailRes, responsesRes, myRes, recommendedRes] = await Promise.all([
            apiClient.GET("/projects/{projectId}/availability-requests/{availabilityRequestId}", {
              params: { path: { projectId: serverProjectId, availabilityRequestId } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }),
            apiClient.GET("/projects/{projectId}/availability-requests/{availabilityRequestId}/responses", {
              params: { path: { projectId: serverProjectId, availabilityRequestId } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }),
            apiClient.GET("/projects/{projectId}/availability-requests/{availabilityRequestId}/me/response", {
              params: { path: { projectId: serverProjectId, availabilityRequestId } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }),
            apiClient.GET("/projects/{projectId}/availability-requests/{availabilityRequestId}/recommended-slots", {
              params: { path: { projectId: serverProjectId, availabilityRequestId } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }),
          ]);
          return mapServerRequest(
            summary,
            detailRes.data?.data,
            responsesRes.data?.data,
            myRes.response.ok ? myRes.data?.data : undefined,
            recommendedRes.response.ok ? recommendedRes.data?.data : undefined,
          );
        }),
      );

      setRequests(mapped.filter((request): request is AdjustRequest => request !== null));
      setError(null);
    } catch (e) {
      setRequests([]);
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e
          : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
      );
    } finally {
      setLoading(false);
    }
  }, [serverProjectId]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const addRequest = useCallback(
    async (draft: AdjustRequestDraft): Promise<AdjustRequest> => {
      if (serverProjectId === null) {
        const created: AdjustRequest = {
          id: crypto.randomUUID(),
          ...draft,
          submissions: {},
          status: "active",
        };
        setRequests((prev) => [created, ...prev]);
        return created;
      }

      const { data, response } = await apiClient.POST("/projects/{projectId}/availability-requests", {
        params: { path: { projectId: serverProjectId } },
        body: {
          title: draft.title,
          startDate: draft.startDate,
          endDate: draft.endDate,
          startTime: draft.startTime,
          endTime: draft.endTime,
          slotUnitMinutes: 60,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok || data?.success === false || !data?.data) {
        throw new Error(data?.error?.message ?? "가능 시간 요청 생성에 실패했습니다.");
      }

      const created = mapServerRequest({ ...data.data, title: data.data.title }, data.data, undefined, undefined, undefined);
      if (!created) throw new Error("가능 시간 요청 응답을 해석하지 못했습니다.");
      setRequests((prev) => [created, ...prev]);
      void loadRequests();
      return created;
    },
    [loadRequests, serverProjectId],
  );

  const submitAvailability = useCallback(
    async (requestId: string, memberId: string, slots: string[]) => {
      const availabilityRequestId = serverRequestIdOf(requestId);
      if (serverProjectId !== null && availabilityRequestId !== null && memberId === ME_ID) {
        const { data, response } = await apiClient.PUT(
          "/projects/{projectId}/availability-requests/{availabilityRequestId}/me/response",
          {
            params: { path: { projectId: serverProjectId, availabilityRequestId } },
            body: { slots: slots.map(slotRequestFromKey) },
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          },
        );
        if (!response.ok || data?.success === false) {
          throw new Error(data?.error?.message ?? "가능 시간 제출에 실패했습니다.");
        }
        await loadRequests();
        return;
      }

      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId ? { ...r, submissions: { ...r.submissions, [memberId]: slots } } : r,
        ),
      );
    },
    [loadRequests, serverProjectId],
  );

  const closeRequest = useCallback((requestId: string) => {
    const today = new Date();
    const label = `${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: "closed", closedOn: label } : r)),
    );
  }, []);

  const confirmRequest = useCallback(
    async (requestId: string, title: string, date: string, hour: number) => {
      const availabilityRequestId = serverRequestIdOf(requestId);
      const request = requests.find((r) => r.id === requestId);
      if (serverProjectId === null || availabilityRequestId === null || !request) {
        closeRequest(requestId);
        return;
      }

      const { data, response } = await apiClient.POST(
        "/projects/{projectId}/availability-requests/{availabilityRequestId}/confirm",
        {
          params: { path: { projectId: serverProjectId, availabilityRequestId } },
          body: {
            title,
            startAt: dateTimeOf(date, hour),
            endAt: dateTimeOf(date, hour + 1),
          },
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        },
      );
      if (!response.ok || data?.success === false) {
        throw new Error(data?.error?.message ?? "일정 확정에 실패했습니다.");
      }
      await loadRequests();
    },
    [closeRequest, loadRequests, requests, serverProjectId],
  );

  const value = useMemo(
    () => ({ requests, addRequest, submitAvailability, closeRequest, confirmRequest, loading, error }),
    [requests, addRequest, submitAvailability, closeRequest, confirmRequest, loading, error],
  );

  return <AdjustRequestsContext.Provider value={value}>{children}</AdjustRequestsContext.Provider>;
}

export function useAdjustRequests() {
  const ctx = useContext(AdjustRequestsContext);
  if (!ctx) throw new Error("useAdjustRequests는 AdjustRequestsProvider 안에서만 사용 가능합니다.");
  return ctx;
}
