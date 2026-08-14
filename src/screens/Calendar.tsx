import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, X } from "lucide-react";
import { buildCalendar } from "@/lib/calendarGrid";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import { useSchedules, daysLeft, type Schedule, type ScheduleDraft, type ScheduleType } from "@/data/useSchedules";
import { useTeamMembers } from "@/data/useTeamMembers";
import { useProjectsContext } from "@/data/ProjectsContext";

// ── 색상 ──────────────────────────────────────────────────────────────────────
// 화면 배경은 ProjectDetail/CreateProject와 같은 계열(#1C1C1E). 등록/공유 바텀시트만
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
const LIME = "#CDEA6F";
const YELLOW = "#F5E03A";

const TYPE_COLOR: Record<ScheduleType, string> = {
  deadline: PINK,
  meeting: BLUE,
  milestone: PURPLE,
};
const TYPE_LABEL: Record<ScheduleType, string> = {
  deadline: "마감",
  meeting: "미팅",
  milestone: "마일스톤",
};

const REMINDER_PALETTE = [LIME, PURPLE, PINK, BLUE, YELLOW];
const BRIGHT = new Set([LIME, YELLOW]);

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const TABS = [
  { id: "mine", label: "내 일정" },
  { id: "team", label: "팀원 일정" },
  { id: "checklist", label: "리스트 체크" },
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
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => void;
}) {
  const { projects } = useProjectsContext();
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [date, setDate] = useState<PickedDate>(todayPicked());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [type, setType] = useState<ScheduleType>("deadline");
  const [shared, setShared] = useState(true);
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
      shared,
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

          {/* 팀원에게 공유 */}
          <div className="flex items-center justify-between border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <span className="text-[14px] font-semibold" style={{ color: INK }}>팀원에게 공유</span>
            <Toggle on={shared} onChange={setShared} />
          </div>

          {/* 마감 리마인드 */}
          <div className="flex items-center justify-between py-4">
            <span className="text-[14px] font-semibold" style={{ color: INK }}>마감 리마인드</span>
            <Toggle on={reminder} onChange={setReminder} />
          </div>
        </div>

        {/* 등록하기 */}
        <div className="shrink-0 px-5 pb-8 pt-2">
          <button
            onClick={handleSubmit}
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

// ── 일정 공유 바텀시트 ────────────────────────────────────────────────────────

function ShareSheet({ onClose }: { onClose: () => void }) {
  const { members } = useTeamMembers();
  const [selected, setSelected] = useState<Set<string>>(new Set(members.map((m) => m.id)));

  const allSelected = selected.size === members.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(members.map((m) => m.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="w-full rounded-t-[28px] px-5 pb-8 pt-3"
        style={{ background: "#fff", maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ background: "rgba(28,28,30,0.15)" }} />
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[16px] font-bold" style={{ color: INK }}>일정 공유</span>
          <button onClick={onClose}><X size={18} color="rgba(28,28,30,0.4)" /></button>
        </div>

        <button
          onClick={toggleAll}
          className="flex w-full items-center justify-between border-b py-3"
          style={{ borderColor: "rgba(28,28,30,0.08)" }}
        >
          <span className="text-[14px] font-semibold" style={{ color: INK }}>전체 선택</span>
          <Checkbox checked={allSelected} />
        </button>

        <div className="flex flex-col">
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() => toggleOne(m.id)}
              className="flex items-center justify-between border-b py-3.5 last:border-b-0"
              style={{ borderColor: "rgba(28,28,30,0.06)" }}
            >
              <span className="text-[14px]" style={{ color: INK }}>{m.name}</span>
              <Checkbox checked={selected.has(m.id)} />
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          disabled={selected.size === 0}
          className="mt-6 w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: selected.size > 0 ? INK : "rgba(28,28,30,0.15)", color: "#fff" }}
        >
          {selected.size}명에게 공유
        </button>
      </div>
    </div>
  );
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      className="grid size-5 shrink-0 place-items-center rounded-md"
      style={{ background: checked ? INK : "transparent", border: checked ? "none" : "1.5px solid rgba(28,28,30,0.2)" }}
    >
      {checked && (
        <svg width="11" height="9" viewBox="0 0 13 10" fill="none">
          <path d="M1.5 5L5 8.5L11.5 1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// ── 마감 리마인드 카드 ────────────────────────────────────────────────────────

function ReminderCard({ schedule, index }: { schedule: Schedule; index: number }) {
  const bg = REMINDER_PALETTE[index % REMINDER_PALETTE.length];
  const bright = BRIGHT.has(bg);
  const left = daysLeft(schedule.date);
  const label = left === 0 ? "D-day" : left > 0 ? `D-${left}` : `D+${-left}`;

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-4" style={{ background: bg }}>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-black" style={{ color: bright ? "rgba(28,28,30,0.6)" : "rgba(255,255,255,0.7)" }}>
          {label}
        </p>
        <p className="truncate text-[15px] font-bold" style={{ color: bright ? INK : "#fff" }}>
          {schedule.title}
        </p>
        <p className="truncate text-[12px]" style={{ color: bright ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.7)" }}>
          {schedule.projectName}
        </p>
      </div>
      <button className="shrink-0" style={{ color: bright ? "rgba(28,28,30,0.4)" : "rgba(255,255,255,0.6)" }}>
        <MoreHorizontal size={18} />
      </button>
    </div>
  );
}

// ── 메인 화면 ──────────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { schedules, addSchedule } = useSchedules();
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<PickedDate>(todayPicked());
  const [activeTab, setActiveTab] = useState<TabId>("mine");
  const [registerOpen, setRegisterOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const cells = buildCalendar(viewYear, viewMonth);

  const schedulesByDate = new Map<string, Schedule[]>();
  for (const s of schedules) {
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

  const reminders = [...schedules]
    .filter((s) => s.reminder && daysLeft(s.date) >= 0)
    .sort((a, b) => daysLeft(a.date) - daysLeft(b.date));

  async function handleRegister(draft: ScheduleDraft) {
    try {
      await addSchedule(draft);
      setRegisterOpen(false);
      if (draft.shared) setShareOpen(true);
    } catch {
      alert("일정 등록에 실패했습니다.");
    }
  }

  function handleTabClick(id: TabId) {
    setActiveTab(id);
  }

  return (
    <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      <div className="flex items-center justify-between px-5 pt-5">
        <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">캘린더</h1>
        <button
          onClick={() => setRegisterOpen(true)}
          className="grid size-10 place-items-center rounded-xl transition-opacity active:opacity-60"
          style={{ background: SURFACE }}
        >
          <Plus size={18} color={FG} strokeWidth={2.2} />
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
              background: activeTab === tab.id ? FG : "transparent",
              color: activeTab === tab.id ? INK : FG50,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-5 [scrollbar-width:none]">
        {activeTab !== "mine" ? (
          <div className="flex flex-col items-center gap-1 rounded-2xl px-4 py-10 text-center" style={{ background: SURFACE }}>
            <p className="text-[13px] font-bold" style={{ color: FG70 }}>
              {activeTab === "team" ? "팀원 일정" : "리스트 체크"}는 준비 중이에요
            </p>
            <p className="text-[11px]" style={{ color: FG35 }}>곧 만나보실 수 있어요</p>
          </div>
        ) : schedules.length === 0 ? (
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
              일정 등록
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
                const sel = selectedDay.year === viewYear && selectedDay.month === viewMonth && selectedDay.day === day;
                const isToday = today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDay({ year: viewYear, month: viewMonth, day })}
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
                        <span key={s.id} className="size-[3px] rounded-full" style={{ background: TYPE_COLOR[s.type] }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 일정 공유 버튼 */}
            <button
              onClick={() => setShareOpen(true)}
              className="mt-6 w-full rounded-2xl py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ background: FG, color: INK }}
            >
              일정 공유
            </button>

            {/* 마감 리마인드 */}
            {reminders.length > 0 && (
              <div className="mt-7">
                <h2 className="mb-3 text-[13px] font-bold" style={{ color: FG50 }}>마감 리마인드</h2>
                <div className="flex flex-col gap-3">
                  {reminders.map((s, i) => (
                    <ReminderCard key={s.id} schedule={s} index={i} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {registerOpen && (
        <RegisterSheet onClose={() => setRegisterOpen(false)} onSubmit={handleRegister} />
      )}
      {shareOpen && <ShareSheet onClose={() => setShareOpen(false)} />}
    </div>
  );
}
