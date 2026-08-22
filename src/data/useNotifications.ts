import { useState } from "react";

// 헤더 알림 뱃지가 읽는 값. 알림 목록/미읽음 조회 엔드포인트가 아직 없어
// (api/openapi.yaml에 없음) mock만 반환한다 — 준비되면 이 파일 내부만
// fetch 기반으로 교체하면 되고, 화면은 그대로다.

const MOCK_UNREAD_COUNT = 3;

export function useNotifications() {
  const [unreadCount] = useState<number>(MOCK_UNREAD_COUNT);
  return { unreadCount, hasUnread: unreadCount > 0, loading: false };
}
