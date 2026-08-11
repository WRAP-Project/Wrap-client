// Chat.tsx, ChatRoom.tsx 전용 색상 팔레트 — Meeting Chat Wireframe2 디자인.
// chatShared.tsx(MyPage/EditProfile과 공유)와 의도적으로 분리한다: 이 리디자인은
// 채팅 화면만 더 어두운 톤·다른 퍼플로 바뀌었고, 다른 화면 배경은 바꾸지 않기로 했다.

export const C = {
  bg: "#0d0e11",
  surface: "#16171c",
  surfaceHigh: "#1f2028",
  // 어두운 배경 위 텍스트 — 흰색 계열 opacity 단계
  fg: "#f0f0ec",
  fg70: "rgba(240,240,236,0.70)",
  fg50: "rgba(240,240,236,0.50)",
  fg35: "rgba(240,240,236,0.35)",
  fg20: "rgba(240,240,236,0.20)",
  // 밝은(컬러) 배경 위 텍스트 — 검정 계열 opacity 단계
  ink: "#0d0e11",
  ink70: "rgba(13,14,17,0.70)",
  ink45: "rgba(13,14,17,0.45)",
  // 색상
  lime: "#cff665",
  yellow: "#ffd447",
  purple: "#8b6ed4",
  pink: "#f5b2e5",
  blue: "#55b0f5",
  red: "#eb3e88",
} as const;

export const muted = C.fg50;
export const dim = C.fg20;

export function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function Btn({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-xl text-[#f0f0ec] transition-opacity active:opacity-60 ${className}`}
      style={{ background: "rgba(22,23,28,0.7)" }}
    >
      {children}
    </button>
  );
}
