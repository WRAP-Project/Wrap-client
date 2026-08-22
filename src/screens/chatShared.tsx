// Chat.tsx, ChatRoom.tsx, MyPage.tsx, EditProfile.tsx가 함께 쓰는 색상 상수·헬퍼·UI 조각.
// 모두 같은 디자이너 파일 계열(Figma Make 출력)에서 나뉜 것이라 색 토큰이 동일해 공유가 자연스럽다.
// mock 데이터는 여기 두지 않는다 — src/data/의 훅을 통해서만 접근한다.

export const C = {
  bg: "#1C1C1E",
  surface: "#27282d",
  surfaceHigh: "#32333a",
  // 어두운 배경 위 텍스트 — 흰색 계열 opacity 단계
  fg:    "#f0f0ec",
  fg70:  "rgba(240,240,236,0.70)",
  fg50:  "rgba(240,240,236,0.50)",
  fg35:  "rgba(240,240,236,0.35)",
  fg20:  "rgba(240,240,236,0.20)",
  // 밝은(컬러) 배경 위 텍스트 — 검정 계열 opacity 단계
  ink:   "#1e1f23",
  ink70: "rgba(30,31,35,0.70)",
  ink45: "rgba(30,31,35,0.45)",
  // 색상
  lime: "#cff665",
  yellow: "#ffd447",
  purple: "#7b46f8",
  pink: "#f5b2e5",
  blue: "#55b0f5",
  red: "#eb3e88",
} as const;

export const muted = C.fg50;
export const dim   = C.fg20;

export function rgba(hex: string, a: number) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

export function Btn({ children, onClick, className = "" }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={`grid size-10 shrink-0 place-items-center rounded-xl bg-[#27282d] text-[#f0f0ec] transition-opacity active:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}
