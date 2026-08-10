import { useCallback, useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface NotificationSettings {
  push: boolean;
  email: boolean;
  meetingReminder: boolean;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 알림 설정을 내려줄 백엔드 엔드포인트가 아직 없다. 추가되면 이 파일 내부만
// fetch 기반으로 교체하면 된다.

const MOCK_SETTINGS: NotificationSettings = {
  push: true,
  email: false,
  meetingReminder: true,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(MOCK_SETTINGS);

  const toggleSetting = useCallback((key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return { settings, toggleSetting, loading: false, error: null as Error | null };
}
