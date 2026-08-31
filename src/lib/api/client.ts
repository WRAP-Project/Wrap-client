import createClient from "openapi-fetch";
import type { paths } from "./schema.gen";

// 인증은 JWT가 아니라 서버 세션 쿠키(JSESSIONID) 방식이다.
// - credentials:"include"가 빠지면 로그인 후 모든 요청이 401이 된다.
// - 백엔드 CORS 허용 origin이 배열이 아니라 단일 값이라, 프론트 주소가 스킴·포트까지
//   정확히 일치해야 한다. 로컬은 http://localhost:5173 고정 (vite.config.ts에서 강제).
// - 배포 환경의 세션 쿠키는 Secure; SameSite=None이라 프론트도 HTTPS여야 한다.
export const apiClient = createClient<paths>({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? "https://wrap-backend-ko54.onrender.com",
  credentials: "include",
});

// ── 401 인터셉터 ──────────────────────────────────────────────────────────────
// 세션은 30분 뒤 만료되고, 그 다음 요청부터 401 UNAUTHORIZED가 온다. 화면마다
// 이걸 처리하지 않도록 여기서 한 번에 가로채고, 실제 동작(세션 비우기 + 로그인 화면
// 이동)은 AuthContext가 등록한다.

let unauthorizedHandler: (() => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

/** 401을 "세션 만료"가 아니라 폼 에러로 다뤄야 하는 엔드포인트들.
 *  로그인 실패(LOGIN_FAILED)와 비로그인 상태의 로그아웃이 여기 해당한다. */
const SELF_HANDLED_401 = ["/members/login", "/members/signup", "/members/logout"];

apiClient.use({
  onResponse({ request, response }) {
    if (response.status !== 401) return undefined;
    const { pathname } = new URL(request.url);
    if (SELF_HANDLED_401.some((path) => pathname.endsWith(path))) return undefined;
    unauthorizedHandler?.();
    return undefined;
  },
});
