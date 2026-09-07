import { useState, type FormEvent } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Mail } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProjectInvite } from "@/data/useProjectInvite";

/**
 * 팀원 초대 화면.
 * CreateProject → ProjectCreated → (여기) → ProjectDetail 흐름의 마지막 단계다.
 *
 * 백엔드 초대는 링크가 아니라 이메일 기반이라(POST /projects/{id}/invitations),
 * 화면도 링크 공유가 아니라 이메일 입력으로 되어 있다.
 * 팀원 목록과 초대 발송은 useProjectInvite 훅 뒤에 있다.
 */

export default function InviteTeam() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const project = projects.find((p) => p.id === projectId);
  const { invitees, inviteByEmail, inviting, loading, error } = useProjectInvite(projectId);

  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  // 새로고침/딥링크로 없는 프로젝트에 들어온 경우 — 목록으로 되돌린다.
  if (!project) return <Navigate to="/" replace />;

  async function handleInvite(e: FormEvent) {
    e.preventDefault();
    const value = email.trim();
    if (!value || inviting) return;

    setFormError(null);
    setSentTo(null);
    try {
      await inviteByEmail(value);
      setEmail("");
      setSentTo(value);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "초대에 실패했습니다.");
    }
  }

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
            이메일을 입력하면 초대장이 전달돼요
          </p>
        </div>

        {/* ── 이메일 초대 카드 ── */}
        <form
          onSubmit={handleInvite}
          className="rounded-[22px] p-5 flex flex-col gap-4"
          style={{ background: "#EFEFEA" }}
        >
          <div className="flex items-center gap-2">
            <Mail size={17} strokeWidth={2.2} style={{ color: "#1E1F23" }} />
            <span className="text-[1rem] font-bold" style={{ color: "#1E1F23" }}>
              이메일로 초대
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-[14px] pl-4 pr-1.5 py-1.5"
            style={{ background: "#E0E0DA" }}
          >
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent outline-none text-[0.85rem]"
              style={{ color: "#1E1F23" }}
            />
            <button
              id="invite-send"
              type="submit"
              disabled={!email.trim() || inviting}
              className="shrink-0 rounded-[11px] px-3.5 py-2.5 text-[0.8rem] font-semibold text-white transition-transform active:scale-95 disabled:opacity-40"
              style={{ background: "#7B46F8" }}
            >
              {inviting ? "보내는 중" : "초대"}
            </button>
          </div>

          {/* 결과 안내 */}
          {formError && (
            <p className="text-[0.78rem]" style={{ color: "#C62B62" }}>
              {formError}
            </p>
          )}
          {sentTo && !formError && (
            <p className="text-[0.78rem]" style={{ color: "rgba(30,31,35,0.6)" }}>
              {sentTo} 님에게 초대장을 보냈어요
            </p>
          )}

          <p className="text-[0.78rem]" style={{ color: "rgba(30,31,35,0.4)" }}>
            참여 권한 · 팀원
          </p>
        </form>

        {/* ── 현재 등록 팀원 ── */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[0.78rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
            현재 등록 팀원
          </span>

          <ul
            className="rounded-[22px] px-4 py-2 flex flex-col"
            style={{ background: "#242426" }}
          >
            {loading && invitees.length === 0 && (
              <li className="py-5 text-[0.83rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                불러오는 중…
              </li>
            )}

            {!loading && error && (
              <li className="py-5 text-[0.83rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                {error.message}
              </li>
            )}

            {!loading && !error && invitees.length === 0 && (
              <li className="py-5 text-[0.83rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                아직 초대한 팀원이 없어요
              </li>
            )}

            {invitees.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3.5">
                <span
                  className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[0.72rem] font-bold text-white"
                  style={{ background: m.avatarBg }}
                >
                  {m.initials}
                </span>
                <span className="flex flex-col min-w-0">
                  <span className="text-[0.88rem] font-semibold text-white truncate">
                    {m.name}
                    {m.isMe && (
                      <span
                        className="ml-1.5 text-[0.72rem] font-medium"
                        style={{ color: "rgba(255,255,255,0.4)" }}
                      >
                        나
                      </span>
                    )}
                  </span>
                  <span className="text-[0.75rem]" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {m.role} · {m.status === "JOINED" ? "참여 중" : "초대 예정"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
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
