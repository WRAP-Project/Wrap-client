import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { countOnDate, useProjectTimeline, type TimelineItem } from "@/data/useProjectTimeline";
import { ddayLabel } from "@/data/useSchedules";
import { ALERT, DARK_SURFACE, FALLBACK_ACCENT, ON_DARK, onAccentPalette } from "@/lib/color";

// 지난 항목은 색을 빼서 가라앉힌다 — 목록에 남겨두되 다가오는 것보다 먼저
// 읽히면 안 된다.
const PAST_BADGE = { background: "rgba(240,240,236,0.10)", color: "rgba(240,240,236,0.45)" };

/** D-7 이내는 꽉 찬 경고색 — 목록에서 급한 것이 먼저 눈에 걸리게. */
const URGENT_DAYS = 7;

// 달력 스트립은 월요일 시작이다(디자인 기준).
const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];
const WEEKDAY_OF = ["일", "월", "화", "수", "목", "금", "토"];

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

/** 월요일을 주의 시작으로 본다 — 일요일(0)은 이전 주의 끝이다. */
function mondayOf(d: Date): Date {
  const offset = (d.getDay() + 6) % 7;
  return addDays(d, -offset);
}

/** "7.30 수" — 날짜만. 시각은 가진 항목(일정)에서만 따로 덧붙인다. */
function formatDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-");
  const weekday = WEEKDAY_OF[new Date(dateStr + "T00:00:00").getDay()];
  return `${Number(m)}.${Number(d)} ${weekday}`;
}

/** 한 줄 — 마일스톤·태스크·일정이 같은 모양을 쓴다. 구분은 뱃지와 부제가 한다. */
function TimelineRow({
  item,
  accent,
  onOpen,
}: {
  item: TimelineItem;
  accent: string;
  onOpen: (milestoneId: string) => void;
}) {
  const onAccent = onAccentPalette(accent);
  const past = item.dday !== null && item.dday < 0;
  // 달성·완료한 것과 지난 것은 같은 회색으로 가라앉히고, 남은 것 중 급한 것만
  // 경고색으로 꽉 채운다.
  const badgeStyle =
    item.done || past
      ? PAST_BADGE
      : item.dday !== null && item.dday <= URGENT_DAYS
        ? { background: ALERT, color: "#fff" }
        : { background: accent, color: onAccent.fg };

  const openable = item.milestoneId !== null;

  const body = (
    <>
      <span
        className="text-[11px] font-black px-2.5 py-1.5 rounded-lg shrink-0 min-w-[46px] text-center"
        style={badgeStyle}
      >
        {item.date ? ddayLabel(item.date) : "기한 없음"}
      </span>

      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[14px] font-semibold truncate"
            style={{
              color: item.done ? ON_DARK.faint : ON_DARK.fg,
              textDecoration: item.done ? "line-through" : "none",
            }}
          >
            {item.title}
          </span>
          {/* 팀 공동 목표인지(마일스톤) 개인 실행 항목인지(일정)를 구분한다 —
              같은 목록에 섞여 있으면 뱃지 없이는 읽히지 않는다. */}
          {item.kind === "milestone" && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
              style={{ background: ON_DARK.line, color: ON_DARK.dim }}
            >
              마일스톤
            </span>
          )}
        </span>
        {item.subtitle && (
          <span
            className="text-[11px] font-medium truncate"
            style={{ color: item.alert ? ALERT : ON_DARK.faint }}
          >
            {item.subtitle}
          </span>
        )}
      </span>

      <span className="shrink-0 text-[11px] font-medium text-right" style={{ color: ON_DARK.faint }}>
        {item.date ? formatDay(item.date) : "—"}
        {item.time ? ` · ${item.time}` : ""}
      </span>

      {/* 열 곳이 있는 항목에만 화살표를 둔다 — 눌러도 아무 일도 없는 화살표는
          고장으로 읽힌다. 태스크는 자기 상세가 없어 소속 마일스톤으로 간다. */}
      {openable && <ChevronRight size={14} strokeWidth={2} color={ON_DARK.faint} />}
    </>
  );

  const className = "w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left";

  return openable ? (
    <button
      onClick={() => onOpen(item.milestoneId!)}
      className={`${className} transition-opacity active:opacity-60`}
      style={{ background: DARK_SURFACE }}
    >
      {body}
    </button>
  ) : (
    <div className={className} style={{ background: DARK_SURFACE }}>
      {body}
    </div>
  );
}

