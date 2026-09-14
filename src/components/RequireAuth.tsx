import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/data/useAuth";
import { AUTH_REQUIRED } from "@/lib/authRequired";

// 첫 화면을 로그인 여부로 가르는 곳.
// 여기 도달한 시점에는 세션 확인이 이미 끝나 있다 — SessionScope가 확인 중에는
// App 자체를 mount하지 않으므로, isAuthenticated는 "아직 모름"이 아니라 확정된 값이다.

/** 로그인 화면으로 튕겨낼 때 원래 가려던 곳을 담아 두는 라우터 state. */
interface FromState {
  from?: string;
}

/** 로그인해야만 볼 수 있는 화면. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!AUTH_REQUIRED || isAuthenticated) return <>{children}</>;
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}

/**
 * 이미 로그인한 사람에게는 의미가 없는 화면(로그인·회원가입).
 * RequireAuth가 담아 둔 from이 있으면 그리로, 없으면 홈으로 돌려보낸다.
 */
export function RedirectIfAuthenticated({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!AUTH_REQUIRED || !isAuthenticated) return <>{children}</>;
  return <Navigate to={(location.state as FromState | null)?.from ?? "/"} replace />;
}
