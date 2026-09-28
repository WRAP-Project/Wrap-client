import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProjectMilestones } from "@/data/MilestonesContext";
import { useProjectSchedules } from "@/data/SchedulesContext";
import { daysLeft, ddayLabel, type Schedule } from "@/data/useSchedules";
import { FALLBACK_ACCENT, onAccentPalette } from "@/lib/color";

// D-day 뱃지 색은 일정의 유형이 아니라 "마일스톤에 걸려 있는지"로 나눈다.
// 등록 폼에서 유형 선택이 사라져 새 일정이 전부 같은 유형이 되었고, 새 모델에서
// 의미 있는 구분은 "이 일정이 팀 목표에 기여하는가"이기 때문이다.
const UNLINKED_COLOR = "rgba(28,28,30,0.35)";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function formatMd(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  return `${Number(m)}.${Number(d)}`;
}

export default function ProjectSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  // 프로젝트에 속한 요소는 그 프로젝트의 색만 쓴다.
  const accent = projects.find((p) => p.id === projectId)?.color ?? FALLBACK_ACCENT;
  const onAccent = onAccentPalette(accent);
  const milestones = useProjectMilestones(projectId);
  const milestoneTitleOf = (id: string | null | undefined) =>
    id ? milestones.find((m) => m.id === id)?.title : undefined;
  // 이 프로젝트의 전체 일정 — 마감이 가까운 순(지난 일정은 뒤)으로 정렬돼 온다
  const projectSchedules = useProjectSchedules(projectId);
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));

  const upcomingCount = useMemo(
    () => projectSchedules.filter((s) => daysLeft(s.date) >= 0).length,
    [projectSchedules],
  );

  const weekStrip = useMemo(() => {
    const center = new Date(selectedDate + "T00:00:00");
    return Array.from({ length: 7 }, (_, i) => addDays(center, i - 3));
  }, [selectedDate]);

  const selected = new Date(selectedDate + "T00:00:00");

  function goDay(delta: number) {
    setSelectedDate(toDateStr(addDays(selected, delta)));
  }

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

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">전체 일정</h1>

        {/* 헤더 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: accent }}>
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold" style={{ color: onAccent.fg }}>
              {selected.getFullYear()}년 {selected.getMonth() + 1}월
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => goDay(-7)} className="w-7 h-7 flex items-center justify-center active:opacity-60">
                <ChevronLeft size={16} color={onAccent.fg} />
              </button>
              <button onClick={() => goDay(7)} className="w-7 h-7 flex items-center justify-center active:opacity-60">
                <ChevronRight size={16} color={onAccent.fg} />
              </button>
            </div>
          </div>

          {/* 7일 스트립 */}
          <div className="flex justify-between">
            {weekStrip.map((d) => {
              const dateStr = toDateStr(d);
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="text-[10px] font-semibold" style={{ color: onAccent.faint }}>
                    {WEEKDAYS[d.getDay()]}
                  </span>
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{
                      background: isSelected ? onAccent.fg : "transparent",
                      color: isSelected ? accent : onAccent.fg,
                    }}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] font-semibold" style={{ color: onAccent.dim }}>
            전체 일정 {projectSchedules.length}개 · 다가오는 일정 {upcomingCount}개
          </p>
        </div>

        {/* 전체 일정 — 마감이 가까운 순, 지난 일정은 뒤에 흐리게 */}
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
            전체 일정
          </p>

          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
            {projectSchedules.length === 0 ? (
              <p className="px-4 py-6 text-center text-[13px]" style={{ color: "rgba(28,28,30,0.4)" }}>
                등록된 일정이 없어요
              </p>
            ) : (
              projectSchedules.map((s: Schedule, i) => {
                const past = daysLeft(s.date) < 0;
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{
                      borderBottom: i < projectSchedules.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                      opacity: past ? 0.45 : 1,
                    }}
                  >
                    <span
                      className="text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 min-w-[40px] text-center"
                      style={{
                        background: past ? UNLINKED_COLOR : s.milestoneId ? accent : UNLINKED_COLOR,
                        color: past || !s.milestoneId ? "#fff" : onAccentPalette(accent).fg,
                      }}
                    >
                      {ddayLabel(s.date)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-semibold truncate" style={{ color: "#1C1C1E" }}>{s.title}</p>
                      <p className="text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
                        {formatMd(s.date)} · {s.startTime}
                        {/* 어느 팀 목표에 기여하는 일정인지 — 뱃지 색과 짝이 된다 */}
                        {milestoneTitleOf(s.milestoneId) && ` · ${milestoneTitleOf(s.milestoneId)}`}
                      </p>
                    </div>
                    <ChevronRight size={16} strokeWidth={2} color="rgba(28,28,30,0.3)" />
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
