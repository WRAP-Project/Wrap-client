import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/data/useAuth";

/**
 * 첫 화면을 로그인 여부로 가르는 곳.
 *
 * 기본은 켜짐 — 로그인하지 않았으면 어떤 화면도 보이지 않고 /login으로 간다.
 * VITE_AUTH_REQUIRED="false"일 때만 통째로 꺼진다. 화면 대부분이 아직 mock으로
 * 동작하고 백엔드(Render 무료 플랜)가 항상 떠 있지도 않아서, 백엔드 없이 화면을
 * 훑어야 할 때를 위한 탈출구다. 백엔드 연동이 끝나면 이 플래그를 제거한다.
 */
const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED !== "false";

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
