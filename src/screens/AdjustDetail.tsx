import { useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSchedulesContext } from "@/data/SchedulesContext";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useTeamMembers } from "@/data/useTeamMembers";
import { useProfile } from "@/data/useProfile";
import {
  ME_ID,
  cellAvailability,
  recommendSlots,
  requestDays,
  requestHours,
  slotKey,
  useAdjustRequests,
  type AdjustRequest,
} from "@/data/AdjustRequestsContext";

// 일정 조정 상세 — 내가 아직 가능 시간을 안 냈으면 "가능한 시간 등록"(주간 그리드
// 칠하기), 냈으면 "가능한 시간 확인"(추천 시간 + 전체 시간 대조 진입)을 보여준다.

const INK = "#1C1C1E";
const FG = "#F0F0EC";
const FG50 = "rgba(240,240,236,0.5)";
const FG35 = "rgba(240,240,236,0.35)";
const SURFACE = "rgba(240,240,236,0.06)";
const SURFACE_HIGH = "rgba(240,240,236,0.12)";
const LIME = "#CFF665";

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function weekdayOf(dateStr: string): string {
  return WEEKDAY_KO[new Date(dateStr + "T00:00:00").getDay()];
}
function hh(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
function slotLabel(date: string, hour: number): string {
  const d = new Date(date + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()} ${hh(hour)} – ${hh(hour + 1)}`;
}

// ── 공용 조각 ─────────────────────────────────────────────────────────────────

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flex shrink-0 items-center px-4 py-4" style={{ borderBottom: `1px solid ${SURFACE_HIGH}` }}>
      <button onClick={onBack} className="grid size-9 place-items-center active:opacity-50" aria-label="뒤로">
        <ChevronLeft size={22} color={FG} />
      </button>
      <h1 className="flex-1 text-center text-[17px] font-bold">{title}</h1>
      <span className="size-9" />
    </header>
  );
}

/** 요일·날짜 헤더 + 시간 라벨이 붙은 주간 그리드 — 칸 렌더링은 호출부가 정한다. */
function TimeGrid({ req, renderCell }: { req: AdjustRequest; renderCell: (key: string) => ReactNode }) {
  const days = requestDays(req);
  const hours = requestHours(req);
  return (
    <div>
      <div className="mb-1.5 flex">
        <span className="w-12 shrink-0" />
        {days.map((date) => (
          <span key={date} className="flex-1 text-center">
            <span className="block text-[12px] font-bold" style={{ color: FG }}>{weekdayOf(date)}</span>
            <span className="block text-[10px]" style={{ color: FG35 }}>{Number(date.slice(8))}</span>
          </span>
        ))}
      </div>
      {hours.map((hour) => (
        <div key={hour} className="flex">
          <span className="w-12 shrink-0 pr-2 pt-0 text-right text-[10px] leading-none" style={{ color: FG35 }}>
            {hh(hour)}
          </span>
          {days.map((date) => (
            <span key={date} className="h-10 flex-1">{renderCell(slotKey(date, hour))}</span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 시간 확정 — 캘린더에 미팅으로 등록하고 요청을 마감 처리한다. */
function useFinalize(req: AdjustRequest | undefined) {
  const navigate = useNavigate();
  const { addSchedule } = useSchedulesContext();
  const { closeRequest } = useAdjustRequests();
  const { projects, selectedProjectId } = useProjectsContext();

  return async (date: string, hour: number) => {
    if (!req) return;
    const project = projects.find((p) => p.id === selectedProjectId) ?? projects[0];
    await addSchedule({
      projectId: project?.id ?? "",
      projectName: project?.name,
      title: req.title,
      date,
      startTime: hh(hour),
      endTime: hh(hour + 1),
      type: "meeting",
      reminder: false,
    });
    closeRequest(req.id);
    navigate("/calendar");
  };
}

function useMemberName() {
  const { members } = useTeamMembers(null);
  const { profile } = useProfile();
  return (id: string) => (id === ME_ID ? profile.name : members.find((m) => m.id === id)?.name ?? "팀원");
}

// ── 가능한 시간 등록 (칠하기) ─────────────────────────────────────────────────

function PaintView({ req, onSubmitted }: { req: AdjustRequest; onSubmitted: () => void }) {
  const navigate = useNavigate();
  const { schedules } = useSchedulesContext();
  const { submitAvailability } = useAdjustRequests();

  // 첫 진입이면 내 캘린더 기준으로 비어 있는 칸을 미리 칠해둔다.
  const [slots, setSlots] = useState<Set<string>>(() => {
    const mine = req.submissions[ME_ID];
    if (mine) return new Set(mine);
    const prefill = new Set<string>();
    for (const date of requestDays(req)) {
      for (const hour of requestHours(req)) {
        const busy = schedules.some((s) => {
          if (s.date !== date) return false;
          const start = Number(s.startTime.slice(0, 2)) * 60 + Number(s.startTime.slice(3));
          const end = Number(s.endTime.slice(0, 2)) * 60 + Number(s.endTime.slice(3));
          return start < (hour + 1) * 60 && end > hour * 60;
        });
        if (!busy) prefill.add(slotKey(date, hour));
      }
    }
    return prefill;
  });

  // paintMode: 드래그를 시작한 칸을 기준으로 이번 드래그에서 "칠할지/지울지"를 고정한다.
  const [paintMode, setPaintMode] = useState<"add" | "remove" | null>(null);
  const paintedRef = useRef<Set<string>>(new Set());

  function setSlot(key: string, mode: "add" | "remove") {
    setSlots((prev) => {
      const has = prev.has(key);
      if (mode === "add" ? has : !has) return prev;
      const next = new Set(prev);
      if (mode === "add") next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function startPaint(key: string) {
    const mode: "add" | "remove" = slots.has(key) ? "remove" : "add";
    setPaintMode(mode);
    paintedRef.current = new Set([key]);
    setSlot(key, mode);
  }

  function continuePaint(key: string) {
    if (!paintMode || paintedRef.current.has(key)) return;
    paintedRef.current.add(key);
    setSlot(key, paintMode);
  }

  function endPaint() {
    setPaintMode(null);
  }

  function keyFromPoint(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y);
    const cell = el?.closest("[data-slot-key]") as HTMLElement | null;
    return cell?.dataset.slotKey ?? null;
  }

  return (
    <div
      className="flex min-h-full flex-col select-none"
      style={{ background: INK, color: FG }}
      onMouseUp={endPaint}
      onMouseLeave={endPaint}
      onTouchEnd={endPaint}
      onTouchCancel={endPaint}
    >
      <Header title="가능한 시간 등록" onBack={() => navigate("/calendar/adjust")} />

      <div className="flex-1 px-5 pb-4 pt-6">
        <p className="text-[16px] font-bold">되는 시간을 칠해주세요.</p>
        <p className="mt-1.5 text-[12px]" style={{ color: FG50 }}>
          캘린더 기준으로 먼저 채웠어요. 눌러서 수정하거나 슬라이드로 칠하세요.
        </p>

        <div className="mt-6">
          <TimeGrid
            req={req}
            renderCell={(key) => (
              <button
                data-slot-key={key}
                onMouseDown={() => startPaint(key)}
                onMouseEnter={() => paintMode && continuePaint(key)}
                onTouchStart={() => startPaint(key)}
                onTouchMove={(e) => {
                  e.preventDefault();
                  const t = e.touches[0];
                  const k = t && keyFromPoint(t.clientX, t.clientY);
                  if (k) continuePaint(k);
                }}
                className="block size-full p-[1.5px]"
                aria-label={key}
                style={{ border: `0.5px solid ${SURFACE_HIGH}`, touchAction: "none" }}
              >
                <span
                  className="block size-full rounded-md transition-colors"
                  style={{ background: slots.has(key) ? LIME : "transparent" }}
                />
              </button>
            )}
          />
        </div>

        <p className="mt-4 text-center text-[12px]" style={{ color: FG35 }}>
          칸을 눌러 추가 · 다시 눌러 삭제 · 슬라이드로 여러 칸 한번에
        </p>
      </div>

      <div className="sticky bottom-0 shrink-0 px-5 pb-8 pt-3" style={{ background: INK }}>
        <button
          onClick={() => {
            submitAvailability(req.id, ME_ID, [...slots]);
            onSubmitted();
          }}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: "#fff", color: INK }}
        >
          제출하기
        </button>
      </div>
    </div>
  );
}

// ── 가능한 시간 확인 (추천 시간) ──────────────────────────────────────────────

function ResultView({ req, onEdit }: { req: AdjustRequest; onEdit: () => void }) {
  const navigate = useNavigate();
  const finalize = useFinalize(req);
  const nameOf = useMemberName();

  const total = req.memberIds.length;
  const submitted = Object.keys(req.submissions);
  const missing = req.memberIds.filter((id) => !(id in req.submissions));
  const slots = useMemo(() => recommendSlots(req), [req]);
  const best = slots[0]?.count ?? 0;
  const [selectedKey, setSelectedKey] = useState<string | null>(slots.find((s) => s.count === best)?.key ?? null);
  const selected = slots.find((s) => s.key === selectedKey) ?? null;

  return (
    <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      <Header title="가능한 시간 확인" onBack={() => navigate("/calendar/adjust")} />

      <div className="flex-1 px-5 pb-4 pt-6">
        {/* 겹쳐본 현황 + 전체 시간 대조 진입 */}
        <button
          onClick={() => navigate(`/calendar/adjust/${req.id}/heatmap`)}
          className="flex w-full items-center justify-between gap-3 text-left active:opacity-60"
        >
          <span>
            <span className="block text-[15px] font-medium" style={{ color: FG }}>
              {missing.length === 0
                ? `팀원 ${total}명의 일정을 겹쳐봤어요`
                : `현재 팀원 ${submitted.length}명의 일정을 겹쳐봤어요.`}
            </span>
            {missing.length > 0 && (
              <span className="mt-1 block text-[13px]" style={{ color: FG50 }}>
                {missing.map(nameOf).join(", ")} 미등록
              </span>
            )}
          </span>
          <ChevronRight size={18} color={FG50} className="shrink-0" />
        </button>

        <p className="mb-3 mt-8 text-[13px] font-bold" style={{ color: FG50 }}>추천 시간</p>
        <div className="flex flex-col gap-3">
          {slots.length === 0 && (
            <p className="rounded-2xl px-4 py-8 text-center text-[12px]" style={{ background: SURFACE, color: FG35 }}>
              아직 제출된 가능 시간이 없어요
            </p>
          )}
          {slots.map((slot) => {
            const enabled = slot.count === best;
            const on = slot.key === selectedKey;
            return (
              <button
                key={slot.key}
                disabled={!enabled}
                onClick={() => setSelectedKey(slot.key)}
                className="flex items-center gap-3.5 rounded-2xl px-4 py-4 text-left"
                style={{ border: `1.5px solid ${on ? "#fff" : enabled ? "rgba(240,240,236,0.3)" : SURFACE_HIGH}` }}
              >
                <span
                  className="grid size-5 shrink-0 place-items-center rounded-full"
                  style={{ border: `1.5px solid ${on ? "#fff" : FG35}` }}
                >
                  {on && <span className="size-2.5 rounded-full bg-white" />}
                </span>
                <span className="flex-1 text-[15px] font-bold" style={{ color: enabled ? FG : FG35 }}>
                  {slotLabel(slot.date, slot.hour)}
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[12px]" style={{ color: enabled ? FG50 : FG35 }}>
                    {slot.count}/{total}명
                  </span>
                  {!enabled && slot.unavailable.length > 0 && (
                    <span className="mt-0.5 block text-[11px]" style={{ color: FG35 }}>
                      {slot.unavailable.map(nameOf).join(", ")} 불가
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="sticky bottom-0 flex shrink-0 flex-col gap-2.5 px-5 pb-8 pt-3" style={{ background: INK }}>
        <button
          onClick={onEdit}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: SURFACE_HIGH, color: FG }}
        >
          수정하기
        </button>
        <button
          disabled={!selected}
          onClick={() => selected && finalize(selected.date, selected.hour)}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: selected ? "#fff" : SURFACE_HIGH, color: selected ? INK : FG35 }}
        >
          이 시간으로 일정 조정하기
        </button>
      </div>
    </div>
  );
}

// ── 상세 (칠하기/확인 분기) ───────────────────────────────────────────────────

export default function AdjustDetail() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { requests } = useAdjustRequests();
  const req = requests.find((r) => r.id === requestId);
  const [editing, setEditing] = useState(false);

  if (!req) {
    return (
      <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
        <Header title="일정 조정하기" onBack={() => navigate("/calendar/adjust")} />
        <p className="px-5 pt-10 text-center text-[13px]" style={{ color: FG35 }}>요청을 찾을 수 없어요</p>
      </div>
    );
  }

  const mineSubmitted = ME_ID in req.submissions;
  return mineSubmitted && !editing
    ? <ResultView req={req} onEdit={() => setEditing(true)} />
    : <PaintView req={req} onSubmitted={() => setEditing(false)} />;
}

// ── 전체 시간 대조 (히트맵) ───────────────────────────────────────────────────

export function AdjustHeatmap() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { requests } = useAdjustRequests();
  const req = requests.find((r) => r.id === requestId);
  const finalize = useFinalize(req);

  const avail = useMemo(() => (req ? cellAvailability(req) : new Map<string, string[]>()), [req]);
  const best = useMemo(() => (req ? recommendSlots(req, 1)[0] ?? null : null), [req]);

  if (!req) {
    return (
      <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
        <Header title="전체 시간 대조" onBack={() => navigate("/calendar/adjust")} />
        <p className="px-5 pt-10 text-center text-[13px]" style={{ color: FG35 }}>요청을 찾을 수 없어요</p>
      </div>
    );
  }

  const total = req.memberIds.length;
  const submitted = Object.keys(req.submissions).length;

  function cellColor(count: number): string {
    if (count === 0) return "rgba(240,246,236,0.05)";
    return `rgba(207,246,101,${(0.15 + 0.85 * (count / total)).toFixed(2)})`;
  }

  return (
    <div className="flex min-h-full flex-col" style={{ background: INK, color: FG }}>
      <Header title="전체 시간 대조" onBack={() => navigate(`/calendar/adjust/${req.id}`)} />

      <div className="flex-1 px-5 pb-4 pt-6">
        <p className="text-[16px] font-bold">팀원 {submitted}명이 되는 시간을 겹쳐봤어요</p>
        <p className="mt-1.5 text-[12px]" style={{ color: FG50 }}>칸이 진할수록 많은 사람이 가능해요</p>

        <div className="mt-5">
          <TimeGrid
            req={req}
            renderCell={(key) => {
              const count = avail.get(key)?.length ?? 0;
              const isBest = best?.key === key;
              return (
                <span className="block size-full p-[2px]">
                  <span
                    className="block size-full rounded-md"
                    style={{
                      background: cellColor(count),
                      boxShadow: isBest ? "0 0 0 2px #fff" : undefined,
                    }}
                  />
                </span>
              );
            }}
          />
        </div>

        {/* 범례 */}
        <div className="mt-4 flex items-center justify-end gap-1.5">
          <span className="text-[11px]" style={{ color: FG35 }}>적음</span>
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className="size-4 rounded"
              style={{ background: `rgba(207,246,101,${0.15 + 0.85 * (step / 5)})` }}
            />
          ))}
          <span className="text-[11px] font-bold" style={{ color: FG }}>전원</span>
          <span className="text-[11px]" style={{ color: FG35 }}>({best?.count ?? 0}/{total})</span>
        </div>

        {best && (
          <div
            className="mt-5 flex items-center justify-between gap-3 rounded-2xl px-4 py-4"
            style={{ border: `1.5px solid ${LIME}` }}
          >
            <div>
              <p className="text-[12px]" style={{ color: FG50 }}>
                {best.count === total ? "전원이 가능한 시간" : "가장 많이 가능한 시간"}
              </p>
              <p className="mt-1 text-[16px] font-bold">
                {weekdayOf(best.date)} {Number(best.date.slice(5, 7))}.{best.date.slice(8)} · {hh(best.hour)} – {hh(best.hour + 1)}
              </p>
            </div>
            <span className="shrink-0 text-[17px] font-black" style={{ color: LIME }}>
              {best.count}/{total}
            </span>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 shrink-0 px-5 pb-8 pt-3" style={{ background: INK }}>
        <button
          disabled={!best}
          onClick={() => best && finalize(best.date, best.hour)}
          className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: best ? "#fff" : SURFACE_HIGH, color: best ? INK : FG35 }}
        >
          이 시간으로 일정 등록
        </button>
      </div>
    </div>
  );
}
