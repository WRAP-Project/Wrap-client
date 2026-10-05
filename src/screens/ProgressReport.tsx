import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useProgressReport } from "@/data/useProgressReport";
import { useProjectsContext } from "@/data/ProjectsContext";
import { ALERT, FALLBACK_ACCENT, onAccentPalette, onLight } from "@/lib/color";

export default function ProgressReport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const { data, loading } = useProgressReport(projectId);
  const {
    percent,
    doneCount,
    inProgressCount,
    needsCheckCount,
    milestones,
    risks,
    remainingDays,
  } = data;

  // 리포트도 프로젝트에 속한 화면이라 그 프로젝트 색을 쓴다(고정 보라색 아님).
  const accentColor = projects.find((p) => p.id === projectId)?.color ?? FALLBACK_ACCENT;
  const onAccent = onAccentPalette(accentColor);
  // 흰 카드 위의 진행 바는 프로젝트 색을 그대로 쓰면 묻힐 수 있어 눌러서 쓴다.
  const barColor = onLight(accentColor);

  // 마일스톤이 없으면 퍼센트도 통계도 전부 0이다 — 숫자 0을 늘어놓는 대신
  // "아직 집계할 게 없다"는 사실만 말한다.
  const isEmpty = milestones.length === 0;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1C1C1E", color: "#F0F0EC" }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 [scrollbar-width:none] flex flex-col gap-5">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
          aria-label="뒤로가기"
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">진행 리포트</h1>

        {isEmpty ? (
          <p className="pt-10 text-center text-[13px]" style={{ color: "rgba(240,240,236,0.45)" }}>
            {loading
              ? "진행 상황을 불러오는 중이에요"
              : "마일스톤을 추가하면 진행률이 집계됩니다"}
          </p>
        ) : (
          <>
            {/* 헤더 카드 — 퍼센트는 프로젝트 상세의 "전체 진행률"과 같은 값이다 */}
            <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: accentColor }}>
              <p className="text-[12px] font-bold" style={{ color: onAccent.dim }}>
                전체 프로젝트 진행률
              </p>
              <p className="text-[48px] font-black leading-none" style={{ color: onAccent.fg }}>
                {percent}%
              </p>
              <div className="relative h-2 rounded-full" style={{ background: onAccent.veil }}>
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{ width: `${percent}%`, background: onAccent.fg }}
                />
              </div>
              <div
                className="flex justify-between text-[11px] font-semibold"
                style={{ color: onAccent.dim }}
              >
                <span>착수</span>
                <span className="font-black" style={{ color: onAccent.fg }}>
                  마일스톤 {doneCount}/{milestones.length}
                </span>
                {/* 마지막 목표일까지 — 이미 지났으면 남은 기간이 아니라 초과다 */}
                <span>
                  {remainingDays === null
                    ? ""
                    : remainingDays >= 0
                      ? `남은 기간 ${remainingDays}일`
                      : `목표일 ${-remainingDays}일 초과`}
                </span>
              </div>
            </div>

            {/* 통계 3칸 — 마일스톤 달성 상태 기준 */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: doneCount, label: "달성" },
                { value: inProgressCount, label: "진행 중" },
                { value: needsCheckCount, label: "확인 필요" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl py-3 flex flex-col items-center gap-1"
                  style={{ background: "#fff" }}
                >
                  <span className="text-[20px] font-black" style={{ color: "#1C1C1E" }}>
                    {s.value}
                  </span>
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: "rgba(28,28,30,0.45)" }}
                  >
                    {s.label}
                  </span>
                </div>
              ))}
            </div>

            {/* 마일스톤별 진행 — 퍼센트는 그 마일스톤에 연결된 태스크 완료율이다 */}
            <section className="flex flex-col gap-2">
              <p
                className="text-[11px] font-semibold tracking-[0.06em] uppercase"
                style={{ color: "rgba(240,240,236,0.45)" }}
              >
                마일스톤별 진행
              </p>
              <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#fff" }}>
                {milestones.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/project/${projectId}/milestone/${m.id}`)}
                    className="flex flex-col gap-1.5 text-left transition-opacity active:opacity-60"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="text-[13px] font-bold truncate"
                        style={{ color: "#1C1C1E" }}
                      >
                        {m.title}
                      </span>
                      <span
                        className="text-[12px] font-black shrink-0"
                        style={{ color: m.delayed ? ALERT : "#1C1C1E" }}
                      >
                        {m.percent}%{m.note ? ` · ${m.note}` : ""}
                      </span>
                    </div>
                    <div
                      className="relative h-2 rounded-full"
                      style={{ background: "rgba(0,0,0,0.08)" }}
                    >
                      <div
                        className="absolute left-0 top-0 h-full rounded-full"
                        style={{
                          width: `${m.percent}%`,
                          background: m.delayed ? ALERT : barColor,
                        }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* 위험 알림 — 목표일이 지난/임박한 마일스톤에서 파생 */}
            {risks.length > 0 && (
              <section className="flex flex-col gap-2">
                {risks.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl p-4 flex items-start gap-3"
                    style={{ background: "#fff" }}
                  >
                    <span
                      className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 flex items-center gap-1"
                      style={{ background: ALERT, color: "#fff" }}
                    >
                      <AlertTriangle size={11} strokeWidth={2.5} />
                      위험
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold" style={{ color: "#1C1C1E" }}>
                        {r.title}
                      </p>
                      <p
                        className="text-[11px] font-medium mt-0.5"
                        style={{ color: "rgba(28,28,30,0.45)" }}
                      >
                        {r.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
