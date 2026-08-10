import { useCallback, useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Integration {
  id: string;
  name: string;
  connected: boolean;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 연동 툴 상태를 내려줄 백엔드 엔드포인트가 아직 없다. 추가되면 이 파일 내부만
// fetch 기반으로 교체하면 된다.

const MOCK_INTEGRATIONS: Integration[] = [
  { id: "figma", name: "Figma", connected: true },
  { id: "notion", name: "Notion", connected: false },
  { id: "slack", name: "Slack", connected: true },
  { id: "drive", name: "Google Drive", connected: false },
];

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(MOCK_INTEGRATIONS);

  const toggleIntegration = useCallback((id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: !i.connected } : i)),
    );
  }, []);

  return { integrations, toggleIntegration, loading: false, error: null as Error | null };
}
