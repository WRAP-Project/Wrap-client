import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronLeft } from "lucide-react";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useTeamMembers } from "@/data/useTeamMembers";
import { ME_ID, useAdjustRequests } from "@/data/AdjustRequestsContext";

// 일정 조정 요청 생성 폼 — 조정 요청 목록(/calendar/adjust)의 "일정 조정하기"
// 버튼에서 들어온다. 제출하면 요청이 목록에 추가되고, 팀원들이 각자 가능한
// 시간을 칠해서 제출하는 흐름으로 이어진다.

const INK = "#1C1C1E";
const FG = "#F0F0EC";
const FG50 = "rgba(240,240,236,0.5)";
const FG35 = "rgba(240,240,236,0.35)";
const SURFACE = "rgba(240,240,236,0.06)";
const SURFACE_HIGH = "rgba(240,240,236,0.12)";
const LIME = "#CFF665";

function todayPicked(): PickedDate {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
}
function addDays(p: PickedDate, n: number): PickedDate {
  const d = new Date(p.year, p.month, p.day + n);
  return { year: d.getFullYear(), month: d.getMonth(), day: d.getDate() };
}
function formatPicked({ year, month, day }: PickedDate): string {
  return `${year}.${String(month + 1).padStart(2, "0")}.${String(day).padStart(2, "0")}`;
}
function pickedToDateStr({ year, month, day }: PickedDate): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** 라벨 + 값 한 쌍 — 날짜/시간 범위 카드의 좌우 칸 */
function RangeField({
  label,
  value,
  onClick,
  children,
}: {
  label: string;
  value?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-w-0 flex-1">
      <span className="mb-1 block text-[11px]" style={{ color: FG35 }}>
        {label}
      </span>
      {children ?? (
        <button onClick={onClick} className="w-full text-left text-[17px] font-bold active:opacity-60" style={{ color: FG }}>
          {value}
        </button>
      )}
    </div>
  );
}

export default function AdjustCreate() {
  const navigate = useNavigate();
  const { selectedProjectId } = useProjectsContext();
  const { members } = useTeamMembers(selectedProjectId);
  const { addRequest } = useAdjustRequests();

  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<PickedDate>(todayPicked());
  const [endDate, setEndDate] = useState<PickedDate>(addDays(todayPicked(), 6));
  const [picking, setPicking] = useState<"start" | "end" | null>(null);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("20:00");
  const [excluded, setExcluded] = useState<string[]>([]);

  const allSelected = excluded.length === 0 && members.length > 0;

  function toggleMember(id: string) {
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }
  function toggleAll() {
    setExcluded(allSelected ? members.map((m) => m.id) : []);
  }

  const canSubmit = title.trim().length > 0 && excluded.length < members.length;

  function handleSubmit() {
    if (!canSubmit) return;
    addRequest({
      title: title.trim(),
      startDate: pickedToDateStr(startDate),
      endDate: pickedToDateStr(endDate),
      startTime,
      endTime,
      memberIds: [ME_ID, ...members.filter((m) => !excluded.includes(m.id)).map((m) => m.id)],
    });
    navigate("/calendar/adjust");
  }

  return (
    <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      {/* 헤더 */}
      <header
        className="flex shrink-0 items-center px-4 py-4"
        style={{ borderBottom: `1px solid ${SURFACE_HIGH}` }}
      >
        <button onClick={() => navigate(-1)} className="grid size-9 place-items-center active:opacity-50" aria-label="뒤로">
          <ChevronLeft size={22} color={FG} />
        </button>
        <h1 className="flex-1 text-center text-[17px] font-bold">일정 조정하기</h1>
        <span className="size-9" />
      </header>

      <div className="flex-1 px-5 pb-6 pt-6">
        {/* 제목 */}
        <label className="mb-2 block text-[13px] font-bold" style={{ color: FG50 }}>
          제목
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 정기 회의 시간 정하기"
          className="w-full rounded-2xl px-4 py-4 text-[15px] outline-none"
          style={{ background: SURFACE, color: FG }}
        />

        {/* 날짜 범위 */}
        <label className="mb-2 mt-6 block text-[13px] font-bold" style={{ color: FG50 }}>
          날짜 범위
        </label>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: SURFACE }}>
          <RangeField label="시작" value={formatPicked(startDate)} onClick={() => setPicking("start")} />
          <ArrowRight size={16} color={FG35} className="shrink-0" />
          <RangeField label="종료" value={formatPicked(endDate)} onClick={() => setPicking("end")} />
        </div>

        {/* 시간 범위 */}
        <label className="mb-2 mt-6 block text-[13px] font-bold" style={{ color: FG50 }}>
          시간 범위
        </label>
        <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: SURFACE }}>
          <RangeField label="시작">
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full bg-transparent text-[17px] font-bold outline-none"
              style={{ color: FG, colorScheme: "dark" }}
            />
          </RangeField>
          <ArrowRight size={16} color={FG35} className="shrink-0" />
          <RangeField label="종료">
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-transparent text-[17px] font-bold outline-none"
              style={{ color: FG, colorScheme: "dark" }}
            />
          </RangeField>
        </div>

        {/* 공유할 팀원 */}
        <div className="mb-2 mt-6 flex items-center justify-between">
          <span className="text-[13px] font-bold" style={{ color: FG50 }}>공유할 팀원</span>
          <button onClick={toggleAll} className="text-[13px] font-bold active:opacity-60" style={{ color: LIME }}>
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>

        {members.length === 0 ? (
          <p className="rounded-2xl px-4 py-8 text-center text-[12px]" style={{ background: SURFACE, color: FG35 }}>
            공유할 팀원이 없어요
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {members.map((m) => {
              const on = !excluded.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleMember(m.id)}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-opacity active:opacity-70"
                  style={{ background: SURFACE }}
                >
                  <span
                    className="grid size-11 shrink-0 place-items-center rounded-full text-[15px] font-bold"
                    style={{
                      background: on ? LIME : SURFACE_HIGH,
                      color: on ? INK : FG35,
                    }}
                  >
                    {m.letter}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold" style={{ color: on ? FG : FG50 }}>
                      {m.name}
                    </span>
                    <span className="block truncate text-[12px]" style={{ color: FG35 }}>
                      {m.role}
                    </span>
                  </span>
                  <span
                    className="grid size-6 shrink-0 place-items-center rounded-full"
                    style={{
                      background: on ? LIME : "transparent",
                      border: on ? "none" : `1.5px solid ${FG35}`,
                    }}
                  >
                    {on && <Check size={14} strokeWidth={3} color={INK} />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 요청 생성 */}
      <div className="sticky bottom-0 shrink-0 px-5 pb-8 pt-3" style={{ background: INK }}>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: canSubmit ? "#fff" : SURFACE_HIGH, color: canSubmit ? INK : FG35 }}
        >
          이 시간으로 일정 조정하기
        </button>
      </div>

      {picking && (
        <DatePickerSheet
          selected={picking === "start" ? startDate : endDate}
          onSelect={(d) => (picking === "start" ? setStartDate(d) : setEndDate(d))}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  );
}
