import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarClock, Check, ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { buildCalendar } from "@/lib/calendarGrid";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import { daysLeft, ddayLabel, type ChecklistItem, type Schedule, type ScheduleDraft, type ScheduleType } from "@/data/useSchedules";
import { useSchedulesContext } from "@/data/SchedulesContext";
import { useProjectsContext } from "@/data/ProjectsContext";
import {
  DAY_END_MIN,
  DAY_START_MIN,
  STATUS_LABEL,
  toMinutes,
  useTeamDaySchedule,
  type TeamMemberDay,
  type TeamStatus,
} from "@/data/useTeamDaySchedule";

// ── 색상 ──────────────────────────────────────────────────────────────────────
// 화면 배경은 ProjectDetail/CreateProject와 같은 계열(#1C1C1E). 등록 바텀시트만
// 디자인 시안대로 흰색 톤 — 이 화면 전용 톤이라 chatShared 팔레트는 쓰지 않는다.

const INK = "#1C1C1E";
const FG = "#F0F0EC";
const FG70 = "rgba(240,240,236,0.7)";
const FG50 = "rgba(240,240,236,0.5)";
const FG35 = "rgba(240,240,236,0.35)";
const SURFACE = "rgba(240,240,236,0.06)";
const PINK = "#EB3E88";
const BLUE = "#60C8F5";
const PURPLE = "#A78BFA";

const TYPE_LABEL: Record<ScheduleType, string> = {
  deadline: "마감",
  meeting: "미팅",
  milestone: "마일스톤",
};

/** 프로젝트 색을 못 찾았을 때만 쓰는 기본색 */
const FALLBACK_COLOR = PURPLE;

/** 배경이 밝으면 글자를 어둡게 — 프로젝트 색을 사용자가 고르므로 밝기를 계산한다. */
function isBright(hex: string): boolean {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
/** 주간 스트립은 사진과 동일하게 월요일 시작 */
const WEEKDAYS_MON = ["월", "화", "수", "목", "금", "토", "일"];
const TABS = [
  { id: "mine", label: "내 일정" },
  { id: "team", label: "팀원 일정" },
] as const;
type TabId = (typeof TABS)[number]["id"];

function todayPicked(): PickedDate {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
}
function pickedToDateStr({ year, month, day }: PickedDate): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
function pickedToDate({ year, month, day }: PickedDate): Date {
  return new Date(year, month, day);
}
function dateToPicked(d: Date): PickedDate {
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}
/** 월요일 시작 주의 첫 날 */
function startOfWeek(d: Date): Date {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7));
  return c;
}

// ── 토글 스위치 ───────────────────────────────────────────────────────────────

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: on ? INK : "rgba(28,28,30,0.15)" }}
    >
      <span
        className="absolute top-1 size-5 rounded-full bg-white shadow transition-all"
        style={{ left: on ? 22 : 4 }}
      />
    </button>
  );
}

// ── 일정 등록 바텀시트 ────────────────────────────────────────────────────────

