/**
 * 프로젝트 색상 유틸.
 *
 * 프로젝트 배경색은 사용자가 고른 값(project.color)이라 무슨 색이 올지 모른다.
 * 그 위에 글자를 올리는 화면마다 "이 배경이 밝은가"를 따로 판단하면 화면끼리
 * 기준이 어긋나므로 여기 한 곳에서만 정한다.
 *
 * ── 색 규칙 ──────────────────────────────────────────────────────────────────
 * 한 프로젝트에 속한 요소는 그 프로젝트의 색(project.color)만 쓴다. 예외는 둘뿐:
 *
 *   ALERT    긴급·지연·BLOCK. 어느 프로젝트에서도 이 색 하나로 고정한다 —
 *            프로젝트마다 경고색이 달라지면 "빨간불"이 학습되지 않는다.
 *   INACTIVE 활동이 없는 사람·요소. 색이 아니라 "색 없음"을 뜻한다.
 *
 * 그래서 화면에서 임의의 hex를 새로 쓰는 일은 없어야 한다. 프로젝트 색이 필요하면
 * project.color를, 경고가 필요하면 ALERT를 쓴다.
 */

/** #RRGGBB → [r,g,b] (0~255). 형식이 아니면 null. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return [r, g, b];
}

/** WCAG 상대 휘도 (0~1). */
function luminance([r, g, b]: [number, number, number]): number {
  const [lr, lg, lb] = [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * 배경이 밝아서 어두운 글자를 올려야 하는 색인지.
 * WCAG 상대 휘도 기준이고, 경계값 0.45는 기존 화면들이 쓰던 구분(연두·분홍은
 * 밝음, 보라는 어두움)과 같은 결과가 나오도록 맞춘 값이다.
 * 알 수 없는 형식이면 false — 어두운 배경으로 보고 흰 글자를 쓴다.
 */
export function isBrightColor(hex: string): boolean {
  const rgb = parseHex(hex);
  if (!rgb) return false;
  return luminance(rgb) > 0.45;
}

/** 같은 색을 투명도만 입혀서 쓴다 — 뱃지 배경처럼 옅게 깔 때. */
export function tint(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

/** 긴급·지연·BLOCK 전용. 프로젝트 색과 무관하게 항상 이 값이다. */
export const ALERT = "#EB3E88";

/** 활동이 없는 상태. 프로젝트 색을 쓰지 않는 유일한 다른 경우. */
export const INACTIVE = "#6B7280";

/**
 * 프로젝트를 못 찾았을 때만 쓰는 대체 강조색(딥링크로 없는 id에 들어온 경우 등).
 * 화면마다 각자 정하면 같은 상황에서 색이 달라지므로 여기 하나만 둔다.
 */
export const FALLBACK_ACCENT = "#A78BFA";

/**
 * 흰 배경 위에서 읽히도록 밝은 색만 어둡게 눌러준다. 색상(hue)은 유지한다 —
 * 라임 프로젝트의 글자는 검정이 아니라 여전히 라임 계열이어야 "이 프로젝트의
 * 색"으로 읽힌다. 0.18은 본문 크기에서 흰 배경 대비 4.5:1이 나오는 지점.
 */
export function onLight(hex: string): string {
  const rgb = parseHex(hex);
  if (!rgb) return "#1C1C1E";
  let c = rgb;
  // floor를 쓰는 건 round면 1이 1로 남아 루프가 끝나지 않기 때문이다.
  while (luminance(c) > 0.18) {
    c = c.map((v) => Math.floor(v * 0.82)) as [number, number, number];
  }
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * 흰 카드 위의 옅은 뱃지 — D-7 뱃지처럼 "강조하되 꽉 채우지는 않는" 자리.
 * 밝은 색은 흰 배경에 옅게 깔면 글자가 아예 보이지 않으므로, 그때만 어두운
 * 배경에 색 글자로 뒤집는다.
 */
export function softBadge(hex: string): { background: string; color: string } {
  return isBrightColor(hex)
    ? { background: "#1C1C1E", color: hex }
    : { background: tint(hex, 0.14), color: hex };
}

/**
 * 팀원 아바타의 상태.
 * active = 정상 진행(프로젝트 색) · delayed = 지연/BLOCK(ALERT) · inactive = 활동 없음.
 */
export type MemberState = "active" | "delayed" | "inactive";

/** 상태만 주면 아바타 배경·글자색이 프로젝트 색 체계 안에서 정해진다. */
export function memberAvatar(
  accent: string,
  state: MemberState,
): { background: string; color: string } {
  const background =
    state === "delayed" ? ALERT : state === "inactive" ? INACTIVE : accent;
  return { background, color: onAccentPalette(background).fg };
}

/** 프로젝트 색상 위에 올릴 글자·구분선·베일 색 한 세트. */
export function onAccentPalette(hex: string) {
  return isBrightColor(hex)
    ? {
        fg: "#1C1C1E",
        dim: "rgba(28,28,30,0.62)",
        faint: "rgba(28,28,30,0.45)",
        veil: "rgba(28,28,30,0.10)",
        line: "rgba(28,28,30,0.14)",
      }
    : {
        fg: "#FFFFFF",
        dim: "rgba(255,255,255,0.60)",
        faint: "rgba(255,255,255,0.65)",
        veil: "rgba(255,255,255,0.18)",
        line: "rgba(255,255,255,0.22)",
      };
}
