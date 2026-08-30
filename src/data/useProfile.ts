// 읽기/쓰기 훅 인터페이스 — 화면은 이 훅만 안다. 상태는 ProfileContext가 전역으로
// 들고 있어 마이페이지·프로필 편집이 같은 프로필(지정색 포함)을 공유한다.

export { useProfileContext as useProfile } from "./ProfileContext";
export type { Profile, ProfileDraft } from "./ProfileContext";
export { ACCENT_PALETTE } from "./ProfileContext";
