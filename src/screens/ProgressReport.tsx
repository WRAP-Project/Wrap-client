import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useProgressReport } from "@/data/useProgressReport";

export default function ProgressReport() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data } = useProgressReport(projectId);
  const { percent, doneCount, inProgressCount, needsCheckCount, areas, risks } = data;

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

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">진행 리포트</h1>

        {/* 헤더 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#7B46F8" }}>
          <p className="text-[12px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
            전체 프로젝트 진행률
          </p>
          <p className="text-[48px] font-black leading-none" style={{ color: "#fff" }}>{percent}%</p>
          <div className="relative h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${percent}%`, background: "#fff" }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.6)" }}>
            <span>착수</span>
            <span className="font-black" style={{ color: "#fff" }}>진행 중</span>
            <span>남은 기간 10일</span>
          </div>
        </div>

        {/* 통계 3칸 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: doneCount, label: "완료" },
            { value: inProgressCount, label: "진행 중" },
            { value: needsCheckCount, label: "확인 필요" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl py-3 flex flex-col items-center gap-1" style={{ background: "#fff" }}>
              <span className="text-[20px] font-black" style={{ color: "#1C1C1E" }}>{s.value}</span>
              <span className="text-[10px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* 업무 영역별 진행 */}
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
            업무 영역별 진행
          </p>
          <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: "#fff" }}>
            {areas.map((a) => (
              <div key={a.area} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold" style={{ color: "#1C1C1E" }}>{a.area}</span>
                  <span
                    className="text-[12px] font-black"
                    style={{ color: a.delayed ? "#EB3E88" : "#1C1C1E" }}
                  >
                    {a.percent}% {a.note ? `· ${a.note}` : ""}
                  </span>
                </div>
                <div className="relative h-2 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }}>
                  <div
                    className="absolute left-0 top-0 h-full rounded-full"
                    style={{ width: `${a.percent}%`, background: a.delayed ? "#EB3E88" : "#7B46F8" }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 위험 알림 */}
        {risks.length > 0 && (
          <section className="flex flex-col gap-2">
            {risks.map((r) => (
              <div
                key={r.title}
                className="rounded-2xl p-4 flex items-start gap-3"
                style={{ background: "#fff" }}
              >
                <span
                  className="text-[10px] font-black px-2 py-1 rounded-md shrink-0 flex items-center gap-1"
                  style={{ background: "#EB3E88", color: "#fff" }}
                >
                  <AlertTriangle size={11} strokeWidth={2.5} />
                  위험
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold" style={{ color: "#1C1C1E" }}>{r.title}</p>
                  <p className="text-[11px] font-medium mt-0.5" style={{ color: "rgba(28,28,30,0.45)" }}>{r.detail}</p>
                </div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
