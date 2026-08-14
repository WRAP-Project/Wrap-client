import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildCalendar } from "@/lib/calendarGrid";

// CreateProject(마감일)와 Calendar(일정 등록 날짜) 화면이 함께 쓰는 날짜 선택
// 바텀시트. 값은 문자열이 아닌 {year, month, day}로 주고받아 각 화면이
// 원하는 포맷("YYYY. MM. DD" 또는 "YYYY-MM-DD")으로 자유롭게 변환한다.

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export interface PickedDate {
  year: number;
  month: number; // 0-11
  day: number;
}

export function DatePickerSheet({
  selected,
  onSelect,
  onClose,
}: {
  selected: PickedDate | null;
  onSelect: (date: PickedDate) => void;
  onClose: () => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(selected?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected?.month ?? today.getMonth());

  const cells = buildCalendar(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  }
  function selectDay(day: number) {
    onSelect({ year: viewYear, month: viewMonth, day });
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
      className="fixed inset-0 z-[60] flex items-end"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-[28px] px-5 pt-5 pb-8 flex flex-col gap-4"
        style={{ background: "#2C2C2E", maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} />

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

        <div className="grid grid-cols-7 text-center">
          {WEEKDAYS.map((w, i) => (
            <span
              key={w}
              className="text-[11px] font-semibold py-1"
              style={{ color: i === 0 ? "#EB3E88" : i === 6 ? "#60A5FA" : "rgba(255,255,255,0.35)" }}
            >
              {w}
            </span>
          ))}
        </div>

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
                  color: sel ? "#1C1C1E" : col === 0 ? "#EB3E88" : col === 6 ? "#60A5FA" : "rgba(255,255,255,0.75)",
                  fontWeight: sel ? 800 : undefined,
                }}
              >
                {day}
              </button>
            );
          })}
        </div>

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
