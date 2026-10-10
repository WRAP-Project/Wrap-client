import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, ChevronDown, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { buildCalendar } from "@/lib/calendarGrid";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import {
  daysLeft,
  ddayLabel,
  SCHEDULE_TITLE_MAX,
  type ReminderChecklistItem,
  type ReminderChecklistState,
  type Schedule,
  type ScheduleDraft,
} from "@/data/useSchedules";
import { useSchedulesContext } from "@/data/SchedulesContext";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useCalendarItems, type CalendarMilestoneItem } from "@/data/useCalendarItems";
import { useProjectMilestones, type MilestoneView } from "@/data/MilestonesContext";
import { useCalendarRiskChecks, type CalendarRiskSignal } from "@/data/useCalendarRiskChecks";
import { serverIdOf } from "@/data/useProjects";
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
// 화면 배경은 ProjectDetail/CreateProject와 같은 계열(#1C1C1E). 등록·선택
// 바텀시트는 한 단계 밝은 #2C2C2E로 띄운다 — 이 화면 전용 톤이라 chatShared
// 팔레트는 쓰지 않는다.

const INK = "#1C1C1E";
/** 바텀시트 바닥 — 화면 배경보다 한 단계 밝아 떠 있는 느낌을 준다. */
const SHEET = "#2C2C2E";
/** 시트 안에서 한 단계 더 올라온 면(선택 항목 카드 등) */
const SHEET_ROW = "#3A3A3C";
/** 시트 안 구분선 */
const SHEET_LINE = "rgba(240,240,236,0.10)";
/** 선택 강조색 — AdjustCreate/AdjustDetail과 같은 라임 */
const LIME = "#CFF665";
const FG = "#F0F0EC";
const FG70 = "rgba(240,240,236,0.7)";
const FG50 = "rgba(240,240,236,0.5)";
const FG35 = "rgba(240,240,236,0.35)";
const SURFACE = "rgba(240,240,236,0.06)";
const PINK = "#EB3E88";
const BLUE = "#60C8F5";
const PURPLE = "#A78BFA";

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

// ── 스케줄 등록 바텀시트 ──────────────────────────────────────────────────────
// 시안 3장(등록 / 프로젝트 선택 / 마일스톤 선택)을 그대로 옮긴 것이다.
// 세 시트가 서로 포개지므로 선택 시트는 등록 시트 위에 더 높은 z-index로 깐다.

/** 프로젝트 아바타 글자 — "프로젝트 알파"에서 "알"을 뽑는다(마지막 낱말의 첫 글자). */
function projectInitial(name: string): string {
  const last = name.trim().split(/\s+/).pop() ?? "";
  return last.slice(0, 1) || "?";
}

