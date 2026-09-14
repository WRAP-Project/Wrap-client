/**
 * 로그인 강제 여부.
 *
 * 기본은 켜짐 — 로그인하지 않았으면 어떤 화면도 보이지 않고 /login으로 간다.
 * VITE_AUTH_REQUIRED="false"일 때만 통째로 꺼진다. 화면 대부분이 아직 mock으로
 * 동작하고 백엔드(Render 무료 플랜)가 항상 떠 있지도 않아서, 백엔드 없이 화면을
 * 훑어야 할 때를 위한 탈출구다. 백엔드 연동이 끝나면 이 플래그를 제거한다.
 *
 * 라우팅 가드(RequireAuth)와 진입 시 세션 확인(AuthContext)이 같은 값을 봐야 해서
 * 여기 한 곳에만 둔다.
 */
export const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED !== "false";
