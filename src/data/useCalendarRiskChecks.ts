import { useEffect, useMemo, useState } from "react";
import { apiClient } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";
import { initialsOf, roleLabelOf } from "./projectMemberDisplay";
import { clientIdOfServerProject, REQUEST_TIMEOUT_MS, serverIdOf } from "./useProjects";
import { useProjectsContext } from "./ProjectsContext";

type RiskCheckResponse = components["schemas"]["CalendarRiskCheckResponse"];

export interface CalendarRiskSignal {
  id: string;
  projectId: string;
  title: string;
  statusLabel: string;
  assignee: string;
  assigneeRole?: string;
  assigneeInitials?: string;
}

function riskStatusLabel(risk: RiskCheckResponse): string {
  if (risk.reason) return risk.reason;
  if (risk.riskLevel === "BLOCKED") return "막힘";
  if (risk.riskLevel === "OVERDUE") return "기한 초과";
  if (risk.riskLevel === "DUE_SOON") return "마감 임박";
  return "확인 필요";
}

function mapRiskSignal(risk: RiskCheckResponse): CalendarRiskSignal | null {
  if (risk.taskId === undefined || risk.projectId === undefined || !risk.title) return null;
  const assignee = risk.assigneeNickname ?? "담당자";
  return {
    id: `risk-${risk.taskId}`,
    projectId: clientIdOfServerProject(risk.projectId),
    title: risk.title,
    statusLabel: riskStatusLabel(risk),
    assignee,
    assigneeRole: roleLabelOf(risk.assigneeRole),
    assigneeInitials: initialsOf(assignee),
  };
}

export function useCalendarRiskChecks(filterProjectId: string | null) {
  const { projects } = useProjectsContext();
  const [signals, setSignals] = useState<CalendarRiskSignal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const targetProjectIds = useMemo(() => {
    if (filterProjectId) {
      const id = serverIdOf(filterProjectId);
      return id === null ? [] : [id];
    }
    return projects
      .map((project) => serverIdOf(project.id))
      .filter((id): id is number => id !== null);
  }, [filterProjectId, projects]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (targetProjectIds.length === 0) {
        setSignals([]);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const results = await Promise.all(
          targetProjectIds.map((projectId) =>
            apiClient.GET("/projects/{projectId}/calendar/risk-checks", {
              params: { path: { projectId } },
              signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            }),
          ),
        );

        if (cancelled) return;
        const failed = results.find(({ response, data }) => !response.ok || data?.success === false);
        if (failed) {
          throw new Error(failed.data?.error?.message ?? "리스크 체크를 불러오지 못했습니다.");
        }

        setSignals(
          results
            .flatMap(({ data }) => data?.data ?? [])
            .map(mapRiskSignal)
            .filter((signal): signal is CalendarRiskSignal => signal !== null),
        );
        setError(null);
      } catch (e) {
        if (cancelled) return;
        setSignals([]);
        setError(
          e instanceof Error && e.name !== "TimeoutError"
            ? e
            : new Error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."),
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [targetProjectIds]);

  return { signals, loading, error };
}