/** 시안 2 — 프로젝트 선택 시트. 검색 + 색상 아바타 + 선택 항목 라임 테두리. */
function ProjectPickerSheet({
  projects,
  selectedId,
  onSelect,
  onClose,
}: {
  projects: { id: string; name: string; color: string }[];
  selectedId: string;
  onSelect: (projectId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === "" ? projects : projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-[28px]"
        style={{ background: SHEET, maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "rgba(240,240,236,0.2)" }} />
          <div className="flex items-center justify-between pb-4">
            <span className="w-10" />
            <span className="text-[16px] font-bold" style={{ color: FG }}>프로젝트 선택</span>
            <button onClick={onClose} className="w-10 text-right text-[14px]" style={{ color: FG50 }}>닫기</button>
          </div>

          <div className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: SHEET_ROW }}>
            <Search size={15} color={FG35} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="프로젝트 검색"
              className="w-full bg-transparent text-[14px] outline-none"
              style={{ color: FG }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-8 [scrollbar-width:none]">
          {filtered.length === 0 ? (
            <p className="pt-10 text-center text-[13px]" style={{ color: FG35 }}>
              {projects.length === 0 ? "참여 중인 프로젝트가 없습니다" : "검색 결과가 없습니다"}
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((p) => {
                const active = p.id === selectedId;
                return (
                  <button
                    key={p.id}
                    onClick={() => { onSelect(p.id); onClose(); }}
                    className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-opacity active:opacity-70"
                    style={{
                      background: active ? "rgba(207,246,101,0.12)" : SHEET_ROW,
                      border: `1.5px solid ${active ? LIME : "transparent"}`,
                    }}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-full text-[13px] font-bold"
                      style={{ background: p.color, color: isBright(p.color) ? INK : "#fff" }}
                    >
                      {projectInitial(p.name)}
                    </span>
                    <span className="text-[15px] font-bold" style={{ color: FG }}>{p.name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 시안 3 — 마일스톤 선택 시트.
 *
 * 시안은 "7.15 – 7.21" 같은 기간과 완료/진행중/예정 3단계를 보여주지만,
 * MilestoneResponse에는 dueDate(목표일) 하나와 status(IN_PROGRESS | DONE)뿐이라
 * 시작일도 "예정" 상태도 서버에 없다. 그래서 날짜는 목표일만 적고, 단계는
 * 목표일 순서에서 파생한다 — 완료된 것은 완료, 남은 것 중 가장 이른 하나가
 * 진행중, 그 뒤는 예정. 서버가 기간/상태를 더 주면 그대로 바꾸면 된다.
 */
type MilestoneStage = "done" | "current" | "upcoming";

function stagesOf(milestones: MilestoneView[]): Map<string, MilestoneStage> {
  const stages = new Map<string, MilestoneStage>();
  let currentTaken = false;
  for (const m of milestones) {
    if (m.done) {
      stages.set(m.id, "done");
    } else if (!currentTaken) {
      stages.set(m.id, "current");
      currentTaken = true;
    } else {
      stages.set(m.id, "upcoming");
    }
  }
  return stages;
}

const STAGE_LABEL: Record<MilestoneStage, string> = {
  done: "완료",
  current: "진행중",
  upcoming: "예정",
};

/** "7.21" — 시안의 날짜 표기. 목표일만 있으므로 기간 대신 한 날짜를 적는다. */
function shortDue(dueDate: string): string {
  const d = new Date(dueDate + "T00:00:00");
  return `${d.getMonth() + 1}.${String(d.getDate()).padStart(2, "0")}`;
}

function MilestonePickerSheet({
  projectName,
  projectColor,
  milestones,
  selectedId,
  onSelect,
  onClose,
}: {
  projectName: string;
  projectColor: string;
  milestones: MilestoneView[];
  selectedId: string | null;
  onSelect: (milestoneId: string | null) => void;
  onClose: () => void;
}) {
  const stages = useMemo(() => stagesOf(milestones), [milestones]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-[28px]"
        style={{ background: SHEET, maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "rgba(240,240,236,0.2)" }} />
          <div className="flex items-center justify-between pb-4">
            <span className="w-10" />
            <span className="text-[16px] font-bold" style={{ color: FG }}>마일스톤 선택</span>
            <button onClick={onClose} className="w-10 text-right text-[14px]" style={{ color: FG50 }}>닫기</button>
          </div>

          {/* 어느 프로젝트의 마일스톤인지 — 시안의 상단 띠 */}
          <div className="mb-4 flex items-center gap-2.5 rounded-2xl px-4 py-3" style={{ background: SHEET_ROW }}>
            <span className="size-5 shrink-0 rounded-full" style={{ background: projectColor }} />
            <span className="text-[14px] font-bold" style={{ color: FG }}>{projectName}</span>
            <span className="text-[12px]" style={{ color: FG50 }}>의 마일스톤</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 [scrollbar-width:none]">
          {milestones.length === 0 ? (
            <p className="pt-10 text-center text-[13px]" style={{ color: FG35 }}>
              이 프로젝트에는 아직 마일스톤이 없습니다
            </p>
          ) : (
            <div className="relative pl-7">
              {/* 타임라인 세로줄 — 첫 점과 마지막 점 사이만 잇는다 */}
              <span
                className="absolute left-[7px] top-6 w-px"
                style={{ background: "rgba(240,240,236,0.18)", bottom: 24 }}
              />
              <div className="flex flex-col gap-2.5">
                {milestones.map((m) => {
                  const stage = stages.get(m.id) ?? "upcoming";
                  const active = m.id === selectedId;
                  return (
                    <div key={m.id} className="relative">
                      <span
                        className="absolute left-[-27px] top-1/2 size-[13px] -translate-y-1/2 rounded-full"
                        style={{
                          background: stage === "done" ? FG35 : stage === "current" ? LIME : "transparent",
                          border: stage === "upcoming" ? "1.5px solid rgba(240,240,236,0.3)" : "none",
                        }}
                      />
                      <button
                        onClick={() => { onSelect(m.id); onClose(); }}
                        className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3 text-left transition-opacity active:opacity-70"
                        style={{
                          background: active ? "rgba(207,246,101,0.12)" : SHEET_ROW,
                          border: `1.5px solid ${active ? LIME : "transparent"}`,
                        }}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[14px] font-bold" style={{ color: stage === "done" ? FG50 : FG }}>
                            {m.title}
                          </span>
                          <span className="mt-0.5 block text-[12px]" style={{ color: FG35 }}>
                            {shortDue(m.dueDate)} 목표
                          </span>
                        </span>
                        <span className="shrink-0 text-[11px]" style={{ color: stage === "current" ? LIME : FG35 }}>
                          {STAGE_LABEL[stage]}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-8 pt-4">
          <button
            onClick={() => { onSelect(null); onClose(); }}
            className="w-full rounded-2xl py-3.5 text-[14px] font-semibold transition-opacity active:opacity-70"
            style={{ background: SURFACE, color: FG70 }}
          >
            마일스톤 없이 등록
          </button>
        </div>
      </div>
    </div>
  );
}

/** 등록 시트의 한 줄 — 라벨 + 값 + 오른쪽 화살표. */
function PickerRow({ label, value, placeholder, onClick }: {
  label: string;
  value: string;
  placeholder: string;
  onClick: () => void;
}) {
  return (
    <div className="border-b py-4" style={{ borderColor: SHEET_LINE }}>
      <label className="mb-2 block text-[12px]" style={{ color: FG35 }}>{label}</label>
      <button onClick={onClick} className="flex w-full items-center justify-between gap-3 active:opacity-60">
        <span className="min-w-0 truncate text-[16px] font-bold" style={{ color: value ? FG : FG35 }}>
          {value || placeholder}
        </span>
        <ChevronRight size={16} color={FG35} />
      </button>
    </div>
  );
}

function RegisterSheet({
  defaultProjectId,
  onClose,
  onSubmit,
}: {
  defaultProjectId: string | null;
  onClose: () => void;
  onSubmit: (draft: ScheduleDraft) => Promise<void>;
}) {
  const { projects } = useProjectsContext();
  const selectableProjects = projects;
  const defaultProject = defaultProjectId && selectableProjects.some((p) => p.id === defaultProjectId)
    ? defaultProjectId
    : selectableProjects[0]?.id ?? "";
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProject);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [milestoneId, setMilestoneId] = useState<string | null>(null);
  const [milestonePickerOpen, setMilestonePickerOpen] = useState(false);
  const [date, setDate] = useState<PickedDate>(todayPicked());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("15:00");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectableProjects.length === 0 || selectableProjects.some((p) => p.id === projectId)) return;
    setProjectId(defaultProject);
  }, [defaultProject, projectId, selectableProjects]);

  const project = selectableProjects.find((p) => p.id === projectId);
  const projectName = project?.name ?? "";
  const milestones = useProjectMilestones(projectId || undefined);
  const milestone = milestones.find((m) => m.id === milestoneId);

  // 프로젝트를 바꾸면 이전 프로젝트의 마일스톤은 더 이상 고를 수 없다.
  // (서버도 projectId와 맞지 않는 milestoneId는 404로 거절한다.)
  useEffect(() => {
    if (milestoneId !== null && !milestones.some((m) => m.id === milestoneId)) setMilestoneId(null);
  }, [milestoneId, milestones]);

  /** startAt/endAt은 같은 날짜라 종료가 시작보다 빠르면 서버의 기간 검증에 걸린다. */
  const timeRangeInvalid = endTime < startTime;
  const canSubmit = title.trim().length > 0 && projectId.length > 0 && !timeRangeInvalid;

  async function handleSubmit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        projectId,
        projectName,
        title: title.trim(),
        date: pickedToDateStr(date),
        startTime,
        endTime,
        // 시안에 유형 선택이 없어 마감으로 고정한다 — ScheduleCreateRequest.type은 필수가 아니지만
        // 비워 보내면 캘린더에서 일정 종류를 구분할 수 없다.
        type: "deadline",
        ...(milestoneId ? { milestoneId } : {}),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full flex-col rounded-t-[28px]"
        style={{ background: SHEET, maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 + 헤더 */}
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "rgba(240,240,236,0.2)" }} />
          <div className="flex items-center justify-between pb-2">
            <span className="w-10" />
            <span className="text-[16px] font-bold" style={{ color: FG }}>스케줄 등록하기</span>
            <button onClick={onClose} className="w-10 text-right text-[14px]" style={{ color: FG50 }}>
              취소
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-2 [scrollbar-width:none]">
          {/* 일정 제목 */}
          <div className="border-b py-4" style={{ borderColor: SHEET_LINE }}>
            <label className="mb-2 block text-[12px]" style={{ color: FG35 }}>
              일정 제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={SCHEDULE_TITLE_MAX}
              placeholder="제목을 입력하세요"
              className="w-full bg-transparent text-[16px] outline-none placeholder:text-[rgba(240,240,236,0.35)]"
              style={{ color: FG }}
            />
          </div>

          <PickerRow
            label="프로젝트"
            value={projectName}
            placeholder="프로젝트를 선택하세요"
            onClick={() => setProjectPickerOpen(true)}
          />

          <PickerRow
            label="마일스톤"
            value={milestone?.title ?? ""}
            placeholder={projectId ? "마일스톤 없이 등록" : "프로젝트를 먼저 선택하세요"}
            onClick={() => { if (projectId) setMilestonePickerOpen(true); }}
          />

          <PickerRow
            label="날짜"
            value={pickedToDateStr(date).replace(/-/g, ".")}
            placeholder=""
            onClick={() => setDatePickerOpen(true)}
          />

          {/* 시간 */}
          <div className="border-b py-4" style={{ borderColor: SHEET_LINE }}>
            <label className="mb-2 block text-[12px]" style={{ color: FG35 }}>
              시간
            </label>
            <div className="flex gap-6">
              <div className="flex-1">
                <span className="mb-1 block text-[11px]" style={{ color: FG35 }}>시작</span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-bold outline-none"
                  style={{ color: FG, colorScheme: "dark" }}
                />
              </div>
              <div className="flex-1 border-l pl-6" style={{ borderColor: SHEET_LINE }}>
                <span className="mb-1 block text-[11px]" style={{ color: FG35 }}>종료</span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-transparent text-[16px] font-bold outline-none"
                  style={{ color: FG, colorScheme: "dark" }}
                />
              </div>
            </div>
            {timeRangeInvalid && (
              <p role="alert" className="mt-2 text-[12px] font-semibold" style={{ color: PINK }}>
                종료 시간이 시작 시간보다 빠릅니다
              </p>
            )}
          </div>
        </div>

        <div className="shrink-0 px-5 pb-8 pt-4">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full rounded-2xl py-4 text-[15px] font-bold transition-opacity active:opacity-70"
            style={{
              background: canSubmit && !submitting ? "#fff" : "rgba(240,240,236,0.15)",
              color: canSubmit && !submitting ? INK : FG35,
            }}
          >
            {submitting ? "등록 중" : "등록하기"}
          </button>
        </div>
      </div>

      {projectPickerOpen && (
        <ProjectPickerSheet
          projects={selectableProjects}
          selectedId={projectId}
          onSelect={setProjectId}
          onClose={() => setProjectPickerOpen(false)}
        />
      )}

      {milestonePickerOpen && (
        <MilestonePickerSheet
          projectName={projectName}
          projectColor={project?.color ?? FALLBACK_COLOR}
          milestones={milestones}
          selectedId={milestoneId}
          onSelect={setMilestoneId}
          onClose={() => setMilestonePickerOpen(false)}
        />
      )}

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

/**
 * 체크리스트 한 줄 — 내용과 [완료 | Block] 선택 버튼.
 *
 * 셋 중 하나다: 완료 / 막힘 / 어느 쪽도 아님(진행 중). 고른 버튼을 한 번 더 누르면
 * 진행 중으로 돌아간다 — 실수로 누른 Block을 취소할 수 있어야 상단 막힘 신호 건수도
 * 다시 줄일 수 있다.
 */
function ChecklistRow({
  item, bright, onChange,
}: {
  item: ReminderChecklistItem;
  bright: boolean;
  onChange: (state: ReminderChecklistState) => void | Promise<void>;
}) {
  const done = item.state === "done";
  const blocked = item.state === "blocked";
  const canUpdate = item.sourceType !== "aiUpdate";
  const canBlock = item.sourceType === "task";
  // 카드 배경이 밝으면(라임) 잉크색으로, 어두우면 흰색으로 대비를 잡는다.
  const ink = bright ? INK : "#fff";
  const muted = bright ? "rgba(28,28,30,0.45)" : "rgba(255,255,255,0.6)";

  /** 같은 버튼을 다시 누르면 해제 — 진행 중으로 돌아간다. */
  function pick(next: ReminderChecklistState) {
    void onChange(item.state === next ? "inProgress" : next);
  }

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-bold" style={{ color: ink }}>
          {item.title}
        </p>
        <p
          className="mt-0.5 truncate text-[11px] font-semibold"
          style={{ color: blocked ? PINK : muted }}
        >
          {item.assignee ? `${item.statusLabel} · ${item.assignee}` : item.statusLabel}
        </p>
      </div>

      <div
        className="flex shrink-0 overflow-hidden rounded-lg"
        style={{ border: `1px solid ${bright ? "rgba(28,28,30,0.25)" : "rgba(255,255,255,0.25)"}` }}
      >
        <button
          onClick={() => pick("done")}
          disabled={!canUpdate}
          aria-pressed={done}
          className="px-3 py-1.5 text-[12px] font-bold transition-colors enabled:active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: done ? INK : "transparent", color: done ? "#fff" : ink }}
        >
          완료
        </button>
        <button
          onClick={() => pick("blocked")}
          disabled={!canBlock}
          aria-pressed={blocked}
          className="px-3 py-1.5 text-[12px] font-bold transition-colors enabled:active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: blocked ? PINK : "transparent",
            color: blocked ? "#fff" : ink,
            borderLeft: `1px solid ${bright ? "rgba(28,28,30,0.25)" : "rgba(255,255,255,0.25)"}`,
          }}
        >
          Block
        </button>
      </div>
    </div>
  );
}

function ReminderCard({
  schedule, color, open, onToggleOpen, onChangeItem,
}: {
  schedule: Schedule;
  color: string;
  open: boolean;
  onToggleOpen: () => void;
  onChangeItem: (itemId: string, state: ReminderChecklistState) => void | Promise<void>;
}) {
  const bright = isBright(color);
  const hasBlocked = schedule.reminderChecklist?.some((i) => i.state === "blocked") ?? false;

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
          {schedule.description && (
            <p
              className="whitespace-pre-wrap text-[13px]"
              style={{ color: bright ? "rgba(28,28,30,0.7)" : "rgba(255,255,255,0.8)" }}
            >
              {schedule.description}
            </p>
          )}
          {schedule.reminderChecklist?.length ? (
            schedule.reminderChecklist.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                bright={bright}
                onChange={(state) => onChangeItem(item.id, state)}
              />
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

function MilestoneCalendarCard({
  item,
  color,
  onOpen,
}: {
  item: CalendarMilestoneItem;
  color: string;
  onOpen: () => void;
}) {
  const bright = isBright(color);
  const { milestone } = item;
  const ink = bright ? INK : "#fff";
  const muted = bright ? "rgba(28,28,30,0.55)" : "rgba(255,255,255,0.7)";
  const status = milestone.done
    ? "달성"
    : milestone.totalCount === 0
      ? "연결된 일정 없음"
      : `일정 ${milestone.doneCount}/${milestone.totalCount} 완료`;

  return (
    <button
      onClick={onOpen}
      className="w-full rounded-3xl rounded-tl-lg px-5 py-4 text-left transition-opacity active:opacity-70"
      style={{ background: color }}
      aria-label={`${milestone.title} 마일스톤 상세 보기`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-black" style={{ color: muted }}>
            {ddayLabel(milestone.dueDate)} · 마일스톤
          </p>
          <p className="mt-0.5 truncate text-[16px] font-bold" style={{ color: ink }}>
            {milestone.title}
          </p>
          <p className="mt-0.5 truncate text-[12px]" style={{ color: muted }}>
            {status}
          </p>
        </div>
        <ChevronRight size={18} className="mt-1 shrink-0" color={muted} />
      </div>
      <div
        className="relative mt-4 h-1.5 overflow-hidden rounded-full"
        style={{ background: bright ? "rgba(28,28,30,0.14)" : "rgba(255,255,255,0.2)" }}
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${milestone.readyPercent}%`, background: ink }}
        />
      </div>
    </button>
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
  const { schedules, addSchedule, setChecklistState, loading: schedulesLoading, error: schedulesError } = useSchedulesContext();
  const { projects, selectedProjectId, selectProject, loading: projectsLoading } = useProjectsContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const registerParam = searchParams.get("register") === "1";
  const reminderParam = searchParams.get("reminder") === "1";
  const [queryProjectId] = useState(() => searchParams.get("project"));
  const [openReminderOnLoad] = useState(reminderParam);
  const openedReminderFromQuery = useRef(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  /** null이면 날짜 선택 해제 — 마감 리마인드는 다시 전체(다가오는 순)로 돌아간다. */
  const [selectedDay, setSelectedDay] = useState<PickedDate | null>(() => reminderParam ? null : todayPicked());
  const [activeTab, setActiveTab] = useState<TabId>("mine");
  /**
   * 프로젝트 상세의 "일정 추가"가 /calendar?register=1&project=<id>로 넘어온다.
   * 등록 시트는 이 화면 안의 상태라 라우트로 못 여니 쿼리로 받는다.
   * 한 번 읽고 쿼리는 지운다 — 남겨두면 시트를 닫고 뒤로가기 했을 때 다시 열린다.
   */
  // 쿼리를 지우기 전에 첫 렌더에서 한 번 붙잡아 둔다.
  const [registerProjectId] = useState(queryProjectId);
  const [registerOpen, setRegisterOpen] = useState(registerParam);

  useEffect(() => {
    if (!registerParam && !reminderParam) return;
    if (registerParam) setRegisterOpen(true);
    setSearchParams({}, { replace: true });
  }, [registerParam, reminderParam, setSearchParams]);
  /** 펼쳐진 마감 리마인드 카드 — 한 번에 하나만 */
  const [openReminderId, setOpenReminderId] = useState<string | null>(null);
  const [blockedOpen, setBlockedOpen] = useState(false);
  /**
   * null이면 전체 프로젝트 — 상단 원형 프로젝트를 누르면 해당 프로젝트만 본다.
   * 기본값은 채팅 탭과 동일하게 홈에서 선택한 프로젝트(전역 선택 상태).
   */
  const [filterProjectId, setFilterProjectId] = useState<string | null>(queryProjectId ?? selectedProjectId);
  const calendarProjects = projects;
  const { items: calendarItems, milestoneItems, milestonesLoading, milestonesError } = useCalendarItems(filterProjectId);
  const { signals: riskSignals } = useCalendarRiskChecks(filterProjectId);

  useEffect(() => {
    if (projectsLoading || !filterProjectId || calendarProjects.some((p) => p.id === filterProjectId)) return;
    setFilterProjectId(null);
  }, [calendarProjects, filterProjectId, projectsLoading]);

  /** 캘린더 탭에서 고른 프로젝트도 전역 선택 상태에 반영한다. */
  function pickProject(id: string | null) {
    setFilterProjectId(id);
    selectProject(id);
  }

  const filterColor = calendarProjects.find((p) => p.id === filterProjectId)?.color ?? null;

  /** 일정 색은 상단 원형 아이콘과 동일하게 프로젝트 색을 따른다. */
  function colorOfProject(id: string): string {
    return calendarProjects.find((p) => p.id === id)?.color ?? FALLBACK_COLOR;
  }

  const cells = buildCalendar(viewYear, viewMonth);

  const visibleSchedules = filterProjectId
    ? schedules.filter((s) => s.projectId === filterProjectId)
    : schedules;

  const itemsByDate = new Map<string, typeof calendarItems>();
  for (const item of calendarItems) {
    const list = itemsByDate.get(item.date) ?? [];
    list.push(item);
    itemsByDate.set(item.date, list);
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

  /**
   * 날짜를 고르면 그 날짜의 일정 전부, 선택을 풀면 다가오는 일정 전부.
   * 리마인드 여부로 거르지 않는다 — 등록한 일정은 언제나 이 목록에 보여야 한다.
   */
  const selectedDateStr = selectedDay ? pickedToDateStr(selectedDay) : null;
  const listedSchedules = selectedDateStr
    ? visibleSchedules.filter((s) => s.date === selectedDateStr)
    : [...visibleSchedules]
        .filter((s) => daysLeft(s.date) >= 0)
        .sort((a, b) => daysLeft(a.date) - daysLeft(b.date));
  const visibleMilestones = selectedDateStr
    ? milestoneItems.filter((item) => item.date === selectedDateStr)
    : [...milestoneItems]
        .filter((item) => daysLeft(item.date) >= 0)
        .sort((a, b) => daysLeft(a.date) - daysLeft(b.date));

  useEffect(() => {
    if (!openReminderOnLoad || openedReminderFromQuery.current || schedulesLoading || listedSchedules.length === 0) return;
    openedReminderFromQuery.current = true;
    setOpenReminderId(listedSchedules[0].id);
  }, [openReminderOnLoad, listedSchedules, schedulesLoading]);

  /** 팀원 일정 탭은 "선택 없음" 상태가 없다 — 선택이 풀려 있으면 오늘 기준. */
  const teamDate = selectedDay ?? todayPicked();
  const { rows: teamRows } = useTeamDaySchedule(filterProjectId, pickedToDateStr(teamDate));

  async function handleRegister(draft: ScheduleDraft) {
    try {
      await addSchedule(draft);
      setRegisterOpen(false);
    } catch {
      alert("스케줄 등록에 실패했습니다.");
    }
  }

  function handleTabClick(id: TabId) {
    setActiveTab(id);
  }

  /** 전체 일정의 막힘(BLOCK) 체크리스트 항목 + 서버 리스크 체크 — 상단 막힘 신호 배너의 데이터 */
  const isFilteringServerProject = serverIdOf(filterProjectId ?? undefined) !== null;
  const mockBlockedSignals: CalendarRiskSignal[] = isFilteringServerProject
    ? []
    : schedules
        .filter((s) =>
          filterProjectId
            ? s.projectId === filterProjectId
            : serverIdOf(s.projectId) === null,
        )
        .flatMap((s) =>
          (s.reminderChecklist ?? [])
            .filter((i) => i.state === "blocked")
            .map((i) => ({ ...i, assignee: i.assignee ?? "담당자", projectId: s.projectId })),
        );
  const blockedSignals = [...mockBlockedSignals, ...riskSignals];

  // 막힘 건수가 "늘어난" 순간에만 배너를 잠시 강조한다. 줄어들 때(해제)는 그대로 둔다 —
  // 해제는 이미 누른 버튼에서 바로 보이므로 상단까지 끌어올 이유가 없다.
  const [blockedFlash, setBlockedFlash] = useState(false);
  const prevBlockedCount = useRef(blockedSignals.length);
  useEffect(() => {
    const grew = blockedSignals.length > prevBlockedCount.current;
    prevBlockedCount.current = blockedSignals.length;
    if (!grew) return;
    setBlockedFlash(true);
    const timer = setTimeout(() => setBlockedFlash(false), 1500);
    return () => clearTimeout(timer);
  }, [blockedSignals.length]);

  return (
    <div className="relative flex min-h-full flex-col" style={{ background: INK, color: FG }}>
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

      {/*
        막힘 신호 배너 — 화살표를 누르면 담당자 목록이 아래로 펼쳐진다.
        제목 아래에 둔다: 위에 두면 "캘린더"가 아래로 밀려 채팅·마이페이지와
        제목 높이가 어긋난다.
        Block을 눌러 건수가 늘어난 직후에는 잠시 핑크로 발색해서, 화면 아래쪽
        체크리스트를 누른 사람이 상단 변화를 놓치지 않게 한다.
      */}
      {blockedSignals.length > 0 && (
        <button
          onClick={() => setBlockedOpen(true)}
          className="flex shrink-0 items-center justify-between px-5 py-3 transition-colors duration-300"
          style={{
            borderBottom: "1px solid rgba(240,240,236,0.08)",
            background: blockedFlash ? "rgba(236,72,153,0.18)" : "transparent",
          }}
        >
          <span className="flex items-center gap-3">
            <span className="size-4 rounded-full" style={{ background: PINK }} />
            <span className="text-[14px] font-bold" style={{ color: PINK }}>막힘 신호 {blockedSignals.length}건</span>
          </span>
          <ChevronDown size={16} color={FG50} />
        </button>
      )}

      {/* 내 프로젝트 — 누르면 해당 프로젝트 일정만 본다(다시 누르면 전체) */}
      <div className="flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {calendarProjects.map((p) => {
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
              onClick={() => navigate("/calendar/adjust")}
              className="mt-8 w-full rounded-2xl border py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ borderColor: FG35, color: FG }}
            >
              가능한 시간 확인
            </button>
          </>
        ) : calendarItems.length === 0 && !schedulesLoading && !milestonesLoading ? (
          /* ── 빈 상태 ── */
          <div className="flex flex-col items-center gap-6 pt-24 text-center">
            <div>
              <p className="text-[15px] font-bold" style={{ color: FG70 }}>등록된 일정이 없어요</p>
              <p className="mt-1 text-[12px]" style={{ color: FG35 }}>스케줄을 추가해 목표를 관리해보세요</p>
            </div>
            <button
              onClick={() => setRegisterOpen(true)}
              className="w-full rounded-2xl py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ background: SURFACE, color: FG70 }}
            >
              스케줄 등록하기
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
                const dayItems = itemsByDate.get(dateStr) ?? [];
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
                      {dayItems.slice(0, 3).map((item) => (
                        <span key={item.key} className="size-[3px] rounded-full" style={{ background: colorOfProject(item.projectId) }} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 스케줄 등록하기 */}
            <button
              onClick={() => setRegisterOpen(true)}
              className="mt-6 w-full rounded-2xl border py-4 text-[14px] font-bold transition-opacity active:opacity-70"
              style={{ borderColor: FG35, color: FG }}
            >
              스케줄 등록하기
            </button>

            {/* 마일스톤 — 별도 Schedule을 만들지 않고 목표일을 캘린더에 투영한다. */}
            <div className="mt-7">
              <h2 className="mb-3 text-[13px] font-bold" style={{ color: FG50 }}>
                마일스톤{selectedDateStr ? ` · ${selectedDateStr.replace(/-/g, ".")}` : ""}
              </h2>
              {milestonesError && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl px-3 py-2 text-[11px] font-semibold"
                  style={{ background: "rgba(235,62,136,0.14)", color: PINK }}
                >
                  {milestonesError.message}
                </p>
              )}
              {visibleMilestones.length > 0 ? (
                <div className="flex flex-col gap-3.5">
                  {visibleMilestones.map((item) => (
                    <MilestoneCalendarCard
                      key={item.key}
                      item={item}
                      color={colorOfProject(item.projectId)}
                      onOpen={() => navigate(`/project/${item.projectId}/milestone/${item.id}`)}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl px-4 py-6 text-center text-[12px]" style={{ background: SURFACE, color: FG35 }}>
                  {milestonesLoading
                    ? "마일스톤을 불러오는 중이에요"
                    : selectedDateStr
                      ? "이 날짜에는 마일스톤이 없어요"
                      : "다가오는 마일스톤이 없어요"}
                </p>
              )}
            </div>

            {/* 일정 — 선택한 날짜의 일정 전부 */}
            <div className="mt-7">
              <h2 className="mb-3 text-[13px] font-bold" style={{ color: FG50 }}>
                일정{selectedDateStr ? ` · ${selectedDateStr.replace(/-/g, ".")}` : ""}
              </h2>
              {schedulesError && (
                <p
                  role="alert"
                  className="mb-3 rounded-xl px-3 py-2 text-[11px] font-semibold"
                  style={{ background: "rgba(235,62,136,0.14)", color: PINK }}
                >
                  {schedulesError.message}
                </p>
              )}
              {listedSchedules.length > 0 ? (
                /* 왼쪽 세로 레일 + 카드 목록 */
                <div className="relative pl-4">
                  <span
                    className="absolute bottom-1 left-0 top-1 w-[3px] rounded-full"
                    style={{ background: "rgba(240,240,236,0.12)" }}
                  />
                  <div className="flex flex-col gap-3.5">
                    {listedSchedules.map((s) => (
                      <ReminderCard
                        key={s.id}
                        schedule={s}
                        color={colorOfProject(s.projectId)}
                        open={openReminderId === s.id}
                        onToggleOpen={() => setOpenReminderId((cur) => (cur === s.id ? null : s.id))}
                        onChangeItem={(itemId, state) => setChecklistState(s.id, itemId, state)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl px-4 py-6 text-center text-[12px]" style={{ background: SURFACE, color: FG35 }}>
                  {selectedDateStr ? "이 날짜에는 일정이 없어요" : "다가오는 일정이 없어요"}
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
          defaultProjectId={registerProjectId ?? filterProjectId}
          onClose={() => setRegisterOpen(false)}
          onSubmit={handleRegister}
        />
      )}
    </div>
  );
}
