/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 백엔드 API 베이스 URL. 미설정 시 http://localhost:8080. */
  readonly VITE_API_BASE_URL?: string;
  /**
   * "true"일 때만 로그인 가드(RequireAuth)가 켜진다. 기본값은 꺼짐 —
   * 화면 대부분이 아직 mock으로 동작하므로, 백엔드가 안 떠 있는 상태에서
   * 로그인 화면에 갇히지 않도록 기본은 개발 편의 쪽에 맞춰 둔다.
   */
  readonly VITE_AUTH_REQUIRED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
