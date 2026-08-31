import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/data/useAuth";

/**
 * 로그인하지 않았으면 /login으로 보낸다.
 *
 * VITE_AUTH_REQUIRED가 "true"일 때만 켜진다 — 기본은 꺼짐. 화면 대부분이 아직
 * mock으로 동작하고 백엔드가 항상 떠 있지도 않아서, 기본값을 켜두면 로그인
 * 화면에서 빠져나올 수 없게 된다. 백엔드가 붙으면 env만 켜면 된다.
 */
const AUTH_REQUIRED = import.meta.env.VITE_AUTH_REQUIRED === "true";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!AUTH_REQUIRED || isAuthenticated) return <>{children}</>;
  return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
}
