import { useMemo, useState } from "react";
import { C } from "@/screens/chatTheme";
import { useProjectsContext } from "./ProjectsContext";

export interface ChatRoom {
  id: number;
  title: string;
  time: string;
  people: number;
  initials: string;
  unread: number;
  note: string;
  project: string;
  color: string;
}

export interface ChatRoomGroup {
  projectId: string; // useProjects.ts의 Project.id와 1:1로 대응
  project: string;
  color: string;
  rooms: Omit<ChatRoom, "project" | "color">[];
}

export type ChatMessage = [speaker: string, text: string, speakerColor?: string];

export interface ChatParticipant {
  name: string;
  role: string;
  initials: string;
  color: string;
}

// 받은 메시지는 화자 색으로 아바타만 표시하고 말풍선은 중립 회색
const MOCK_MESSAGES: ChatMessage[] = [
  ["시스템", "세션이 시작됐어요 · 00:00"],
  ["유나", "오늘 최종 카드 레이아웃까지 확정해볼까요?", C.lime],
  ["나", "네, 어젯밤에 최신 프레임까지 올려뒀어요."],
  ["민지", "카드 간격이 훨씬 또렷해졌네요.", C.blue],
  ["나", "모바일에서도 같은 밀도로 보이게 했어요."],
  ["유나", "테두리는 지금처럼 선명하게 유지하면 좋겠어요.", C.lime],
  ["도윤", "동의해요. 이 톤으로 핸드오프하죠.", C.pink],
];

const MOCK_PARTICIPANTS: ChatParticipant[] = [
  { name: "유나 김", role: "호스트", initials: "YK", color: C.lime },
  { name: "민지 최", role: "디자이너", initials: "MC", color: C.blue },
  { name: "도윤 이", role: "PM", initials: "DI", color: C.pink },
  { name: "서준 박", role: "개발", initials: "SP", color: C.yellow },
];

/**
 * 채팅 탭의 프로젝트 그룹.
 *
 * 그룹 목록은 mock이 아니라 실제 프로젝트 목록(ProjectsContext)에서 만든다 —
 * 서버에 저장한 프로젝트도 채팅 탭에 보여야 하기 때문이다. 이름·색도 프로젝트
 * 쪽 값을 그대로 따라가므로 홈 화면과 어긋나지 않는다.
 *
 * 다만 백엔드에 채팅 엔드포인트가 없어서(api/openapi.yaml에 chat 경로 없음)
 * 방 목록은 아직 비어 있다 — 화면이 "아직 채팅방이 없어요"를 보여준다.
 * 채팅 API가 생기면 아래 rooms만 fetch로 바꾸면 된다.
 */
export function useChatRoomGroups() {
  const { projects, loading, error } = useProjectsContext();

  const groups = useMemo<ChatRoomGroup[]>(
    () =>
      projects.map((p) => ({
        projectId: p.id,
        project: p.name,
        color: p.color,
        rooms: [],
      })),
    [projects],
  );

  return { groups, loading, error };
}

/**
 * 방 상세. 조회할 방 목록이 아직 없으므로 항상 undefined다 — 화면이 "찾을 수
 * 없는 방"으로 처리한다(목록에서는 도달할 수 없고, 딥링크로만 들어올 수 있다).
 */
export function useChatRoom(_roomId: number): {
  room: ChatRoom | undefined;
  loading: boolean;
  error: Error | null;
} {
  return { room: undefined, loading: false, error: null };
}

// 지금은 방 구분 없이 같은 mock 대화를 반환한다. 실제 연동 시 방별 대화를
// 구분해야 한다면 그때 roomId 매개변수를 추가한다.
export function useChatMessages() {
  const [messages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  return { messages, loading: false, error: null as Error | null };
}

export function useChatParticipants() {
  const [participants] = useState<ChatParticipant[]>(MOCK_PARTICIPANTS);
  return { participants, loading: false, error: null as Error | null };
}
