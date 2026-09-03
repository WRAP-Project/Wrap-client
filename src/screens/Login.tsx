import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { C } from "./chatShared";
import {
  AuthCard,
  AuthErrorBanner,
  AuthField,
  AuthHeading,
  AuthLayout,
  AuthSwitch,
  PasswordField,
  PrimaryButton,
} from "./authShared";
import { useAuth } from "@/data/useAuth";

// 로그인 — POST /members/login. 화면은 useAuth()만 알고, 엔드포인트·세션 처리는
// 전부 AuthContext 안에 있다.

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, pending, error, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // RequireAuth가 막아 세운 경로 — 로그인 후 원래 가려던 곳으로 돌려보낸다.
  // (이미 로그인한 채로 이 화면에 들어온 경우는 RedirectIfAuthenticated가 처리한다.)
  const from = (location.state as { from?: string } | null)?.from ?? "/";

  // 화면을 벗어날 때 이전 실패 메시지를 남기지 않는다.
  useEffect(() => clearError, [clearError]);

  const canSubmit = email.trim() !== "" && password !== "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || pending) return;
    const ok = await login(email.trim(), password);
    if (ok) navigate(from, { replace: true });
  };

  return (
    <AuthLayout>
      <AuthHeading
        title={
          <>
            Wrap<span style={{ color: C.lime }}>.</span>
          </>
        }
        subtitle="흩어진 프로젝트를 하나로."
      />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthCard>
          <AuthField
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error?.fields.email}
          />
          <PasswordField
            label="비밀번호"
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error?.fields.password}
          />
        </AuthCard>

        {error && <AuthErrorBanner message={error.message} />}

        <PrimaryButton disabled={!canSubmit} pending={pending} pendingLabel="로그인 중…">
          로그인
        </PrimaryButton>
      </form>

      <AuthSwitch question="아직 계정이 없으신가요?" action="회원가입" to="/signup" />
    </AuthLayout>
  );
}
