import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import { useMilestoneDetail } from "@/data/useMilestoneDetail";
import { isTaskStalled, TASK_STATUS_LABEL, type Task } from "@/data/useTasks";
import { useProjectsContext } from "@/data/ProjectsContext";
import { ddayLabel } from "@/data/useSchedules";
import { ALERT, DARK_SURFACE, FALLBACK_ACCENT, ON_DARK, onAccentPalette, onDark } from "@/lib/color";

/** 일정 한 줄. 제출물은 목록을 가르지 않고 행 안의 뱃지로만 구분한다. */
function TaskRow({
  task,
  accent,
  onToggle,
}: {
  task: Task;
  accent: string;
  onToggle: (taskId: string) => void;
}) {
  const { title, assignee, status, dueDate, deliverable } = task;
  const onAccent = onAccentPalette(accent);
  const done = status === "DONE";
  const stalled = isTaskStalled(status);
  const inProgress = status === "IN_PROGRESS";

  // 부제는 "마감 · 담당" 순. 둘 다 없으면 상태 문구만 남긴다.
  const subtitle = [dueDate ? ddayLabel(dueDate) : null, assignee?.nickname ?? "담당 미정"]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5" style={{ background: DARK_SURFACE }}>
      {/* 동그라미가 곧 완료 토글이다 — 상태를 바꾸려고 항목을 지웠다 다시 만들지
          않아도 되게. 진행 중 표시도 여기 얹혀 한 번 누르면 완료가 된다. */}
      <button
        onClick={() => onToggle(task.id)}
        aria-label={`${title} ${done ? "완료 해제" : "완료로 표시"}`}
        aria-pressed={done}
        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-opacity active:opacity-60"
        style={
          done
            ? { background: accent }
            : inProgress
              ? { border: `2px solid ${onDark(accent)}` }
              : { border: `2px solid ${ON_DARK.faint}` }
        }
      >
        {done ? (
          <Check size={13} strokeWidth={3} color={onAccent.fg} />
        ) : inProgress ? (
          <div className="w-2 h-2 rounded-full" style={{ background: onDark(accent) }} />
        ) : null}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p
            className="text-[14px] font-semibold truncate"
            style={{
              color: done ? ON_DARK.faint : ON_DARK.fg,
              textDecoration: done ? "line-through" : "none",
            }}
          >
            {title}
          </p>
          {/* 제출물 — 예전엔 이것 때문에 목록을 둘로 쪼갰지만, 조작도 달성
              판정도 같아서 표시만 남겼다. */}
          {deliverable && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded shrink-0"
              style={{ background: ON_DARK.line, color: onDark(accent) }}
            >
              제출물
            </span>
          )}
        </div>
        <p
          className="text-[11px] font-medium truncate"
          style={{ color: stalled ? ALERT : ON_DARK.dim }}
        >
          {subtitle}
        </p>
      </div>
      {/* 보류·검토 필요는 그냥 두면 묻히므로 상태를 따로 띄운다. */}
      {stalled && (
        <span
          className="text-[10px] font-black px-2 py-1 rounded-md shrink-0"
          style={{ background: ALERT, color: onAccentPalette(ALERT).fg }}
        >
          {TASK_STATUS_LABEL[status]}
        </span>
      )}
    </div>
  );
}

function toDateStr({ year, month, day }: PickedDate): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * 일정 추가 바텀시트.
 *
 * 담당자와 우선순위는 받지 않는다 — 서버 기본값(담당 미정 / MEDIUM)으로 두고,
 * 바꿀 일이 생기면 수정 API로 간다. 추가 자리에서 물어볼 게 많아지면 "일단
 * 적어두기"가 안 되고, 마일스톤 상세에서 필요한 건 그 쪽이다.
 */
function AddTaskSheet({
  accent,
  defaultDueDate,
  onSubmit,
  onClose,
}: {
  accent: string;
  /** 마일스톤 목표일 — 일정 마감은 보통 그보다 이르거나 같다 */
  defaultDueDate: string;
  onSubmit: (draft: { title: string; dueDate?: string; deliverable?: boolean }) => Promise<void>;
  onClose: () => void;
}) {
  const onAccent = onAccentPalette(accent);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [deliverable, setDeliverable] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = title.trim();
  const canSubmit = trimmed.length > 0 && !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ title: trimmed, dueDate: dueDate || undefined, deliverable });
      onClose();
    } catch (e) {
      // 시트는 닫지 않는다 — 입력한 내용을 잃지 않고 바로 다시 누를 수 있게.
      setError(e instanceof Error ? e.message : "일정을 추가하지 못했습니다.");
      setSaving(false);
    }
  }

  const picked: PickedDate | null = dueDate
    ? (() => {
        const [y, m, d] = dueDate.split("-").map(Number);
        return { year: y, month: m - 1, day: d };
      })()
    : null;

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
        <p className="text-[15px] font-bold" style={{ color: ON_DARK.fg }}>일정 추가</p>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void submit(); }}
          placeholder="무엇을 언제까지 끝내야 하나요?"
          maxLength={255}
          className="w-full rounded-2xl px-4 py-3.5 text-[14px] font-medium outline-none"
          style={{ background: DARK_SURFACE, color: ON_DARK.fg }}
        />

        <button
          onClick={() => setDatePickerOpen(true)}
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-opacity active:opacity-70"
          style={{ background: DARK_SURFACE }}
        >
          <span className="text-[13px] font-medium" style={{ color: ON_DARK.dim }}>마감일</span>
          <span className="text-[13px] font-semibold" style={{ color: onDark(accent) }}>
            {dueDate || "선택 안 함"}
          </span>
        </button>

        {/* 제출물 — 켜면 목록에서 "제출물" 뱃지가 붙는다 */}
        <button
          onClick={() => setDeliverable((v) => !v)}
          aria-pressed={deliverable}
          className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-opacity active:opacity-70"
          style={{ background: DARK_SURFACE }}
        >
          <span className="text-[13px] font-medium" style={{ color: ON_DARK.dim }}>제출물로 표시</span>
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center"
            style={deliverable ? { background: accent } : { border: `2px solid ${ON_DARK.faint}` }}
          >
            {deliverable && <Check size={12} strokeWidth={3} color={onAccent.fg} />}
          </div>
        </button>

        {error && (
          <p className="text-[12px] font-medium" style={{ color: ALERT }}>{error}</p>
        )}

        <button
          onClick={() => void submit()}
          disabled={!canSubmit}
          className="rounded-2xl py-3.5 text-[15px] font-bold transition-opacity enabled:active:opacity-70 disabled:opacity-40"
          style={{ background: accent, color: onAccent.fg }}
        >
          {saving ? "추가하는 중…" : "추가"}
        </button>
      </div>

      {datePickerOpen && (
        <DatePickerSheet
          selected={picked}
          onSelect={(d) => setDueDate(toDateStr(d))}
          onClose={() => setDatePickerOpen(false)}
        />
      )}
    </div>
  );
}

