import { Children, useState, type InputHTMLAttributes, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { C, rgba } from "./chatShared";

// Login.tsx와 Signup.tsx가 함께 쓰는 폼 조각들.
// 색 토큰(C)과 입력 카드 형태는 EditProfile/MyPage와 같은 것을 그대로 쓴다 —
// 인증 화면만 다른 규칙을 갖지 않도록, 새 스타일을 만들지 않았다.

/** 라벨 열 너비 + 좌측 패딩 + 간격 = 필드 에러 텍스트를 입력값에 맞춰 들여쓸 값. */
const LABEL_W = 56;
const ERROR_INDENT = 16 + LABEL_W + 14;

// ─── 레이아웃 ─────────────────────────────────────────────────────────────────

/** 인증 화면의 바깥 껍데기. onBack이 있으면 뒤로가기 헤더를 단다. */
export function AuthLayout({ onBack, children }: { onBack?: () => void; children: ReactNode }) {
  return (
    <main className="relative flex size-full flex-col overflow-hidden bg-[#1C1C1E] text-[#f0f0ec]">
      {onBack && (
        <header className="flex h-[52px] shrink-0 items-center px-4">
          <button
            onClick={onBack}
            className="flex items-center gap-0.5 transition-opacity active:opacity-60"
            style={{ color: C.fg50 }}
          >
            <ChevronLeft size={18} strokeWidth={2.4} />
            <span className="text-[14px] font-medium">뒤로</span>
          </button>
        </header>
      )}
      <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-8 [scrollbar-width:none]">{children}</div>
    </main>
  );
}

/** 화면 제목 블록 — 큰 타이틀 + 한 줄 설명. */
export function AuthHeading({ title, subtitle }: { title: ReactNode; subtitle: string }) {
  return (
    <div className="px-1 pb-8 pt-10">
      <h1 className="text-[32px] font-black leading-none tracking-[-.04em]">{title}</h1>
      <p className="mt-3 text-[13px]" style={{ color: C.fg50 }}>
        {subtitle}
      </p>
    </div>
  );
}

// ─── 입력 ─────────────────────────────────────────────────────────────────────

/** 자식 필드들을 구분선으로 나눠 담는 카드 — EditProfile의 기본 정보 카드와 같은 형태. */
export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl" style={{ background: C.surface }}>
      {Children.toArray(children).map((child, i) => (
        <div key={i}>
          {i > 0 && <div className="mx-4 h-px" style={{ background: rgba(C.fg, 0.06) }} />}
          {child}
        </div>
      ))}
    </div>
  );
}

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "style"> {
  label: string;
  /** 서버가 준 필드별 사유 — 입력값에 맞춰 아래에 붙는다. */
  error?: string;
  /** 입력칸 오른쪽에 붙는 조각(비밀번호 표시 토글 등). */
  trailing?: ReactNode;
}

export function AuthField({ label, error, trailing, ...inputProps }: AuthFieldProps) {
  return (
    <div>
      <div className="flex h-[56px] items-center gap-3.5 px-4">
        <span className="shrink-0 text-[12px] font-medium" style={{ width: LABEL_W, color: C.fg50 }}>
          {label}
        </span>
        <input
          {...inputProps}
          className="h-8 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[rgba(240,240,236,0.25)]"
          style={{ color: C.fg }}
        />
        {trailing}
      </div>
      {error && (
        <div
          className="-mt-1.5 pb-3 pr-4 text-[11px] leading-snug"
          style={{ paddingLeft: ERROR_INDENT, color: C.red }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

/** 표시/숨김 토글이 붙은 비밀번호 입력. */
export function PasswordField(props: Omit<AuthFieldProps, "type" | "trailing">) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;

  return (
    <AuthField
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <button
          type="button"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 표시"}
          onClick={() => setVisible((v) => !v)}
          className="shrink-0 transition-opacity active:opacity-60"
          style={{ color: C.fg35 }}
        >
          <Icon size={16} strokeWidth={2} />
        </button>
      }
    />
  );
}

// ─── 상태 표시 ────────────────────────────────────────────────────────────────

/** 폼 전체에 대한 실패 메시지 배너. */
export function AuthErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-xl px-3.5 py-3 text-[12px] leading-snug"
      style={{ background: rgba(C.red, 0.12), color: C.red }}
    >
      <AlertCircle size={14} strokeWidth={2.2} className="mt-px shrink-0" />
      <span>{message}</span>
    </div>
  );
}

/** 폼의 주행동 버튼 — 조건을 다 채우기 전에는 눌리지 않는다. */
export function PrimaryButton({
  children,
  pendingLabel,
  disabled,
  pending,
}: {
  children: ReactNode;
  pendingLabel: string;
  disabled?: boolean;
  pending?: boolean;
}) {
  const enabled = !disabled && !pending;
  return (
    <button
      type="submit"
      disabled={!enabled}
      className="h-[52px] w-full rounded-2xl text-[15px] font-bold transition-opacity active:opacity-70 disabled:active:opacity-100"
      style={enabled ? { background: C.lime, color: C.ink } : { background: "#2C2C2E", color: C.fg35 }}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

/** 로그인 ↔ 회원가입을 오가는 하단 링크. */
export function AuthSwitch({ question, action, to }: { question: string; action: string; to: string }) {
  const navigate = useNavigate();
  return (
    <div className="mt-auto flex items-center justify-center gap-1.5 pt-8 text-[13px]">
      <span style={{ color: C.fg50 }}>{question}</span>
      <button
        type="button"
        onClick={() => navigate(to)}
        className="font-bold transition-opacity active:opacity-60"
        style={{ color: C.lime }}
      >
        {action}
      </button>
    </div>
  );
}