function RegisterSheet({
  defaultProjectId,
  onClose,
  onSubmit,
}: {
  defaultProjectId: string | null;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => void;
}) {
  const { projects } = useProjectsContext();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [date, setDate] = useState<PickedDate>(todayPicked());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [type, setType] = useState<ScheduleType>("deadline");
  const [reminder, setReminder] = useState(false);

  const projectName = projects.find((p) => p.id === projectId)?.name ?? "";
  const canSubmit = title.trim().length > 0 && projectId.length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({
      projectId,
      projectName,
      title: title.trim(),
      date: pickedToDateStr(date),
      startTime,
      endTime,
      type,
      reminder,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-[28px]"
        style={{ background: "#fff", maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 + 헤더 */}
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "rgba(28,28,30,0.15)" }} />
          <div className="flex items-center justify-between pb-4">
            <button onClick={onClose} className="text-[14px]" style={{ color: "rgba(28,28,30,0.5)" }}>
              취소
            </button>
            <span className="text-[16px] font-bold" style={{ color: INK }}>
              일정 등록
            </span>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="text-[14px] font-bold"
              style={{ color: canSubmit ? INK : "rgba(28,28,30,0.25)" }}
            >
              저장
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 [scrollbar-width:none]">
          {/* 일정 제목 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              일정 제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="w-full text-[16px] outline-none"
              style={{ color: INK }}
            />
          </div>

          {/* 프로젝트 */}
          <div className="relative border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              프로젝트
            </label>
            <button
              onClick={() => setProjectPickerOpen((v) => !v)}
              className="flex w-full items-center justify-between text-[16px]"
              style={{ color: INK }}
            >
              <span>{projectName || "프로젝트를 선택하세요"}</span>
              <ChevronRight size={16} color="rgba(28,28,30,0.3)" />
            </button>
            {projectPickerOpen && (
              <div
                className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-2xl shadow-lg"
                style={{ background: "#fff", border: "1px solid rgba(28,28,30,0.08)" }}
              >
                {projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setProjectId(p.id); setProjectPickerOpen(false); }}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] active:opacity-60"
                    style={{ color: INK }}
                  >
                    <span className="size-2 rounded-full" style={{ background: p.color }} />
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 날짜 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              날짜
            </label>
            <button
              onClick={() => setDatePickerOpen(true)}
              className="flex w-full items-center justify-between text-[16px]"
              style={{ color: INK }}
            >
              <span>{pickedToDateStr(date).replace(/-/g, ".")}</span>
              <ChevronRight size={16} color="rgba(28,28,30,0.3)" />
            </button>
          </div>

          {/* 시간 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              시간
            </label>
            <div className="flex gap-6">
              <div className="flex-1">
                <span className="mb-1 block text-[11px]" style={{ color: "rgba(28,28,30,0.4)" }}>시작</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full text-[16px] outline-none"
                  style={{ color: INK }}
                />
              </div>
              <div className="flex-1">
                <span className="mb-1 block text-[11px]" style={{ color: "rgba(28,28,30,0.4)" }}>종료</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full text-[16px] outline-none"
                  style={{ color: INK }}
                />
              </div>
            </div>
          </div>

          {/* 유형 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              유형
            </label>
            <div className="flex gap-2">
              {(Object.keys(TYPE_LABEL) as ScheduleType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className="flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-colors"
                  style={{
                    background: type === t ? INK : "rgba(28,28,30,0.06)",
                    color: type === t ? "#fff" : "rgba(28,28,30,0.5)",
                  }}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          {/* 마감 리마인드 */}
          <div className="flex items-center justify-between py-4">
            <span className="text-[14px] font-semibold" style={{ color: INK }}>마감 리마인드</span>
            <Toggle on={reminder} onChange={setReminder} />
          </div>
        </div>

        {/* 등록하기 — 실제 등록 동작은 아직 미완성 */}
        <div className="shrink-0 px-5 pb-8 pt-2">
          <button
            onClick={() => alert("구현 완료되지 않은 기능입니다.")}
            disabled={!canSubmit}
            className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
            style={{ background: canSubmit ? INK : "rgba(28,28,30,0.15)", color: "#fff" }}
          >
            등록하기
          </button>
        </div>
      </div>

      {datePickerOpen && (
        <DatePickerSheet
          selected={date}
          onSelect={setDate}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </div>
  );
}

// ── 마감 리마인드 카드 ────────────────────────────────────────────────────────
// 누르면 체크리스트(담당자·상태·BLOCK 배지)가 카드 안에 펼쳐진다.

function ChecklistRow({
  item, bright, onToggle,
}: {
  item: ChecklistItem; bright: boolean; onToggle: () => void;
}) {
  const done = item.state === "done";
  const blocked = item.state === "blocked";
  return (
    <div className="flex items-center gap-3.5">
      <button
        onClick={onToggle}
        className="grid size-7 shrink-0 place-items-center rounded-lg transition-colors"
        style={done ? { background: INK } : { border: `2px solid ${bright ? INK : "#fff"}` }}
      >
        {done && <Check size={14} color="#fff" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold" style={{ color: bright ? INK : "#fff" }}>
          {item.title}
        </p>
        <p
          className="mt-0.5 truncate text-[11px] font-semibold"
          style={{ color: blocked ? PINK : bright ? "rgba(28,28,30,0.45)" : "rgba(255,255,255,0.6)" }}
        >
          {item.statusLabel} · {item.assignee}
        </p>
      </div>
      {blocked && (
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tracking-[.04em]"
          style={{ background: PINK, color: "#fff" }}
        >
          BLOCK
        </span>
      )}
    </div>
  );
}

function ReminderCard({
  schedule, color, open, onToggleOpen, onToggleItem,
}: {
  schedule: Schedule;
  color: string;
  open: boolean;
  onToggleOpen: () => void;
  onToggleItem: (itemId: string) => void;
}) {
  const bright = isBright(color);
  const hasBlocked = schedule.checklist?.some((i) => i.state === "blocked") ?? false;

  return (
    <div className="rounded-3xl rounded-tl-lg px-5 py-4" style={{ background: color }}>
      <button onClick={onToggleOpen} className="flex w-full items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          {/* 막힘 항목이 있는 마감은 D-라벨을 경고색으로 */}
          <p
            className="text-[13px] font-black"
            style={{ color: hasBlocked ? PINK : bright ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.7)" }}
          >
            {ddayLabel(schedule.date)}
          </p>
          <p className="mt-0.5 truncate text-[16px] font-bold" style={{ color: bright ? INK : "#fff" }}>
            {schedule.title}
          </p>
          <p className="mt-0.5 truncate text-[12px]" style={{ color: bright ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.7)" }}>
            {schedule.projectName}
          </p>
        </div>
        <ChevronDown
          size={18}
          className="mt-1 shrink-0"
          style={{
            color: bright ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.7)",
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        />
      </button>

      {open && (
        <div className="mt-5 flex flex-col gap-4 pb-1">
          {schedule.checklist?.length ? (
            schedule.checklist.map((item) => (
              <ChecklistRow key={item.id} item={item} bright={bright} onToggle={() => onToggleItem(item.id)} />
            ))
          ) : (
            <p className="text-[12px]" style={{ color: bright ? "rgba(28,28,30,0.5)" : "rgba(255,255,255,0.6)" }}>
              등록된 체크리스트가 없어요
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── 주간 스트립 ───────────────────────────────────────────────────────────────

function WeekStrip({
  selected,
  onSelect,
}: {
  selected: Date;
  onSelect: (d: Date) => void;
}) {
  const monday = startOfWeek(selected);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return d;
  });
  const today = new Date();

  function shiftWeek(delta: number) {
    const d = new Date(selected);
    d.setDate(d.getDate() + delta * 7);
    onSelect(d);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <button onClick={() => shiftWeek(-1)} className="grid size-8 place-items-center active:opacity-50">
          <ChevronLeft size={16} color={FG50} />
        </button>
        <span className="text-[13px] font-bold" style={{ color: FG70 }}>
          {monday.getFullYear()}.{String(monday.getMonth() + 1).padStart(2, "0")}
        </span>
        <button onClick={() => shiftWeek(1)} className="grid size-8 place-items-center active:opacity-50">
          <ChevronRight size={16} color={FG50} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {days.map((d, i) => {
          const sel = d.toDateString() === selected.toDateString();
          const isToday = d.toDateString() === today.toDateString();
          return (
            <button key={i} onClick={() => onSelect(d)} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] font-semibold" style={{ color: i === 6 ? PINK : i === 5 ? BLUE : FG35 }}>
                {WEEKDAYS_MON[i]}
              </span>
              <span
                className="flex size-9 items-center justify-center rounded-full text-[14px]"
                style={{
                  background: sel ? "#fff" : isToday ? SURFACE : "transparent",
                  color: sel ? INK : FG70,
                  fontWeight: sel ? 800 : 500,
                }}
              >
                {d.getDate()}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 팀원 일정 타임라인 ────────────────────────────────────────────────────────

/** 09~19시를 1시간 60px으로 그린다 — 좁은 폭에서 막대 제목이 읽히도록 가로 스크롤. */
const HOUR_PX = 60;
const LANE_WIDTH = ((DAY_END_MIN - DAY_START_MIN) / 60) * HOUR_PX;
const NAME_COL = 120;
/** 팀원 정보(아바타 44px, 배지+이름+프로젝트) 한 줄의 최소 높이 */
const NAME_ROW_MIN = 52;

function offsetOf(hhmm: string): number {
  return ((toMinutes(hhmm) - DAY_START_MIN) / 60) * HOUR_PX;
}

function StatusBadge({ status }: { status: TeamStatus }) {
  const style =
    status === "blocked"
      ? { background: PINK, color: "#fff", border: "none" }
      : status === "done"
        ? { background: SURFACE, color: FG50, border: "none" }
        : { background: "transparent", color: FG70, border: `1px solid ${FG35}` };
  return (
    <span className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={style}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function TeamTimeline({ rows, color }: { rows: TeamMemberDay[]; color: (projectId: string) => string }) {
  const hours = Array.from({ length: (DAY_END_MIN - DAY_START_MIN) / 60 + 1 }, (_, i) => 9 + i);

  // 팀원 칸과 시간표는 서로 다른 스크롤 컨테이너에 들어가므로, 두 열의 행 높이를
  // 같은 값으로 계산해서 줄이 어긋나지 않게 맞춘다.
  const rowHeights = rows.map((r) => Math.max(NAME_ROW_MIN, Math.max(1, r.tasks.length) * 30));

  return (
    <div className="flex">
      {/* 팀원 칸 — 스크롤 밖에 있어 항상 제자리 */}
      <div className="shrink-0" style={{ width: NAME_COL }}>
        <div className="h-5" /> {/* 시간 눈금 줄만큼 비움 */}
        <div className="flex flex-col gap-4">
          {rows.map((r, i) => (
            <div key={r.id} className="flex gap-2.5 pr-3" style={{ height: rowHeights[i] }}>
              <span
                className="size-11 shrink-0 rounded-2xl rounded-tl-md"
                style={{ background: color(r.projectId), opacity: r.status === "done" ? 0.5 : 1 }}
              />
              <div className="min-w-0">
                <StatusBadge status={r.status} />
                <p className="mt-1 truncate text-[13px] font-bold" style={{ color: FG }}>
                  {r.name}
                </p>
                <p className="truncate text-[10px]" style={{ color: FG35 }}>
                  {r.projectName}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 시간표 — 가로 스크롤은 이 영역 안에서만 일어나고, 막대는 밖으로 넘치지 않는다 */}
      <div className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none]">
        <div style={{ width: LANE_WIDTH }}>
          {/* 시간 눈금 */}
          <div className="relative h-5">
            {hours.map((h) => (
              <span
                key={h}
                className="absolute top-0 text-[10px]"
                style={{ left: (h - 9) * HOUR_PX, color: FG35 }}
              >
                {h}시
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            {rows.map((r, i) => {
              const c = color(r.projectId);
              const bright = isBright(c);
              return (
                <div key={r.id} className="relative" style={{ height: rowHeights[i] }}>
                  {r.tasks.length === 0 && (
                    <span className="text-[11px]" style={{ color: FG35 }}>
                      등록된 일정 없음
                    </span>
                  )}
                  {r.tasks.map((t, k) => {
                    const left = offsetOf(t.startTime);
                    const width = Math.max(44, offsetOf(t.endTime) - left);
                    return (
                      <span
                        key={t.id}
                        className="absolute flex h-6 items-center rounded-md px-2 text-[11px] font-semibold"
                        style={{
                          left,
                          top: k * 30,
                          width,
                          background: c,
                          color: bright ? INK : "#fff",
                          opacity: t.done ? 0.55 : 1,
                          textDecoration: t.done ? "line-through" : undefined,
                        }}
                        title={`${t.startTime}–${t.endTime} ${t.title}`}
                      >
                        <span className="truncate">{t.title}</span>
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── 메인 화면 ──────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { schedules, addSchedule, toggleChecklistItem } = useSchedulesContext();
  const { projects, selectedProjectId, selectProject } = useProjectsContext();
  const navigate = useNavigate();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  /** null이면 날짜 선택 해제 — 마감 리마인드는 다시 전체(다가오는 순)로 돌아간다. */
  const [selectedDay, setSelectedDay] = useState<PickedDate | null>(todayPicked());
  const [activeTab, setActiveTab] = useState<TabId>("mine");
  const [registerOpen, setRegisterOpen] = useState(false);
  /** 펼쳐진 마감 리마인드 카드 — 한 번에 하나만 */
  const [openReminderId, setOpenReminderId] = useState<string | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  /**
   * null이면 전체 프로젝트 — 상단 원형 프로젝트를 누르면 해당 프로젝트만 본다.
   * 기본값은 채팅 탭과 동일하게 홈에서 선택한 프로젝트(전역 선택 상태).
   */
  const [filterProjectId, setFilterProjectId] = useState<string | null>(selectedProjectId);

  /** 캘린더 탭에서 고른 프로젝트도 전역 선택 상태에 반영한다. */
  function pickProject(id: string | null) {
    setFilterProjectId(id);
    selectProject(id);
  }

  const filterColor = projects.find((p) => p.id === filterProjectId)?.color ?? null;

  /** 일정 색은 상단 원형 아이콘과 동일하게 프로젝트 색을 따른다. */
  function colorOfProject(id: string): string {
    return projects.find((p) => p.id === id)?.color ?? FALLBACK_COLOR;
  }

  const cells = buildCalendar(viewYear, viewMonth);

  const visibleSchedules = filterProjectId
    ? schedules.filter((s) => s.projectId === filterProjectId)
    : schedules;

  const schedulesByDate = new Map<string, Schedule[]>();
  for (const s of visibleSchedules) {
    const list = schedulesByDate.get(s.date) ?? [];
    list.push(s);
    schedulesByDate.set(s.date, list);
  }

  function dateStrOf(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${viewYear}-${mm}-${dd}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }

  /** 날짜를 고르면 그 날짜만, 선택을 풀면 다가오는 리마인드 전체. */
  const selectedDateStr = selectedDay ? pickedToDateStr(selectedDay) : null;
  const reminders = selectedDateStr
    ? visibleSchedules.filter((s) => s.reminder && s.date === selectedDateStr)
    : [...visibleSchedules]
        .filter((s) => s.reminder && daysLeft(s.date) >= 0)
        .sort((a, b) => daysLeft(a.date) - daysLeft(b.date));

  /** 팀원 일정 탭은 "선택 없음" 상태가 없다 — 선택이 풀려 있으면 오늘 기준. */
  const teamDate = selectedDay ?? todayPicked();
  const { rows: teamRows } = useTeamDaySchedule(filterProjectId, pickedToDateStr(teamDate));

  async function handleRegister(draft: ScheduleDraft) {
    try {
      await addSchedule(draft);
      setRegisterOpen(false);
    } catch {
      alert("일정 등록에 실패했습니다.");
    }
  }

  function handleTabClick(id: TabId) {
    setActiveTab(id);
  }

  /** 전체 일정의 막힘(BLOCK) 체크리스트 항목 — 상단 막힘 신호 배너의 데이터 */
  const blockedSignals = schedules.flatMap((s) =>
    (s.checklist ?? [])
      .filter((i) => i.state === "blocked")
      .map((i) => ({ ...i, projectId: s.projectId })),
  );

  return (
    <div className="relative flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      {/* 막힘 신호 배너 — 화살표를 누르면 담당자 목록이 아래로 펼쳐진다 */}
      {blockedSignals.length > 0 && (
        <button
          onClick={() => setBlockedOpen(true)}
          className="flex shrink-0 items-center justify-between px-5 py-3.5"
          style={{ borderBottom: "1px solid rgba(240,240,236,0.08)" }}
        >
          <span className="flex items-center gap-3">
            <span className="size-4 rounded-full" style={{ background: PINK }} />
            <span className="text-[14px] font-bold" style={{ color: PINK }}>막힘 신호 {blockedSignals.length}건</span>
          </span>
          <ChevronDown size={16} color={FG50} />
        </button>
      )}

      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">캘린더</h1>
        {/* 일정 조정하기 — 막힘 신호가 있으면 우상단에 경고 점이 붙는다 */}
        <button
          onClick={() => navigate("/calendar/adjust")}
          className="relative grid size-11 place-items-center rounded-xl active:opacity-60"
          style={{ background: SURFACE }}
        >
          <CalendarClock size={19} color={FG70} strokeWidth={2} />
          {blockedSignals.length > 0 && (
            <span className="absolute right-1 top-1 size-2 rounded-full" style={{ background: PINK }} />
          )}
        </button>
      </header>

      {/* 내 프로젝트 — 누르면 해당 프로젝트 일정만 본다(다시 누르면 전체) */}
      <div className="flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {projects.map((p) => {
          const on = filterProjectId === p.id;
          return (
            <button
              key={p.id}
              onClick={() => pickProject(on ? null : p.id)}
              className="flex w-11 shrink-0 flex-col items-center gap-1.5"
            >
              {/* 선택 시 안쪽에 배경색 링이 생겨 도넛 형태가 된다 */}
              <span
                className="size-11 rounded-full transition-all"
                style={{
                  background: p.color,
                  opacity: filterProjectId && !on ? 0.4 : 1,
                  boxShadow: on ? `inset 0 0 0 3px ${p.color}, inset 0 0 0 5px ${INK}` : undefined,
                }}
              />
              <span
                className="w-full truncate text-center text-[10px]"
                style={{ color: on ? FG : FG50, fontWeight: on ? 700 : 500 }}
              >
                {p.name}
              </span>
            </button>
          );
        })}

        <button
          onClick={() => navigate("/create-project")}
          className="flex w-11 shrink-0 flex-col items-center gap-1.5"
        >
          <span className="grid size-11 place-items-center rounded-full" style={{ background: SURFACE }}>
            <Plus size={18} color={FG50} strokeWidth={2.2} />
          </span>
          <span className="w-full truncate text-center text-[10px]" style={{ color: FG35 }}>
            추가
          </span>
        </button>
      </div>

      {/* 탭 */}
      <div className="mx-5 mt-4 flex shrink-0 rounded-2xl p-1" style={{ background: SURFACE }}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className="flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-colors"
            style={{
              background: activeTab === tab.id ? (filterColor ?? FG) : "transparent",
              color: activeTab === tab.id ? INK : FG50,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 [scrollbar-width:none]">
        {activeTab === "team" ? (
          <>
            <WeekStrip
              selected={pickedToDate(teamDate)}
              onSelect={(d) => setSelectedDay(dateToPicked(d))}
            />

            <div className="mt-6">
              {teamRows.length === 0 ? (
                <div className="flex flex-col items-center gap-1 rounded-2xl px-4 py-10 text-center" style={{ background: SURFACE }}>
                  <p className="text-[13px] font-bold" style={{ color: FG70 }}>표시할 팀원이 없어요</p>
                  <p className="text-[11px]" style={{ color: FG35 }}>프로젝트에 팀원을 초대해보세요</p>
                </div>
              ) : (
                <TeamTimeline rows={teamRows} color={colorOfProject} />
              )}
            </div>

            <button
              onClick={() => alert("구현 완료되지 않은 기능입니다.")}
              className="mt-8 w-full rounded-2xl border py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ borderColor: FG35, color: FG }}
            >
              가능한 시간 확인
            </button>
          </>
        ) : visibleSchedules.length === 0 ? (
          /* ── 빈 상태 ── */
          <div className="flex flex-col items-center gap-6 pt-24 text-center">
            <div>
              <p className="text-[15px] font-bold" style={{ color: FG70 }}>등록된 일정이 없어요</p>
              <p className="mt-1 text-[12px]" style={{ color: FG35 }}>일정을 추가해 목표를 관리해보세요</p>
            </div>
            <button
              onClick={() => setRegisterOpen(true)}
              className="w-full rounded-2xl py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ background: SURFACE, color: FG70 }}
            >
              일정 등록하기
            </button>
          </div>
        ) : (
          <>
            {/* 월 네비게이션 */}
            <div className="mb-4 flex items-center justify-between">
              <button onClick={prevMonth} className="grid size-8 place-items-center active:opacity-50">
                <ChevronLeft size={18} color={FG50} />
              </button>
              <span className="text-[16px] font-bold">
                {viewYear}.{String(viewMonth + 1).padStart(2, "0")}
              </span>
              <button onClick={nextMonth} className="grid size-8 place-items-center active:opacity-50">
                <ChevronRight size={18} color={FG50} />
              </button>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 text-center">
              {WEEKDAYS.map((w, i) => (
                <span key={w} className="pb-2 text-[11px] font-semibold" style={{ color: i === 0 ? PINK : i === 6 ? BLUE : FG35 }}>
                  {w}
                </span>
              ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-y-2 text-center">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`e-${idx}`} />;
                const col = idx % 7;
                const dateStr = dateStrOf(day);
                const daySchedules = schedulesByDate.get(dateStr) ?? [];
                const sel =
                  selectedDay !== null &&
                  selectedDay.year === viewYear &&
                  selectedDay.month === viewMonth &&
                  selectedDay.day === day;
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay(sel ? null : { year: viewYear, month: viewMonth, day })}
                    className="mx-auto flex w-9 flex-col items-center gap-1"
                  >
                    <span
                      className="flex size-9 items-center justify-center rounded-full text-[13px]"
                      style={{
                        background: sel ? "#fff" : isToday ? SURFACE : "transparent",
                        color: sel ? INK : col === 0 ? PINK : col === 6 ? BLUE : FG70,
                        fontWeight: sel ? 800 : 500,
                      }}
                    >
                      {day}
                    </span>
                    <span className="flex h-1.5 items-center justify-center gap-[3px]">
                      {daySchedules.slice(0, 3).map((s) => (
                        <span key={s.id} className="size-[3px] rounded-full" style={{ background: colorOfProject(s.projectId) }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 일정 등록하기 */}
            <button
              onClick={() => setRegisterOpen(true)}
              className="mt-6 w-full rounded-2xl border py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ borderColor: FG35, color: FG }}
            >
              일정 등록하기
            </button>

            {/* 마감 리마인드 — 선택한 날짜의 일정만 */}
            <div className="mt-7">
              <h2 className="mb-3 text-[13px] font-bold" style={{ color: FG50 }}>
                마감 리마인드{selectedDateStr ? ` · ${selectedDateStr.replace(/-/g, ".")}` : ""}
              </h2>
              {reminders.length > 0 ? (
                /* 왼쪽 세로 레일 + 카드 목록 */
                <div className="relative pl-4">
                  <span
                    className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full"
                    style={{ background: "rgba(240,240,236,0.12)" }}
                  />
                  <div className="flex flex-col gap-3.5">
                    {reminders.map((s) => (
                      <ReminderCard
                        key={s.id}
                        schedule={s}
                        color={colorOfProject(s.projectId)}
                        open={openReminderId === s.id}
                        onToggleOpen={() => setOpenReminderId((cur) => (cur === s.id ? null : s.id))}
                        onToggleItem={(itemId) => toggleChecklistItem(s.id, itemId)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl px-4 py-6 text-center text-[12px]" style={{ background: SURFACE, color: FG35 }}>
                  {selectedDateStr ? "이 날짜에는 마감 리마인드가 없어요" : "다가오는 마감 리마인드가 없어요"}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* 막힘 신호 펼침 — 배너 아래로 담당자 목록이 내려오고 나머지는 어두워진다 */}
      {blockedOpen && (
        <div className="absolute inset-0 z-50 flex flex-col">
          <div style={{ background: INK }}>
            <button
              onClick={() => setBlockedOpen(false)}
              className="flex w-full items-center justify-between px-5 py-3.5"
              style={{ borderBottom: "1px solid rgba(240,240,236,0.08)" }}
            >
              <span className="flex items-center gap-3">
                <span className="size-4 rounded-full" style={{ background: PINK }} />
                <span className="text-[14px] font-bold" style={{ color: PINK }}>막힘 신호 {blockedSignals.length}건</span>
              </span>
              <ChevronDown size={16} color={FG50} style={{ transform: "rotate(180deg)" }} />
            </button>
            <div className="flex flex-col gap-3 px-5 pb-8 pt-5">
              {blockedSignals.map((sig) => {
                const c = colorOfProject(sig.projectId);
                return (
                  <div key={sig.id} className="flex items-center gap-4 py-2">
                    <span
                      className="grid size-14 shrink-0 place-items-center rounded-full text-[15px] font-black"
                      style={{ background: c, color: isBright(c) ? INK : "#fff" }}
                    >
                      {sig.assigneeInitials ?? sig.assignee.slice(0, 1)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-bold" style={{ color: FG }}>
                        {sig.assignee}{sig.assigneeRole ? ` · ${sig.assigneeRole}` : ""}
                      </p>
                      <p className="mt-1 truncate text-[13px]" style={{ color: PINK }}>{sig.title}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <span className="text-[12px] font-semibold" style={{ color: PINK }}>업데이트 필요</span>
                      <span className="rounded-full px-3 py-1.5 text-[11px] font-black" style={{ background: PINK, color: "#fff" }}>
                        BLOCK
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <button aria-label="닫기" onClick={() => setBlockedOpen(false)} className="flex-1" style={{ background: "rgba(0,0,0,0.55)" }} />
        </div>
      )}

      {registerOpen && (
        <RegisterSheet
          defaultProjectId={filterProjectId}
          onClose={() => setRegisterOpen(false)}
          onSubmit={handleRegister}
        />
      )}
    </div>
  );
}