/** 목록이 비었을 때의 안내 카드 */
function EmptyCard({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "rgba(240,240,236,0.06)" }}>
      <p className="text-[12px] font-semibold" style={{ color: "rgba(240,240,236,0.5)" }}>
        {title}
      </p>
      {hint && (
        <p className="mt-1 text-[11px]" style={{ color: "rgba(240,240,236,0.35)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export default function MilestoneDetail() {
  const { projectId, milestoneId } = useParams<{ projectId: string; milestoneId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const { data, addTask, toggleDone } = useMilestoneDetail(projectId, milestoneId);
  const { exists, header, tasks, doneCount } = data;
  const [addOpen, setAddOpen] = useState(false);

  // 마일스톤은 프로젝트에 속하므로 강조색은 전부 이 프로젝트의 색이다.
  const accent = projects.find((p) => p.id === projectId)?.color ?? FALLBACK_ACCENT;
  const onAccent = onAccentPalette(accent);

  if (!exists) {
    return (
      <div className="min-h-screen flex flex-col px-4 pt-6" style={{ background: "#1C1C1E", color: "#F0F0EC" }}>
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
          aria-label="뒤로가기"
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>
        <p className="pt-16 text-center text-[13px]" style={{ color: "rgba(240,240,236,0.45)" }}>
          {header.title}
        </p>
      </div>
    );
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

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">마일스톤 상세</h1>

        {/* 헤더 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: accent }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: onAccent.veil, color: onAccent.fg }}>
              D-{header.dday} 목표
            </span>
            <span className="text-[11px] font-bold" style={{ color: onAccent.faint }}>
              {header.statusBadge}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[19px] font-bold" style={{ color: onAccent.fg }}>{header.title}</p>
            {/* 목표 설명 — 서버가 비워 보내면 줄 자체가 없다. */}
            {header.description && (
              <p className="text-[13px] font-medium" style={{ color: onAccent.dim }}>
                {header.description}
              </p>
            )}
            <p className="text-[12px] font-medium" style={{ color: onAccent.dim }}>{header.datetime}</p>
          </div>

          <div className="relative h-2 rounded-full mt-1" style={{ background: onAccent.veil }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${header.readyPercent}%`, background: onAccent.fg }}
            />
          </div>
          {/* 준비 진행률 = 연결된 일정의 완료 비율(서버 집계). 100%면 달성이다.
              참여자 수는 칸을 따로 내줄 만큼 무겁지 않아 같은 줄에 붙인다. */}
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold" style={{ color: onAccent.faint }}>
              준비 진행률 {header.readyPercent}%
            </p>
            {header.participantCount > 0 && (
              <p className="text-[11px] font-semibold" style={{ color: onAccent.faint }}>
                참여자 {header.participantCount}명
              </p>
            )}
          </div>
        </div>

        {/* 일정 — 이 마일스톤에 걸린 태스크. 전부 완료되면 달성이다. */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              일정
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold" style={{ color: accent }}>
                {doneCount} / {tasks.length}
              </span>
              <button
                onClick={() => setAddOpen(true)}
                aria-label="일정 추가"
                className="w-6 h-6 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
                style={{ background: accent }}
              >
                <Plus size={14} strokeWidth={3} color={onAccent.fg} />
              </button>
            </div>
          </div>
          {tasks.length === 0 ? (
            <EmptyCard
              title="아직 연결된 일정이 없어요"
              hint="첫 일정을 추가해 보세요"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {tasks.map((task) => (
                <TaskRow key={task.id} task={task} accent={accent} onToggle={toggleDone} />
              ))}
            </div>
          )}
        </section>
      </div>

      {addOpen && (
        <AddTaskSheet
          accent={accent}
          defaultDueDate={header.dueDate}
          onSubmit={addTask}
          onClose={() => setAddOpen(false)}
        />
      )}
    </div>
  );
}
