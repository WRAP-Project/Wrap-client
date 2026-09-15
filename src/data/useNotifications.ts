import { useReceivedInvitations } from "./useReceivedInvitations";

// 헤더 알림 뱃지가 읽는 값. 범용 알림 목록/미읽음 조회 엔드포인트는 아직 없고
// (api/openapi.yaml에 없음), 지금 실제로 사용자가 답해야 하는 알림은 "받은 프로젝트
// 초대" 하나뿐이라 그 개수를 그대로 쓴다. 다른 종류의 알림이 생기면 여기서 합친다 —
// 화면(ProjectSelect 헤더)은 그대로다.

export function useNotifications() {
  const { invitations, loading } = useReceivedInvitations();
  const unreadCount = invitations.length;
  return { unreadCount, hasUnread: unreadCount > 0, loading };
}
