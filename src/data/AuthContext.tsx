import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, setUnauthorizedHandler } from "@/lib/api/client";
import type { components } from "@/lib/api/schema.gen";

// 인증 — 이 프로젝트에서 처음으로 실제 백엔드를 호출하는 계층이다.
// 화면은 useAuth()만 알고, 엔드포인트·응답 봉투·세션 저장은 전부 여기 안에 있다.

export type Member = components["schemas"]["MemberResponse"];

/** 화면이 그대로 렌더링할 수 있게 정규화한 인증 실패. */
export interface AuthError {
  /** 폼 상단 배너에 띄울 메시지. */
  message: string;
  /** 필드별 사유 — 서버가 준 error.details를 입력칸 아래에 붙이기 위한 것. */
  fields: Record<string, string>;
}

// ── 응답 봉투 처리 ────────────────────────────────────────────────────────────
// 백엔드는 모든 응답을 ApiResponse<T> = { success, data, message, error }로 감싸되,
// null인 필드는 아예 빼고 내려준다(@JsonInclude(NON_NULL)). 그래서 필드 존재 여부가
// 아니라 success 불리언으로 분기한다.
//
// 실패 응답(400/401/409)은 openapi.yaml에 아직 문서화돼 있지 않아 생성 타입에도
// 없다. openapi-fetch는 2xx가 아니면 파싱한 본문을 error에 담으므로 그쪽도 함께 본다.

type Envelope = {
  success?: boolean;
  message?: string;
  error?: components["schemas"]["ErrorBody"];
};

type ApiResult = { data?: Envelope; error?: unknown; response: Response };

/**
 * 사용자에게 보여줄 문구는 error.code로 프론트에서 정의한다.
 * 백엔드의 error.message는 영문이라 그대로 노출하지 않는다
 * (필드별 details[].reason은 한글이라 입력칸 아래에 그대로 쓴다).
 */
const MESSAGE_BY_CODE: Record<string, string> = {
  VALIDATION_FAILED: "입력한 내용을 다시 확인해 주세요.",
  EMAIL_ALREADY_EXISTS: "이미 가입된 이메일입니다.",
  LOGIN_FAILED: "이메일 또는 비밀번호가 올바르지 않습니다.",
  UNAUTHORIZED: "로그인이 필요합니다.",
};

function toAuthError(result: ApiResult, fallback: string): AuthError | null {
  const body = (result.data ?? (result.error as Envelope | undefined)) ?? undefined;
  if (result.response.ok && body?.success !== false) return null;

  const fields: Record<string, string> = {};
  for (const detail of body?.error?.details ?? []) {
    if (detail.field && detail.reason) fields[detail.field] = detail.reason;
  }
  const code = body?.error?.code;
  return { message: (code && MESSAGE_BY_CODE[code]) ?? fallback, fields };
}

// fetch에는 기본 타임아웃이 없다. 서버가 연결만 받아놓고 응답을 주지 않으면 promise가
// 영영 끝나지 않아 버튼을 눌러도 아무 일도 일어나지 않는 것처럼 보인다 — 상한을 둔다.
//
// 로그인·회원가입은 넉넉히 잡는다: 배포가 Render 무료 플랜이라 잠들어 있던 서버가
// 깨어나는 첫 요청은 1분 가까이 걸릴 수 있고, 짧게 끊으면 멀쩡한 로그인이 실패한다.
const SUBMIT_TIMEOUT_MS = 60_000;
// 로그아웃은 결과를 화면에 반영할 게 없으므로 짧게 끊고 로컬 세션을 비운다.
const LOGOUT_TIMEOUT_MS = 5_000;

const NETWORK_ERROR: AuthError = {
  message: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
  fields: {},
};

const SESSION_EXPIRED: AuthError = {
  message: "로그인이 만료되었습니다. 다시 로그인해 주세요.",
  fields: {},
};

// ── 세션 캐시 ────────────────────────────────────────────────────────────────
// 새로고침해도 로그인 상태가 남아 보이도록 회원 정보를 sessionStorage에 둔다.
// 어디까지나 임시 수단이다 — 서버 세션이 아직 살아 있는지 확인할 방법(GET /members/me)이
// openapi.yaml에 없어서, 그 엔드포인트가 생기면 이 캐시 대신 mount 시 조회로 바꾼다.

const STORAGE_KEY = "wrap.auth.member";

function readCachedMember(): Member | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Member) : null;
  } catch {
    return null;
  }
}

function writeCachedMember(member: Member | null) {
  try {
    if (member) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(member));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // 프라이빗 모드 등 저장이 막힌 환경 — 이번 세션 동안 메모리 상태만으로 동작한다.
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface AuthContextValue {
  member: Member | null;
  isAuthenticated: boolean;
  /** 로그인·회원가입 요청이 진행 중인지 — 버튼 비활성화용. */
  pending: boolean;
  error: AuthError | null;
  /** 성공하면 true. 실패 사유는 error로 노출된다. */
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, nickname: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(readCachedMember);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    writeCachedMember(member);
  }, [member]);

  // 세션 만료(30분)로 401이 오면 어느 화면에 있든 로그인으로 돌려보낸다.
  // 로그인·회원가입·로그아웃 자신의 401은 client.ts에서 걸러져 여기 오지 않는다.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setMember(null);
      setError(SESSION_EXPIRED);
      navigate("/login", { replace: true });
    });
    return () => setUnauthorizedHandler(null);
  }, [navigate]);

  const login = useCallback(async (email: string, password: string) => {
    setPending(true);
    setError(null);
    try {
      const result = await apiClient.POST("/members/login", {
        body: { email, password },
        signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
      });
      const failure = toAuthError(result, "이메일 또는 비밀번호가 올바르지 않습니다.");
      if (failure) {
        setError(failure);
        return false;
      }
      setMember(result.data?.data ?? null);
      return true;
    } catch {
      setError(NETWORK_ERROR);
      return false;
    } finally {
      setPending(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, nickname: string) => {
      setPending(true);
      setError(null);
      try {
        const result = await apiClient.POST("/members/signup", {
          body: { email, password, nickname },
          signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
        });
        const failure = toAuthError(result, "회원가입에 실패했습니다. 입력한 내용을 확인해 주세요.");
        if (failure) {
          setError(failure);
          return false;
        }
      } catch {
        setError(NETWORK_ERROR);
        return false;
      } finally {
        setPending(false);
      }
      // 가입 응답이 세션을 발급하는지 스펙에 명시돼 있지 않아, 곧바로 로그인을 한 번 더
      // 호출해 세션을 확실히 만든다. 백엔드가 가입 시 세션을 준다면 이 줄만 빼면 된다.
      return login(email, password);
    },
    [login],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.POST("/members/logout", { signal: AbortSignal.timeout(LOGOUT_TIMEOUT_MS) });
    } catch {
      // 서버에 못 닿거나 5초 안에 응답이 없어도 로컬 세션은 비운다 —
      // 로그아웃이 서버 상태 때문에 막히면 안 된다.
    }
    setMember(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo(
    () => ({
      member,
      isAuthenticated: member !== null,
      pending,
      error,
      login,
      signup,
      logout,
      clearError,
    }),
    [member, pending, error, login, signup, logout, clearError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext는 AuthProvider 안에서만 사용 가능합니다.");
  return ctx;
}
