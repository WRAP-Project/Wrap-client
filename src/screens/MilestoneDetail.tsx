import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Paperclip } from "lucide-react";
import { useMilestoneDetail } from "@/data/useMilestoneDetail";
import { isTaskStalled, TASK_STATUS_LABEL, type Task } from "@/data/useTasks";
import { useProjectsContext } from "@/data/ProjectsContext";
import { ddayLabel } from "@/data/useSchedules";
import { ALERT, DARK_SURFACE, FALLBACK_ACCENT, memberAvatar, ON_DARK, onAccentPalette, onDark } from "@/lib/color";

/**
 * 태스크 한 줄 — "연결된 작업"과 "제출 체크리스트"가 같은 행을 쓴다.
 * 두 목록은 deliverable로 갈린 같은 엔티티라, 생김새와 조작이 달라야 할 이유가 없다.
 */
function TaskRow({
  task,
  accent,
  onToggle,
}: {
  task: Task;
  accent: string;
  onToggle: (taskId: string) => void;
}) {
  const { title, assignee, status, dueDate } = task;
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
        <p
          className="text-[14px] font-semibold truncate"
          style={{
            color: done ? ON_DARK.faint : ON_DARK.fg,
            textDecoration: done ? "line-through" : "none",
          }}
        >
          {title}
        </p>
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
  const { data, toggleDone } = useMilestoneDetail(projectId, milestoneId);
  const { exists, header, stats, linkedTasks, checklist, update } = data;
  const linkedDone = linkedTasks.filter((t) => t.status === "DONE").length;

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
            <p className="text-[12px] font-medium" style={{ color: onAccent.dim }}>{header.datetime}</p>
          </div>

          <div className="relative h-2 rounded-full mt-1" style={{ background: onAccent.veil }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${header.readyPercent}%`, background: onAccent.fg }}
            />
          </div>
          {/* 준비 진행률 = 연결된 작업의 완료 비율(서버 집계). 100%면 달성이다. */}
          <p className="text-[11px] font-semibold" style={{ color: onAccent.faint }}>
            준비 진행률 {header.readyPercent}%
          </p>
        </div>

        {/* 통계 3칸 */}
        {/* 통계 3칸 — 카드를 쪼개지 않고 한 장 안에 나눠 담는다 */}
        <div className="rounded-2xl grid grid-cols-3 py-4" style={{ background: DARK_SURFACE }}>
          {[
            { value: `${stats.checklistDone}/${stats.checklistTotal}`, label: "체크리스트" },
            { value: `${stats.fileCount}개`, label: "첨부 파일" },
            { value: `${stats.participantCount}명`, label: "참여자" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="text-[16px] font-black" style={{ color: onDark(accent) }}>{s.value}</span>
              <span className="text-[10px] font-medium" style={{ color: ON_DARK.faint }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* 연결된 작업 — 이 마일스톤을 이루는 태스크다. 전부 완료되면 달성이다.
            여기서 추가하지 않는다: 태스크 생성 API가 api/openapi.yaml에 아직
            없다(조회·상태변경·삭제만 있다). 생기면 추가 행을 되살린다. */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              연결된 작업
            </p>
            <span className="text-[11px] font-semibold" style={{ color: accent }}>
              {linkedDone} / {linkedTasks.length}
            </span>
          </div>
          {linkedTasks.length === 0 ? (
            <EmptyCard
              title="아직 연결된 작업이 없어요"
              hint="작업이 있어야 달성 여부를 판단할 수 있어요"
            />
          ) : (
            <div className="flex flex-col gap-2">
              {linkedTasks.map((task) => (
                <TaskRow key={task.id} task={task} accent={accent} onToggle={toggleDone} />
              ))}
            </div>
          )}
        </section>

        {/* 제출 체크리스트 — 같은 태스크 중 제출물(deliverable)로 표시된 것.
            달성 판정에도 함께 들어간다(연결된 작업과 같은 엔티티라서). */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              제출 체크리스트
            </p>
            <span className="text-[11px] font-semibold" style={{ color: accent }}>
              {stats.checklistDone} / {stats.checklistTotal}
            </span>
          </div>
          {checklist.length === 0 ? (
            <EmptyCard title="제출물로 표시된 작업이 없어요" />
          ) : (
            <div className="flex flex-col gap-2">
              {checklist.map((task) => (
                <TaskRow key={task.id} task={task} accent={accent} onToggle={toggleDone} />
              ))}
            </div>
          )}
        </section>

        {/* 자료 및 최근 업데이트 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              자료 및 최근 업데이트
            </p>
            <span className="text-[11px] font-semibold" style={{ color: accent }}>
              파일 {stats.fileCount}개
            </span>
          </div>
          {update ? (
            <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: DARK_SURFACE }}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
                style={memberAvatar(accent, "active")}
              >
                {update.author}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium" style={{ color: ON_DARK.fg }}>&ldquo;{update.text}&rdquo;</p>
                <p className="text-[11px] font-medium mt-1" style={{ color: ON_DARK.faint }}>
                  {update.author} · {update.time}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "rgba(240,240,236,0.06)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "rgba(240,240,236,0.5)" }}>
                아직 공유된 업데이트가 없어요
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 하단 고정 액션 */}
      <div className="shrink-0 px-4 pb-8 pt-2 flex gap-3">
        <button
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-opacity active:opacity-70"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <Paperclip size={18} color="#F0F0EC" />
        </button>
        <button
          onClick={() => {
            if (!projectId) return;
            navigate(`/calendar?project=${encodeURIComponent(projectId)}&reminder=1`);
          }}
          disabled={!projectId}
          className="flex-1 rounded-2xl text-[15px] font-bold transition-opacity enabled:active:opacity-70 disabled:opacity-40"
          style={{ background: accent, color: onAccent.fg }}
        >
          체크리스트 업데이트
        </button>
      </div>
    </div>
  );
}
