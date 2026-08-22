import { useCallback, useMemo, useState } from "react";

/**
 * 프로젝트 초대 데이터.
 *
 * 백엔드에 초대 관련 엔드포인트가 아직 없다(api/openapi.yaml에 없음).
 * 그래서 지금은 전부 하드코딩이며, 초대 링크도 projectId에서 결정적으로
 * 만들어낸다. 백엔드가 준비되면 이 파일 내부만 교체 —
 * 화면(screens/ProjectCreated, screens/InviteTeam)은 건드릴 필요 없음.
 *
 *   지금:  inviteLink → projectId 기반 mock 토큰
 *   나중:  inviteLink → POST /projects/{projectId}/invite-link 응답
 */

// ── 타입 ──────────────────────────────────────────────────────────────────────

/** 아직 수락하지 않은, "초대 예정" 상태의 팀원. */
export interface Invitee {
  id: string;
  name: string;
  /** 아바타에 표시할 1~2자 이니셜 */
  initials: string;
  /** PM / 디자인 / 개발 등 */
  role: string;
  /** 아바타 배경색 */
  avatarBg: string;
}

export interface ProjectInvite {
  /** 공유용 초대 링크 */
  link: string;
  /** 링크 활성 여부 */
  active: boolean;
  /** 참여 권한 표시 문구 */
  permission: string;
  /** 링크 유효기간 표시 문구 */
  expiry: string;
  invitees: Invitee[];
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────

const MOCK_INVITEES: Invitee[] = [
  { id: "i1", name: "김민지", initials: "KM", role: "PM",     avatarBg: "#7B46F8" },
  { id: "i2", name: "이주현", initials: "LJ", role: "디자인", avatarBg: "#5B39C4" },
  { id: "i3", name: "박지훈", initials: "PJ", role: "개발",   avatarBg: "#3A3A3C" },
];

/** projectId → 사람이 읽을 수 있는 4자리 초대 코드 (mock). */
function inviteCode(projectId: string): string {
  let hash = 0;
  for (const ch of projectId) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += ALPHABET[hash % ALPHABET.length];
    hash = Math.floor(hash / ALPHABET.length) + 7;
  }
  return code;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProjectInvite(projectId: string | undefined) {
  const [copied, setCopied] = useState(false);

  const invite: ProjectInvite = useMemo(
    () => ({
      link: `wrap.team/join/${inviteCode(projectId ?? "")}`,
      active: true,
      permission: "편집 가능",
      expiry: "제한 없음",
      invitees: MOCK_INVITEES,
    }),
    [projectId],
  );

  /** 초대 링크를 클립보드에 복사한다. 복사 성공 시 copied가 잠시 true가 된다. */
  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(`https://${invite.link}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // 클립보드 권한이 없는 환경(비 HTTPS 등) — 조용히 무시한다.
    }
  }, [invite.link]);

  return { invite, copyLink, copied, loading: false, error: null as Error | null };
}
