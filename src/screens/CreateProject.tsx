import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";

// 포인트 컬러 옵션
const COLOR_OPTIONS = [
  { id: "green",  hex: "#CDEA6F" },
  { id: "yellow", hex: "#F5E03A" },
  { id: "purple", hex: "#A78BFA" },
  { id: "pink",   hex: "#F4A8A8" },
  { id: "blue",   hex: "#60C8F5" },
];

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ── 캘린더 피커 컴포넌트 ───────────────────────────────────────────────────────

function CalendarPicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // 선택된 날짜 파싱
  const selected = value
    ? (() => {
        const parts = value.replace(/\./g, "").trim().split(/\s+/);
        if (parts.length === 3) {
          const [y, m, d] = parts.map(Number);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) return { year: y, month: m - 1, day: d };
        }
        return null;
      })()
    : null;

  const cells = buildCalendar(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }
  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}. ${mm}. ${dd}`);
    onClose();
  }
  function isSelected(day: number) {
    return selected?.year === viewYear && selected?.month === viewMonth && selected?.day === day;
  }
  function isToday(day: number) {
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[28px] px-5 pt-5 pb-8 flex flex-col gap-4"
        style={{ background: "#2C2C2E", maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 바 */}
        <div className="mx-auto w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />

        {/* 헤더: 이전 / 연·월 / 다음 */}
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-50"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <ChevronLeft size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
          </button>
          <span className="text-[16px] font-bold" style={{ color: "#fff" }}>
            {viewYear}년 {viewMonth + 1}월
          </span>
          <button
            onClick={nextMonth}
            className="w-9 h-9 flex items-center justify-center rounded-xl transition-opacity active:opacity-50"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <ChevronRight size={18} color="rgba(255,255,255,0.7)" strokeWidth={2.2} />
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className="text-[11px] font-semibold py-1"
              style={{
                color: i === 0 ? "#EB3E88" : i === 6 ? "#60A5FA" : "rgba(255,255,255,0.35)",
              }}
            >
              {w}
            </span>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-y-1 text-center">
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e-${idx}`} />;
            const col = idx % 7;
            const sel = isSelected(day);
            const tod = isToday(day);
            return (
              <button
                key={day}
                onClick={() => selectDay(day)}
                className="mx-auto w-9 h-9 flex items-center justify-center rounded-full text-[14px] font-medium transition-all active:scale-90"
                style={{
                  background: sel ? "#CDEA6F" : tod ? "rgba(255,255,255,0.1)" : "transparent",
                  color: sel
                    ? "#1C1C1E"
                    : col === 0
                    ? "#EB3E88"
                    : col === 6
                    ? "#60A5FA"
                    : "rgba(255,255,255,0.75)",
                  fontWeight: sel ? 800 : undefined,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="w-full py-4 rounded-2xl text-[14px] font-bold transition-opacity active:opacity-70"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// ── 메인 화면 ──────────────────────────────────────────────────────────────────

export default function CreateProject() {
  const navigate = useNavigate();
  const { addProject } = useProjectsContext();

  const [name, setName]         = useState("");
  const [goal, setGoal]         = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor]       = useState(COLOR_OPTIONS[0].id);
  const [calOpen, setCalOpen]   = useState(false);

  const canCreate = name.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;

    const selectedHex = COLOR_OPTIONS.find((o) => o.id === color)?.hex ?? "#CDEA6F";

    try {
      await addProject({
        name: name.trim(),
        goal: goal.trim() || undefined,
        endDate: deadline.trim() || undefined,
        color: selectedHex,
      });
      navigate("/");
    } catch {
      alert("프로젝트 생성에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── 스크롤 가능 콘텐츠 ── */}
      <div className="flex-1 px-5 pt-4 pb-8 flex flex-col gap-6">

        {/* 뒤로가기 */}
        <button
          id="create-project-back"
          onClick={() => navigate(-1)}
          className="create-back-btn"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>

        {/* 제목 */}
        <h1 className="create-title">
          새 프로젝트<br />만들기
        </h1>

        {/* ── 폼 ── */}
        <div className="flex flex-col gap-5">

          {/* 프로젝트 이름 */}
          <div className="create-field">
            <label className="create-label" htmlFor="project-name">
              프로젝트 이름
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 리브랜딩 캠페인 2026"
              className="create-input"
            />
          </div>

          {/* 목표 한 줄 */}
          <div className="create-field">
            <label className="create-label" htmlFor="project-goal">
              목표 한 줄
            </label>
            <input
              id="project-goal"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="이 프로젝트로 무엇을 달성하나요?"
              className="create-input"
            />
          </div>

          {/* 마감일 — 캘린더 트리거 */}
          <div className="create-field">
            <label className="create-label">마감일</label>
            <button
              id="project-deadline"
              type="button"
              onClick={() => setCalOpen(true)}
              className="create-input create-input--deadline flex items-center justify-between text-left"
              style={{ cursor: "pointer" }}
            >
              <span style={{ color: deadline ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)" }}>
                {deadline || "예: 2026. 08. 31"}
              </span>
              <Calendar size={16} color="rgba(255,255,255,0.35)" strokeWidth={1.8} />
            </button>
          </div>

          {/* 포인트 컬러 */}
          <div className="create-field">
            <label className="create-label">포인트 컬러</label>
            <div className="create-color-row">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  id={`color-${opt.id}`}
                  onClick={() => setColor(opt.id)}
                  className={`create-color-btn ${color === opt.id ? "create-color-btn--active" : ""}`}
                  style={{ backgroundColor: opt.hex }}
                  aria-label={opt.id}
                >
                  {color === opt.id && (
                    <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                      <path
                        d="M1.5 5L5 8.5L11.5 1"
                        stroke="#1C1C1E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 하단 CTA 버튼 ── */}
      <div className="px-5 pb-6 pt-2">
        <button
          id="create-project-submit"
          onClick={handleCreate}
          disabled={!canCreate}
          className={`create-submit-btn ${canCreate ? "create-submit-btn--active" : ""}`}
        >
          <span className="text-lg leading-none mr-1">+</span>
          만들기
        </button>
      </div>

      {/* ── 캘린더 피커 ── */}
      {calOpen && (
        <CalendarPicker
          value={deadline}
          onChange={setDeadline}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}
