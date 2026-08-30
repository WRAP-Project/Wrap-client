import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { daysLeft } from "@/data/useSchedules";
import { useAdjustRequests, type AdjustRequest } from "@/data/AdjustRequestsContext";

// 일정 조정 요청 목록 — 캘린더 헤더의 캘린더 아이콘에서 들어온다.
// 진행 중 요청(라임)을 누르면 가능 시간 등록/확인으로, 하단 버튼으로 새 요청을 만든다.

const INK = "#1C1C1E";
const FG = "#F0F0EC";
const FG35 = "rgba(240,240,236,0.35)";
const SURFACE_HIGH = "rgba(240,240,236,0.12)";
const LIME = "#CFF665";
const PINK = "#EB3E88";

function rangeLabel(req: AdjustRequest): string {
  return `${req.startDate.replace(/-/g, ".")} ~ ${req.endDate.replace(/-/g, ".")}`;
}

function submittedCount(req: AdjustRequest): number {
  return Object.keys(req.submissions).length;
}

export default function AdjustSchedule() {
  const navigate = useNavigate();
  const { requests } = useAdjustRequests();

  return (
    <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      <header
        className="flex shrink-0 items-center px-4 py-4"
        style={{ borderBottom: `1px solid ${SURFACE_HIGH}` }}
      >
        <button onClick={() => navigate("/calendar")} className="grid size-9 place-items-center active:opacity-50" aria-label="뒤로">
          <ChevronLeft size={22} color={FG} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold">일정 조정하기</h1>
        <span className="size-9" />
      </header>

      <div className="flex flex-1 flex-col gap-4 px-5 pb-6 pt-6">
        {requests.length === 0 && (
          <p className="rounded-2xl px-4 py-10 text-center text-[12px]" style={{ background: SURFACE_HIGH, color: FG35 }}>
            진행 중인 일정 조정이 없어요
          </p>
        )}
        {requests.map((req) => {
          const active = req.status === "active";
          const left = daysLeft(req.endDate);
          const dLabel = active
            ? (left === 0 ? "D-day" : left > 0 ? `D-${left}` : `D+${-left}`)
            : "마감";
          return (
            <button
              key={req.id}
              onClick={() => active && navigate(`/calendar/adjust/${req.id}`)}
              disabled={!active}
              className="rounded-r-[28px] rounded-l-[10px] px-5 py-5 text-left transition-opacity active:opacity-80"
              style={{ background: active ? LIME : "rgba(240,240,236,0.28)" }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-black" style={{ color: active ? INK : "rgba(28,28,30,0.75)" }}>
                    {dLabel}
                  </p>
                  <p className="mt-2 truncate text-[15px] font-bold" style={{ color: active ? INK : "rgba(28,28,30,0.75)" }}>
                    {req.title}
                  </p>
                  <p className="mt-1 text-[12px]" style={{ color: "rgba(28,28,30,0.5)" }}>
                    {rangeLabel(req)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
                  <span className="text-[13px] font-bold" style={{ color: active ? "rgba(28,28,30,0.6)" : "rgba(28,28,30,0.75)" }}>
                    {submittedCount(req)}/{req.memberIds.length}
                  </span>
                  {active ? (
                    <span className="text-[12px] font-black" style={{ color: PINK }}>등록 현황</span>
                  ) : (
                    <span className="text-[15px] font-black" style={{ color: "rgba(28,28,30,0.75)" }}>{req.closedOn}</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="sticky bottom-0 shrink-0 px-5 pb-8 pt-3" style={{ background: INK }}>
        <button
          onClick={() => navigate("/calendar/adjust/new")}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: "#fff", color: INK }}
        >
          일정 조정하기
        </button>
      </div>
    </div>
  );
}
