/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 베이스 URL. 미설정 시 http://localhost:8080. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * 로그인 가드(RequireAuth). 기본값은 켜짐 — 로그인하지 않으면 /login만 보인다.
   * "false"일 때만 꺼지며, 백엔드 없이 mock 화면들을 훑어야 할 때의 탈출구다.
   */
  readonly VITE_AUTH_REQUIRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