export default function ProjectSchedule() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  // 프로젝트에 속한 요소는 그 프로젝트의 색만 쓴다.
  const accent = projects.find((p) => p.id === projectId)?.color ?? FALLBACK_ACCENT;
  const onAccent = onAccentPalette(accent);

  // 마일스톤 + 태스크 + 일정을 한 목록으로 — 합치는 규칙은 데이터 훅에 있다.
  const { items } = useProjectTimeline(projectId);
  const [selectedDate, setSelectedDate] = useState(() => toDateStr(new Date()));
  const [mineOnly, setMineOnly] = useState(false);

  const visible = useMemo(
    () => (mineOnly ? items.filter((i) => i.mine) : items),
    [items, mineOnly],
  );

  const weekStrip = useMemo(() => {
    const monday = mondayOf(new Date(selectedDate + "T00:00:00"));
    return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  }, [selectedDate]);

  const selected = new Date(selectedDate + "T00:00:00");
  const selectedCount = countOnDate(visible, selectedDate);

  function goWeek(delta: number) {
    setSelectedDate(toDateStr(addDays(selected, delta * 7)));
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1C1C1E", color: ON_DARK.fg }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 [scrollbar-width:none] flex flex-col gap-5">
        {/* 상단 바 — 뒤로가기와 제목을 한 줄에 둔다 */}
        <div className="relative flex items-center justify-center">
          <button
            onClick={() => navigate(-1)}
            className="absolute left-0 w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "rgba(240,240,236,0.08)" }}
          >
            <ArrowLeft size={16} strokeWidth={2.5} color={ON_DARK.fg} />
          </button>
          <h1 className="text-[15px] font-bold">전체 일정</h1>
        </div>

        {/* 달력 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-4" style={{ background: accent }}>
          <div className="flex items-center justify-between">
            <span className="text-[16px] font-bold" style={{ color: onAccent.fg }}>
              {selected.getFullYear()}년 {selected.getMonth() + 1}월
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => goWeek(-1)}
                aria-label="이전 주"
                className="w-6 h-6 flex items-center justify-center transition-opacity active:opacity-60"
              >
                <ChevronLeft size={14} color={onAccent.dim} />
              </button>
              <button
                onClick={() => goWeek(1)}
                aria-label="다음 주"
                className="w-6 h-6 flex items-center justify-center transition-opacity active:opacity-60"
              >
                <ChevronRight size={14} color={onAccent.dim} />
              </button>
            </div>
          </div>

          {/* 7일 스트립 — 선택한 날만 흰 원으로 띄운다 */}
          <div className="flex justify-between">
            {weekStrip.map((d, i) => {
              const dateStr = toDateStr(d);
              const isSelected = dateStr === selectedDate;
              return (
                <button
                  key={dateStr}
                  onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="text-[10px] font-semibold" style={{ color: onAccent.dim }}>
                    {WEEKDAYS[i]}
                  </span>
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold"
                    style={{
                      background: isSelected ? "#fff" : "transparent",
                      color: isSelected ? "#1C1C1E" : onAccent.dim,
                    }}
                  >
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-[11px] font-semibold" style={{ color: onAccent.dim }}>
            {selected.getMonth() + 1}월 {selected.getDate()}일 · 예정된 일정 {selectedCount}개
          </p>
        </div>

        {/* 목록 — 다가오는 것이 앞, 지난 것은 뒤에 가라앉혀서 */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[15px] font-bold">다가오는 일정</p>
            {/* 전체 ↔ 내 일정. 마일스톤은 팀 목표라 "내 일정"에서는 빠진다. */}
            <div className="flex items-center gap-1.5 text-[12px] font-semibold">
              <button
                onClick={() => setMineOnly(false)}
                className="transition-opacity active:opacity-60"
                style={{ color: mineOnly ? ON_DARK.faint : ON_DARK.fg }}
              >
                전체
              </button>
              <span style={{ color: ON_DARK.faint }}>·</span>
              <button
                onClick={() => setMineOnly(true)}
                className="transition-opacity active:opacity-60"
                style={{ color: mineOnly ? ON_DARK.fg : ON_DARK.faint }}
              >
                내 일정
              </button>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="rounded-2xl px-4 py-6 text-center" style={{ background: DARK_SURFACE }}>
              <p className="text-[12px] font-semibold" style={{ color: ON_DARK.faint }}>
                {mineOnly ? "나에게 배정된 일정이 없어요" : "등록된 일정이 없어요"}
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visible.map((item) => (
                <TimelineRow
                  key={item.key}
                  item={item}
                  accent={accent}
                  onOpen={(milestoneId) => navigate(`/project/${projectId}/milestone/${milestoneId}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
