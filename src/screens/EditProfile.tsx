import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { C, rgba, Sheet } from "./chatShared";
import { useProfile, ACCENT_PALETTE } from "@/data/useProfile";

// 프로필 편집 — 색상(사용자 지정 액센트) 선택, 기본 정보, 소개를 편집한다.
// 사진 변경·소개 편집은 시안대로 하단 시트로 띄운다. 저장 전까지는 모두
// 로컬 초안이며, "변경사항 저장"을 눌러야 전역 프로필(ProfileContext)에 반영된다.

function SheetBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-12 w-full rounded-xl text-[14px] font-medium transition-opacity active:opacity-60"
      style={{ background: rgba(C.fg, 0.07), color: C.fg }}
    >
      {label}
    </button>
  );
}

export default function EditProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [team, setTeam] = useState(profile.team);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);
  const [accent, setAccent] = useState(profile.accentColor);

  const [photoSheetOpen, setPhotoSheetOpen] = useState(false);
  const [bioSheetOpen, setBioSheetOpen] = useState(false);
  const [bioDraft, setBioDraft] = useState(bio);

  const fields: [string, string, (v: string) => void][] = [
    ["이름", name, setName],
    ["이메일", email, setEmail],
    ["팀", team, setTeam],
    ["역할", role, setRole],
  ];

  const handleSave = () => {
    updateProfile({ name, email, team, role, bio, accentColor: accent });
    navigate("/mypage");
  };

  return (
    <main className="relative flex size-full flex-col overflow-hidden bg-[#1C1C1E] text-[#f0f0ec]">
      <header
        className="relative flex h-[52px] shrink-0 items-center px-4"
        style={{ borderBottom: `1px solid ${rgba(C.fg, 0.07)}` }}
      >
        <button
          onClick={() => navigate("/mypage")}
          className="flex items-center gap-0.5 transition-opacity active:opacity-60"
          style={{ color: C.fg50 }}
        >
          <ChevronLeft size={18} strokeWidth={2.4} />
          <span className="text-[14px] font-medium">마이 페이지</span>
        </button>
        <h1 className="pointer-events-none absolute inset-x-0 text-center text-[17px] font-black tracking-[-.02em]">
          프로필 편집
        </h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-7 [scrollbar-width:none]">
        {/* 아바타 — 지정색 틴트 배경 + 지정색 이니셜 */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div
            className="grid size-[88px] place-items-center rounded-full"
            style={{ background: rgba(accent, 0.16) }}
          >
            <span className="text-[30px] font-black" style={{ color: accent }}>
              {name.trim().charAt(0) || profile.avatarInitial}
            </span>
          </div>
          <button
            onClick={() => setPhotoSheetOpen(true)}
            className="rounded-full px-4 py-1.5 text-[12px] font-medium transition-opacity active:opacity-60"
            style={{ background: C.surface, color: C.fg50 }}
          >
            사진 변경
          </button>
        </div>

        {/* 색상 + 기본 정보 */}
        <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: C.surface }}>
          <div className="flex h-[56px] items-center gap-3.5 px-4">
            <span className="w-11 shrink-0 text-[12px] font-medium" style={{ color: C.fg50 }}>색상</span>
            <div className="flex items-center gap-3.5">
              {ACCENT_PALETTE.map((color) => (
                <button
                  key={color}
                  aria-label={`액센트 색 ${color}`}
                  onClick={() => setAccent(color)}
                  className="size-7 rounded-full transition-transform active:scale-90"
                  style={{
                    background: color,
                    boxShadow: accent === color ? `0 0 0 2px ${C.surface}, 0 0 0 4px ${color}` : "none",
                  }}
                />
              ))}
            </div>
          </div>
          {fields.map(([label, value, setValue]) => (
            <div key={label}>
              <div className="mx-4 h-px" style={{ background: rgba(C.fg, 0.06) }} />
              <div className="flex h-[56px] items-center gap-3.5 px-4">
                <span className="w-11 shrink-0 text-[12px] font-medium" style={{ color: C.fg50 }}>{label}</span>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 flex-1 bg-transparent text-[14px] outline-none"
                  style={{ color: C.fg }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* 소개 — 탭하면 하단 시트로 편집 */}
        <button
          onClick={() => {
            setBioDraft(bio);
            setBioSheetOpen(true);
          }}
          className="mb-6 w-full rounded-2xl px-4 py-3.5 text-left text-[13px] leading-relaxed transition-opacity active:opacity-60"
          style={{ background: C.surface, color: C.fg70 }}
        >
          {bio || <span style={{ color: C.fg35 }}>소개를 입력하세요</span>}
        </button>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            className="h-[52px] rounded-2xl text-[15px] font-bold transition-opacity active:opacity-70"
            style={{ background: accent, color: C.ink }}
          >
            변경사항 저장
          </button>
          <button
            onClick={() => navigate("/mypage")}
            className="h-[52px] rounded-2xl text-[15px] font-medium transition-opacity active:opacity-70"
            style={{ background: C.surface, color: C.fg50 }}
          >
            취소
          </button>
        </div>
      </div>

      {/* 사진 변경 시트 — 실제 업로드는 백엔드 연동 전이라 선택지만 보여준다 */}
      {photoSheetOpen && (
        <Sheet title="사진 변경" onClose={() => setPhotoSheetOpen(false)}>
          <div className="flex flex-col gap-2.5">
            <SheetBtn label="카메라로 촬영" onClick={() => setPhotoSheetOpen(false)} />
            <SheetBtn label="사진 보관함에서 선택" onClick={() => setPhotoSheetOpen(false)} />
            <SheetBtn label="파일에서 선택" onClick={() => setPhotoSheetOpen(false)} />
            <SheetBtn label="취소" onClick={() => setPhotoSheetOpen(false)} />
          </div>
        </Sheet>
      )}

      {/* 소개 편집 시트 */}
      {bioSheetOpen && (
        <Sheet title="소개 편집" onClose={() => setBioSheetOpen(false)}>
          <textarea
            value={bioDraft}
            onChange={(e) => setBioDraft(e.target.value)}
            rows={5}
            autoFocus
            className="mb-4 w-full resize-none rounded-xl px-4 py-3.5 text-[13px] leading-relaxed outline-none"
            style={{ background: rgba(C.fg, 0.06), color: C.fg }}
          />
          <div className="flex gap-2.5">
            <button
              onClick={() => setBioSheetOpen(false)}
              className="h-12 flex-1 rounded-xl text-[14px] font-medium transition-opacity active:opacity-60"
              style={{ background: rgba(C.fg, 0.07), color: C.fg50 }}
            >
              취소
            </button>
            <button
              onClick={() => {
                setBio(bioDraft);
                setBioSheetOpen(false);
              }}
              className="h-12 flex-1 rounded-xl text-[14px] font-bold transition-opacity active:opacity-60"
              style={{ background: accent, color: C.ink }}
            >
              저장
            </button>
          </div>
        </Sheet>
      )}
    </main>
  );
}
