/**
 * 프로젝트 색상 유틸.
 *
 * 프로젝트 배경색은 사용자가 고른 값(project.color)이라 무슨 색이 올지 모른다.
 * 그 위에 글자를 올리는 화면마다 "이 배경이 밝은가"를 따로 판단하면 화면끼리
 * 기준이 어긋나므로 여기 한 곳에서만 정한다.
 */

/** #RRGGBB → [r,g,b] (0~255). 형식이 아니면 null. */
function parseHex(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16));
  return [r, g, b];
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
  const [r, g, b] = rgb
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
}

/** 같은 색을 투명도만 입혀서 쓴다 — 뱃지 배경처럼 옅게 깔 때. */
export function tint(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0,0,0,${alpha})`;
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
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
