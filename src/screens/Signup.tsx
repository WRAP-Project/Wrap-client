import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
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

// 회원가입 — POST /members/signup 후 곧바로 로그인까지(AuthContext.signup 참고).
// 입력 제약은 openapi.yaml의 SignupRequest를 그대로 옮긴 것이다:
// email(format), password(minLength 8), nickname(maxLength 50).

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NICKNAME_MAX = 50;

export default function Signup() {
  const navigate = useNavigate();
  const { signup, pending, error, clearError } = useAuth();

  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  useEffect(() => clearError, [clearError]);

  // 서버에 보내기 전에 스펙 제약을 먼저 확인시켜 준다 — 통과한 항목은 액센트로 바뀐다.
  const rules = [
    { label: `닉네임 ${NICKNAME_MAX}자 이내`, ok: nickname.trim() !== "" && nickname.trim().length <= NICKNAME_MAX },
    { label: "올바른 이메일 형식", ok: EMAIL_RE.test(email.trim()) },
    { label: "비밀번호 8자 이상", ok: password.length >= 8 },
    { label: "비밀번호 일치", ok: password !== "" && password === confirm },
  ];
  const canSubmit = rules.every((r) => r.ok);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || pending) return;
    const ok = await signup(email.trim(), password, nickname.trim());
    if (ok) navigate("/", { replace: true });
  };

  return (
    <AuthLayout onBack={() => navigate("/login")}>
      <AuthHeading title="회원가입" subtitle="Wrap을 시작할 계정을 만들어요." />

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <AuthCard>
          <AuthField
            label="닉네임"
            autoComplete="nickname"
            placeholder="팀원에게 보일 이름"
            maxLength={NICKNAME_MAX}
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            error={error?.fields.nickname}
          />
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
            autoComplete="new-password"
            placeholder="8자 이상"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={error?.fields.password}
          />
          <PasswordField
            label="확인"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력하세요"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </AuthCard>

        <ul className="flex flex-col gap-1.5 px-1.5 pt-0.5">
          {rules.map((rule) => (
            <li
              key={rule.label}
              className="flex items-center gap-1.5 text-[11px] transition-colors"
              style={{ color: rule.ok ? C.lime : C.fg35 }}
            >
              <Check size={12} strokeWidth={3} className="shrink-0" />
              {rule.label}
            </li>
          ))}
        </ul>

        {error && <AuthErrorBanner message={error.message} />}

        <PrimaryButton disabled={!canSubmit} pending={pending} pendingLabel="가입 중…">
          가입하기
        </PrimaryButton>
      </form>

      <AuthSwitch question="이미 계정이 있으신가요?" action="로그인" to="/login" />
    </AuthLayout>
  );
}
