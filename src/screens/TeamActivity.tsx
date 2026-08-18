import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useTeamActivity } from "@/data/useTeamActivity";

export default function TeamActivity() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data } = useTeamActivity(projectId);
  const { header, filters, members } = data;
  const [activeFilter, setActiveFilter] = useState(filters[0]);

  const visibleMembers =
    activeFilter === "전체" ? members : members.filter((m) => m.role === activeFilter);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1C1C1E", color: "#F0F0EC" }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 [scrollbar-width:none] flex flex-col gap-5">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">팀 활동</h1>

        {/* 헤더 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#7B46F8" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-[32px] font-black leading-none" style={{ color: "#fff" }}>
                {header.activeCount}
              </span>
              <span className="text-[16px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                / {header.totalCount}
              </span>
            </div>
            <span
              className="text-[11px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
            >
              업데이트 {header.updatePercent}%
            </span>
          </div>
          <p className="text-[14px] font-semibold" style={{ color: "#fff" }}>{header.summary}</p>
          <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
            진행 중 {header.inProgressCount} · 완료 {header.doneCount} · 확인 필요 {header.needsCheckCount}
          </p>
        </div>

        {/* 필터 탭 */}
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className="shrink-0 px-3.5 py-2 rounded-full text-[12px] font-bold transition-colors"
              style={{
                background: activeFilter === f ? "#F0F0EC" : "rgba(240,240,236,0.08)",
                color: activeFilter === f ? "#1C1C1E" : "rgba(240,240,236,0.5)",
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 팀원별 오늘 상태 */}
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
            팀원별 오늘 상태
          </p>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
            {visibleMembers.map((m, i) => (
              <div
                key={m.initials}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < visibleMembers.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-black shrink-0"
                  style={{ background: m.avatarBg, color: "#fff" }}
                >
                  {m.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold" style={{ color: "#1C1C1E" }}>{m.name}</span>
                    <span className="text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.4)" }}>· {m.role}</span>
                  </div>
                  <p className="text-[12px] font-medium truncate" style={{ color: "rgba(28,28,30,0.5)" }}>
                    {m.statusText}
                  </p>
                </div>
                {m.blocked ? (
                  <span
                    className="text-[10px] font-black px-2 py-1 rounded-md shrink-0"
                    style={{ background: "#EB3E88", color: "#fff" }}
                  >
                    BLOCK
                  </span>
                ) : (
                  <span className="text-[11px] font-medium shrink-0" style={{ color: "rgba(28,28,30,0.35)" }}>
                    {m.timeAgo}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
