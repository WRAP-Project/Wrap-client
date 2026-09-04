import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProjectInvite } from "@/data/useProjectInvite";

/**
 * 팀원 초대 화면.
 * CreateProject → ProjectCreated → (여기) → ProjectDetail 흐름의 마지막 단계다.
 *
 * 초대 링크/초대 예정 팀원은 useProjectInvite 훅 뒤에 있다 —
 * 백엔드 초대 API가 생기면 이 화면은 그대로 두고 훅만 교체한다.
 */

/** 메시지 / 이메일 / 더보기 — 아직 실제 공유 연동은 없고 링크 복사로 대신한다. */
const SHARE_ACTIONS = ["메시지", "이메일", "더보기"] as const;

export default function InviteTeam() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const project = projects.find((p) => p.id === projectId);
  const { invite, copyLink, copied } = useProjectInvite(projectId);

  // 새로고침/딥링크로 없는 프로젝트에 들어온 경우 — 목록으로 되돌린다.
  if (!project) return <Navigate to="/" replace />;

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#1C1C1E", color: "#F0F0EC" }}
    >
      <div className="flex-1 px-5 pt-14 pb-6 flex flex-col gap-5">

        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] text-white">
            팀원을 초대해요
          </h1>
          <p className="text-[0.82rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
            링크 하나로 바로 프로젝트에 참여할 수 있어요
          </p>
        </div>

        {/* ── 초대 링크 카드 ── */}
        <div className="rounded-[22px] p-5 flex flex-col gap-4" style={{ background: "#EFEFEA" }}>
          <div className="flex items-center justify-between">
            <span className="text-[1rem] font-bold" style={{ color: "#1E1F23" }}>
              초대 링크
            </span>
            {invite.active && (
              <span
                className="rounded-full px-2.5 py-1 text-[0.7rem] font-semibold text-white"
                style={{ background: "#EB3E88" }}
              >
                활성
              </span>
            )}
          </div>

          {/* 링크 + 복사 */}
          <div
            className="flex items-center gap-2 rounded-[14px] pl-4 pr-1.5 py-1.5"
            style={{ background: "#E0E0DA" }}
          >
            <span
              className="flex-1 truncate text-[0.85rem]"
              style={{ color: "rgba(30,31,35,0.7)" }}
            >
              {invite.link}
            </span>
            <button
              id="invite-copy-link"
              onClick={copyLink}
              className="shrink-0 rounded-[11px] px-3.5 py-2.5 text-[0.8rem] font-semibold text-white transition-transform active:scale-95"
              style={{ background: "#7B46F8" }}
            >
              {copied ? "복사됨" : "링크 복사"}
            </button>
          </div>

          {/* 권한 / 유효기간 */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[0.78rem]" style={{ color: "rgba(30,31,35,0.6)" }}>
              참여 권한 · {invite.permission}
            </p>
            <p className="text-[0.78rem]" style={{ color: "rgba(30,31,35,0.4)" }}>
              링크 유효기간 · {invite.expiry}
            </p>
          </div>
        </div>

        {/* ── 현재 등록 팀원 ── */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
            현재 등록 팀원
          </span>

          <ul
            className="rounded-[22px] px-4 py-2 flex flex-col"
            style={{ background: "#242426" }}
          >
            {invite.invitees.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3.5">
                <span
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[0.72rem] font-bold text-white"
                  style={{ background: m.avatarBg }}
                >
                  {m.initials}
                </span>
                <span className="flex flex-col">
                  <span className="text-[0.88rem] font-semibold text-white">{m.name}</span>
                  <span className="text-[0.75rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {m.role} · 초대 예정
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* ── 공유 수단 ── */}
        <div className="grid grid-cols-3 gap-2.5">
          {SHARE_ACTIONS.map((label) => (
            <button
              key={label}
              onClick={copyLink}
              className="py-3.5 rounded-[14px] text-[0.83rem] font-medium transition-transform active:scale-95"
              style={{ background: "#2C2C2E", color: "rgba(255,255,255,0.72)" }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CTA ── */}
        <button
          id="invite-goto-project"
          onClick={() => navigate(`/project/${project.id}`, { replace: true })}
          className="w-full py-[17px] rounded-[100px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          style={{ background: "#3A3A3C", color: "rgba(255,255,255,0.92)" }}
        >
          프로젝트로 이동하기
          <ArrowRight size={16} strokeWidth={2.2} />
        </button>
      </div>
    </div>
  );
}
