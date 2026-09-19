import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MailOpen } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useReceivedInvitations } from "@/data/useReceivedInvitations";

/**
 * 알람 화면.
 * 홈(ProjectSelect) 헤더의 알림 벨에서 들어온다. 지금 쌓이는 알람은 초대뿐이라
 * 카드마다 "초대" 라벨을 달아 두고, 종류가 늘어나면 그 자리에 붙인다.
 *
 * InviteTeam이 "보내는 쪽"이라면 여기가 "받는 쪽"이다 — A가 이메일로 보낸 초대를
 * B가 여기서 수락하거나 거절한다. 데이터·요청은 useReceivedInvitations 훅 뒤에 있다.
 *
 * 수락하면 그 프로젝트의 멤버가 되므로 프로젝트 목록도 다시 불러온다 —
 * 그러지 않으면 홈으로 돌아가도 새 프로젝트가 보이지 않는다.
 */

const CARD = "#242426";
const FG_DIM = "rgba(255,255,255,0.4)";

export default function Invitations() {
  const navigate = useNavigate();
  const { invitations, accept, reject, answeringId, loading, error } = useReceivedInvitations();
  const { reload: reloadProjects } = useProjectsContext();

  const [actionError, setActionError] = useState<string | null>(null);
  const [joinedName, setJoinedName] = useState<string | null>(null);

  async function handleAccept(invitationId: number, projectName: string) {
    if (answeringId !== null) return;
    setActionError(null);
    setJoinedName(null);
    try {
      await accept(invitationId);
      await reloadProjects();
      setJoinedName(projectName);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "초대를 수락하지 못했습니다.");
    }
  }

  async function handleReject(invitationId: number) {
    if (answeringId !== null) return;
    setActionError(null);
    setJoinedName(null);
    try {
      await reject(invitationId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "초대를 거절하지 못했습니다.");
    }
  }

  return (
    <div className="min-h-full flex flex-col" style={{ background: "#1C1C1E", color: "#F0F0EC" }}>
      <div className="flex-1 px-5 pt-6 pb-8 flex flex-col gap-5">

        {/* 뒤로가기 */}
        <button
          onClick={() => navigate(-1)}
          aria-label="뒤로"
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>

        {/* 제목 */}
        <div className="flex flex-col gap-2">
          <h1 className="text-[26px] font-black leading-tight tracking-[-0.03em] text-white">
            알람
          </h1>
          <p className="text-[0.82rem]" style={{ color: "rgba(255,255,255,0.45)" }}>
            {loading && invitations.length === 0
              ? "불러오는 중…"
              : `읽지 않은 알람 ${invitations.length}개`}
          </p>
        </div>

        {/* 결과 안내 — 수락/거절 실패 사유와 참여 완료 알림 */}
        {actionError && (
          <p className="text-[0.78rem]" style={{ color: "#C62B62" }}>
            {actionError}
          </p>
        )}
        {joinedName && !actionError && (
          <p className="text-[0.78rem]" style={{ color: "#CDEA6F" }}>
            {joinedName} 프로젝트에 참여했어요
          </p>
        )}

        {/* 목록을 못 불러온 경우 */}
        {!loading && error && (
          <div className="rounded-[22px] px-5 py-6 text-[0.83rem]" style={{ background: CARD, color: FG_DIM }}>
            {error.message}
          </div>
        )}

        {/* 빈 상태 */}
        {!loading && !error && invitations.length === 0 && (
          <div
            className="rounded-[22px] px-5 py-10 flex flex-col items-center gap-3 text-center"
            style={{ background: CARD }}
          >
            <MailOpen size={26} strokeWidth={1.6} color="rgba(255,255,255,0.3)" />
            <p className="text-[0.85rem] font-semibold text-white">새 알람이 없어요</p>
            <p className="text-[0.78rem] leading-relaxed" style={{ color: FG_DIM }}>
              팀원이 가입한 이메일로 초대를 보내면
              <br />
              여기에 표시돼요
            </p>
          </div>
        )}

        {/* 초대 카드 */}
        <ul className="flex flex-col gap-3">
          {invitations.map((inv) => {
            const busy = answeringId === inv.invitationId;
            return (
              <li
                key={inv.id}
                className="rounded-[22px] p-5 flex flex-col gap-4"
                style={{ background: CARD }}
              >
                {/* 알람 종류 — 지금은 초대뿐이지만, 종류가 늘어나도 카드 상단
                    같은 자리에 라벨이 오도록 타이틀 줄을 따로 둔다. */}
                <div
                  className="flex items-center justify-between pb-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <span className="text-[0.72rem] font-bold tracking-[-0.01em]" style={{ color: "#CDEA6F" }}>
                    초대
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[0.75rem] font-bold text-white"
                    style={{ background: inv.avatarBg }}
                  >
                    {inv.initials}
                  </span>
                  <span className="flex flex-col min-w-0">
                    <span className="text-[0.95rem] font-bold text-white truncate">
                      {inv.projectName}
                    </span>
                    <span className="text-[0.75rem] truncate" style={{ color: FG_DIM }}>
                      {inv.inviterNickname} 님의 초대 · {inv.role}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id={`invitation-reject-${inv.invitationId}`}
                    onClick={() => void handleReject(inv.invitationId)}
                    disabled={answeringId !== null}
                    className="flex-1 py-3 rounded-[100px] text-[0.85rem] font-semibold transition-transform active:scale-[0.98] disabled:opacity-40"
                    style={{ background: "rgba(240,240,236,0.08)", color: "rgba(255,255,255,0.75)" }}
                  >
                    거절
                  </button>
                  <button
                    id={`invitation-accept-${inv.invitationId}`}
                    onClick={() => void handleAccept(inv.invitationId, inv.projectName)}
                    disabled={answeringId !== null}
                    className="flex-1 py-3 rounded-[100px] text-[0.85rem] font-semibold text-white transition-transform active:scale-[0.98] disabled:opacity-40"
                    style={{ background: "#7B46F8" }}
                  >
                    {busy ? "처리 중" : "수락"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
