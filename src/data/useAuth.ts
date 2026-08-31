// 읽기/쓰기 훅 인터페이스 — 화면은 이 훅만 안다. 세션은 AuthContext가 전역으로
// 들고 있어 로그인·회원가입·마이페이지가 같은 회원 정보를 공유한다.

export { useAuthContext as useAuth } from "./AuthContext";
export type { Member, AuthError } from "./AuthContext";
