import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { C } from "@/screens/chatShared";

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
  /** 사용자 지정 액센트 색 — 마이페이지·프로필 편집 UI 전반에 반영된다. */
  accentColor: string;
}

export interface ProfileDraft {
  name: string;
  email: string;
  team: string;
  role: string;
  bio: string;
  accentColor: string;
}

/** 프로필 편집 화면의 "색상" 팔레트 — 사용자가 이 중 하나를 지정색으로 고른다. */
export const ACCENT_PALETTE = [C.lime, C.purple, C.blue, C.red, C.yellow] as const;

// ── Mock 데이터 ───────────────────────────────────────────────────────────────
// 백엔드에 아직 프로필 엔드포인트가 없다(openapi.yaml 기준). 추가되면 이 파일
// 내부만 GET/PATCH /users/me 기반으로 교체하면 된다.

const MOCK_PROFILE: Profile = {
  name: "유나 김",
  email: "yuna@projectloop.io",
  team: "프로젝트 루프",
  role: "UX Designer",
  bio: "UI/UX 디자이너 · 프로젝트 루프 팀에서 디자인 시스템을 담당하고 있습니다.",
  avatarInitial: "유",
  teamMembers: 5,
  tasks: 38,
  accentColor: C.lime,
};

// ── Context ───────────────────────────────────────────────────────────────────
// 프로필(특히 지정색)은 마이페이지·프로필 편집 등 여러 화면이 함께 읽고 쓰므로
// 전역 Context로 공유한다. 소비 화면은 useProfile()만 알면 된다.

interface ProfileContextValue {
  profile: Profile;
  updateProfile: (draft: ProfileDraft) => void;
  loading: boolean;
  error: Error | null;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile>(MOCK_PROFILE);

  const updateProfile = useCallback((draft: ProfileDraft) => {
    setProfile((prev) => ({ ...prev, ...draft, avatarInitial: draft.name.trim().charAt(0) || prev.avatarInitial }));
  }, []);

  const value = useMemo(
    () => ({ profile, updateProfile, loading: false, error: null as Error | null }),
    [profile, updateProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfileContext() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfileContext는 ProfileProvider 안에서만 사용 가능합니다.");
  return ctx;
}
