import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { C, rgba } from "./chatShared";
import { useProfile } from "@/data/useProfile";

export default function EditProfile() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useProfile();

  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email);
  const [team, setTeam] = useState(profile.team);
  const [role, setRole] = useState(profile.role);
  const [bio, setBio] = useState(profile.bio);

  const fields: [string, string, (v: string) => void][] = [
    ["이름", name, setName],
    ["이메일", email, setEmail],
    ["팀", team, setTeam],
    ["역할", role, setRole],
  ];

  const handleSave = () => {
    updateProfile({ name, email, team, role, bio });
    navigate("/mypage");
  };

  return (
    <main className="flex size-full flex-col overflow-hidden bg-[#1C1C1E] text-[#f0f0ec]">
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
        <div className="mb-7 flex flex-col items-center gap-3">
          <div className="grid size-20 place-items-center rounded-full" style={{ background: C.red }}>
            <span className="text-[28px] font-black">{profile.avatarInitial}</span>
          </div>
          <button
            className="rounded-full px-4 py-1.5 text-[12px] font-medium transition-opacity active:opacity-60"
            style={{ background: C.surface, color: C.fg50 }}
          >
            사진 변경
          </button>
        </div>

        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.07em]" style={{ color: C.fg35 }}>기본 정보</p>
        <div className="mb-6 overflow-hidden rounded-2xl" style={{ background: C.surface }}>
          {fields.map(([label, value, setValue], i) => (
            <div key={label}>
              {i > 0 && <div className="h-px" style={{ background: rgba(C.fg, 0.07) }} />}
              <div className="flex h-[52px] items-center gap-3.5 px-4">
                <span className="w-11 shrink-0 text-[12px] font-medium" style={{ color: C.fg50 }}>{label}</span>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-8 flex-1 rounded-lg px-3 text-[13px] outline-none"
                  style={{ background: C.bg, color: C.fg }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[.07em]" style={{ color: C.fg35 }}>소개</p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={3}
          className="mb-6 w-full resize-none rounded-2xl px-4 py-3.5 text-[13px] leading-relaxed outline-none"
          style={{ background: C.surface, color: C.fg }}
        />

        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleSave}
            className="h-12 rounded-2xl text-[15px] font-bold transition-opacity active:opacity-70"
            style={{ background: C.red, color: "#fff" }}
          >
            변경사항 저장
          </button>
          <button
            onClick={() => navigate("/mypage")}
            className="h-12 rounded-2xl text-[15px] font-medium transition-opacity active:opacity-70"
            style={{ background: C.surface, color: C.fg50 }}
          >
            취소
          </button>
        </div>
      </div>
    </main>
  );
}
