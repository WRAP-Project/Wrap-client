import { useCallback, useState } from "react";

// ── 타입 ──────────────────────────────────────────────────────────────────────

export interface Profile {
  name: string;
  email: string;
  team: string;
  role: string;
  bio: string;
  avatarInitial: string;
  teamMembers: number;
  tasks: number;
}

export interface ProfileDraft {
  name: string;
  email: string;
  team: string;
  role: string;
  bio: string;
}

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드에 아직 프로필 엔드포인트가 없다(openapi.yaml 기준). 추가되면 이 파일
// 내부만 GET/PATCH /users/me 기반으로 교체하면 된다.

const MOCK_PROFILE: Profile = {
  name: "유나 김",
  email: "yuna@projectloop.io",
  team: "프로젝트 루프",
  role: "디자이너",
  bio: "UI/UX 디자이너 · 프로젝트 루프 팀에서 디자인 시스템을 담당하고 있습니다.",
  avatarInitial: "유",
  teamMembers: 5,
  tasks: 38,
};

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(MOCK_PROFILE);

  const updateProfile = useCallback((draft: ProfileDraft) => {
    setProfile((prev) => ({ ...prev, ...draft }));
  }, []);

  return { profile, updateProfile, loading: false, error: null as Error | null };
}
