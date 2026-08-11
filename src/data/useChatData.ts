import { useState } from "react";
import { C } from "@/screens/chatTheme";

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

// API 연동 전 임시 데이터. 백엔드 채팅 엔드포인트가 준비되면 이 파일
// 내부만 fetch 기반으로 바꾸면 된다 — 아래 훅들을 쓰는 화면 쪽은 그대로
// 둔다 (반환 형태가 같으므로).
const MOCK_ROOM_GROUPS: ChatRoomGroup[] = [
  {
    projectId: "1", project: "프로젝트 루프", color: C.lime, rooms: [
      { id: 1, title: "디자인 핸드오프", time: "오늘 · 14:00–15:00", people: 4, initials: "DH", unread: 2, note: "최종 카드 레이아웃을 확인했어요." },
      { id: 2, title: "데일리 스탠드업", time: "오늘 · 09:30–09:45", people: 3, initials: "DS", unread: 0, note: "API 키 이슈를 백엔드에 전달했어요." },
    ],
  },
  {
    projectId: "2", project: "오로라 리브랜딩", color: C.purple, rooms: [
      { id: 3, title: "프로덕트 싱크", time: "오늘 · 11:00–12:00", people: 6, initials: "PS", unread: 5, note: "3분기 로드맵을 확정했어요." },
      { id: 4, title: "주간 플래닝", time: "내일 · 10:00–11:30", people: 2, initials: "JP", unread: 0, note: "새 스프린트 목표를 추가 중이에요." },
    ],
  },
  {
    projectId: "3", project: "캠페인 라디오", color: C.pink, rooms: [
      { id: 5, title: "마케팅 아이디어", time: "금요일 · 15:00–16:00", people: 5, initials: "MI", unread: 1, note: "캠페인 비주얼 검토가 준비됐어요." },
      { id: 6, title: "스프린트 회고", time: "금요일 · 16:30–17:00", people: 4, initials: "SH", unread: 0, note: "좋았던 점과 아쉬운 점을 정리해요." },
    ],
  },
];

const MOCK_ROOMS: ChatRoom[] = MOCK_ROOM_GROUPS.flatMap((g) =>
  g.rooms.map((r) => ({ ...r, project: g.project, color: g.color }))
);

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

export function useChatRoomGroups() {
  const [groups] = useState<ChatRoomGroup[]>(MOCK_ROOM_GROUPS);
  return { groups, loading: false, error: null as Error | null };
}

export function useChatRoom(roomId: number) {
  const [rooms] = useState<ChatRoom[]>(MOCK_ROOMS);
  const room = rooms.find((r) => r.id === roomId) ?? rooms[0];
  return { room, loading: false, error: null as Error | null };
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
