import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, Plus } from "lucide-react";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useMilestonesContext } from "@/data/MilestonesContext";
import { useProjectDetail } from "@/data/useProjectDetail";
import { ddayLabel } from "@/data/useSchedules";
import { ALERT, FALLBACK_ACCENT, memberAvatar, onAccentPalette, onLight, softBadge } from "@/lib/color";

// ── 섹션 추가 버튼 ────────────────────────────────────────────────────────────
// 섹션마다 "여기에 뭘 넣는다"를 같은 모양으로 보여준다. 새로 만든 프로젝트는
// 모든 섹션이 비어 있으므로, 이 버튼이 없으면 다음에 뭘 해야 할지 알 수 없다.
// 흰 카드 안(onDark=false)과 어두운 배경 위(onDark=true) 두 곳에 쓰인다.

function AddButton({
  label,
  onClick,
  onDark = false,
}: {
  label: string;
  onClick: () => void;
  onDark?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onClick={(e) => {
        // 섹션 카드 전체가 클릭 가능한 경우가 있어 상위로 전파되면 안 된다.
        e.stopPropagation();
        onClick();
      }}
      className="w-7 h-7 shrink-0 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
      style={{ background: onDark ? "rgba(240,240,236,0.10)" : "rgba(28,28,30,0.06)" }}
    >
      <Plus size={15} strokeWidth={2.5} color={onDark ? "#F0F0EC" : "#1C1C1E"} />
    </button>
  );
}

// ── 마일스톤 추가 시트 ────────────────────────────────────────────────────────
// 마일스톤은 팀 공동 목표라 제목과 목표일만 받는다. 담당·완료는 여기서 정하지
// 않는다 — 마일스톤에 일정을 연결하면 그 일정의 담당·완료에서 파생된다.
//
// 캘린더로 보내지 않고 이 화면 안에서 끝내는 건, 캘린더 등록 폼이 개인 일정용
// (시각·리마인드·담당이 있는)이라 팀 목표와 성격이 다르기 때문이다.

function todayPicked(): PickedDate {
  const t = new Date();
  return { year: t.getFullYear(), month: t.getMonth(), day: t.getDate() };
}

function pickedToDateStr({ year, month, day }: PickedDate): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function MilestoneAddSheet({
  accent,
  onClose,
  onSubmit,
}: {
  accent: string;
  onClose: () => void;
  onSubmit: (title: string, dueDate: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState<PickedDate>(todayPicked());
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = title.trim().length > 0 && !submitting;

  // 저장은 서버로 간다 — 실패하면 시트를 닫지 않고 사유를 보여준다. 닫아버리면
  // 저장된 것처럼 보이고 목록에는 없는 상태가 된다.
  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(title.trim(), pickedToDateStr(due));
    } catch (e) {
      setError(e instanceof Error ? e.message : "마일스톤을 추가하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
    >
      <div
        className="flex w-full flex-col rounded-t-[28px]"
        style={{ background: "#fff", maxWidth: 390, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: "rgba(28,28,30,0.15)" }} />
          <div className="flex items-center justify-between pb-4">
            <button onClick={onClose} className="text-[14px]" style={{ color: "rgba(28,28,30,0.5)" }}>
              취소
            </button>
            <span className="text-[16px] font-bold" style={{ color: "#1C1C1E" }}>
              마일스톤 추가
            </span>
            {/* 저장 중에는 라벨을 바꿔 — Render 무료 플랜은 첫 요청이 수십 초 걸린다. */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="text-[14px] font-bold"
              // 저장 가능할 때만 프로젝트 색으로 — 이 프로젝트의 목표임을 드러낸다.
              style={{ color: canSubmit ? onLight(accent) : "rgba(28,28,30,0.25)" }}
            >
              {submitting ? "저장 중…" : "저장"}
            </button>
          </div>
        </div>

        <div className="px-5 pb-6">
          {/* 목표 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              달성할 목표
            </label>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmit();
              }}
              placeholder="예: 중간 발표"
              className="w-full text-[16px] outline-none"
              style={{ color: "#1C1C1E" }}
            />
          </div>

          {/* 목표일 */}
          <div className="border-b py-4" style={{ borderColor: "rgba(28,28,30,0.08)" }}>
            <label className="mb-2 block text-[12px] font-semibold" style={{ color: "rgba(28,28,30,0.4)" }}>
              목표일
            </label>
            <button
              onClick={() => setDatePickerOpen(true)}
              className="flex w-full items-center justify-between text-[16px]"
              style={{ color: "#1C1C1E" }}
            >
              <span>{`${due.year}. ${String(due.month + 1).padStart(2, "0")}. ${String(due.day).padStart(2, "0")}`}</span>
              <ChevronRight size={16} color="rgba(28,28,30,0.3)" />
            </button>
          </div>

          {error && (
            <p className="pt-4 text-[12px] leading-relaxed" style={{ color: ALERT }}>
              {error}
            </p>
          )}

          <p className="pt-4 text-[11px] leading-relaxed" style={{ color: "rgba(28,28,30,0.4)" }}>
            이 마일스톤에 연결된 작업이 모두 완료되면 마일스톤이 달성되고
            전체 진행률이 올라갑니다.
          </p>
        </div>
      </div>

      {datePickerOpen && (
        <DatePickerSheet
          selected={due}
          onSelect={(d) => {
            setDue(d);
            setDatePickerOpen(false);
          }}
          onClose={() => setDatePickerOpen(false)}
        />
      )}

    </div>
  );
}

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, selectProject, loading: projectsLoading } = useProjectsContext();
  const project = projects.find((p) => p.id === projectId);
  const { data } = useProjectDetail(project?.id);
  const { addMilestone } = useMilestonesContext();
  const [addingMilestone, setAddingMilestone] = useState(false);

  const accentColor = project?.color ?? FALLBACK_ACCENT;

  // 이 프로젝트를 보는 순간 "현재 선택된 프로젝트"로 기록 — 하단 탭 홈 버튼이
  // 뒤로가기 전까지 이 프로젝트로 돌아오도록 한다.
  useEffect(() => {
    if (project) selectProject(project.id);
  }, [project, selectProject]);

  const handleBack = () => {
    selectProject(null);
    navigate("/");
  };

  if (!project) {
    const message = projectsLoading
      ? "프로젝트를 불러오는 중이에요"
      : "프로젝트를 찾을 수 없어요";

    return (
      <div
        className="flex min-h-screen flex-col"
        style={{ background: "#1C1C1E", color: "#F0F0EC" }}
      >
        <div className="flex-1 px-4 pt-6">
          <button
            onClick={handleBack}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-opacity active:opacity-60"
            style={{ background: "rgba(240,240,236,0.08)" }}
            aria-label="뒤로가기"
          >
            <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
          </button>
          <p className="pt-16 text-center text-[13px]" style={{ color: "rgba(240,240,236,0.45)" }}>
            {message}
          </p>
        </div>
      </div>
    );
  }

  const { urgentTask, members, milestones, progress } = data;
  const activeCount = members.filter((m) => m.state !== "inactive").length;

  // D-Day 카드는 프로젝트 색을 그대로 쓴다. 글자색은 배경 밝기에 따라 뒤집힌다.
  const onAccent = onAccentPalette(accentColor);

  // 마일스톤은 팀 목표라 이 화면 안에서 바로 추가한다(캘린더로 보내지 않는다).
  // 팀원 추가는 초대 화면으로 보낸다.
  const goMilestone = (milestoneId: string) =>
    navigate(`/project/${project.id}/milestone/${milestoneId}`);
  const goInviteMember = () => navigate(`/create-project/${project.id}/invite`);

  const handleAddMilestone = async (title: string, dueDate: string) => {
    await addMilestone(project.id, { title, dueDate });
    setAddingMilestone(false);
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#1C1C1E", color: "#F0F0EC" }}
    >
      {/* ── 스크롤 영역 ── */}
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 [scrollbar-width:none] flex flex-col gap-5">

        {/* 뒤로가기 */}
        <button
          onClick={handleBack}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>

        {/* 프로젝트명 */}
        <h1
          className="text-[22px] font-black leading-tight tracking-[-0.03em]"
          style={{ color: "#F0F0EC" }}
        >
          {project?.name ?? "프로젝트"}
        </h1>

        {/* ── 섹션: 지금 가장 중요한 것 ── */}
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              지금 가장 중요한 것
            </p>
          </div>

          {/* D-Day 카드 — 아직 달성하지 않은 마일스톤 중 목표일이 가장 가까운
              것을 자동으로 뽑은 파생 뷰다. 여기서 직접 등록하지 않으므로 추가
              버튼을 두지 않는다 (추가 입구는 아래 "이 프로젝트의 마일스톤" 하나로
              통일). */}
          {!urgentTask ? (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{ background: "rgba(240,240,236,0.06)" }}
            >
              <p className="text-[13px] font-bold" style={{ color: "rgba(240,240,236,0.7)" }}>
                남은 마일스톤이 없어요
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(240,240,236,0.35)" }}>
                마일스톤을 추가하면 목표일이 가장 가까운 것이 여기 올라와요
              </p>
            </div>
          ) : (
          // 폴더 탭 + 본체. 탭이 카드 위에 붙어 "프로젝트 파일" 한 장처럼 보인다.
          <div className="flex flex-col items-start">
            {/* 폴더 탭 */}
            <div
              className="rounded-t-[14px] pl-5 pr-8 pt-2.5 pb-2"
              style={{ background: accentColor }}
            >
              <span
                className="text-[11px] font-bold tracking-[0.08em]"
                style={{ color: onAccent.faint }}
              >
                PROJECT FILE
              </span>
            </div>

            {/* 본체 */}
            <div
              className="relative w-full rounded-2xl rounded-tl-none p-5 flex flex-col gap-3.5"
              style={{ background: accentColor, boxShadow: "6px 8px 0 rgba(0,0,0,0.22)" }}
            >
              {/* 상단: 라벨 + 화살표 버튼 */}
              <div className="flex items-start justify-between">
                <span
                  className="text-[13px] font-bold tracking-[0.02em]"
                  style={{ color: onAccent.faint }}
                >
                  마감 임박
                </span>
                <button
                  onClick={() => goMilestone(urgentTask.id)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
                  style={{ background: onAccent.veil }}
                  aria-label="마감 임박 마일스톤 자세히 보기"
                >
                  <ArrowRight size={16} strokeWidth={2.5} color={onAccent.fg} />
                </button>
              </div>

              {/* D-Day 숫자 */}
              <p
                className="text-[64px] font-black leading-[0.9] tracking-[-0.05em]"
                style={{ color: onAccent.fg }}
              >
                D-{urgentTask.dday}
              </p>

              {/* 숫자와 상세 정보를 가르는 선 */}
              <div className="h-px w-full" style={{ background: onAccent.line }} />

              {/* 태스크 제목 */}
              <div className="flex flex-col gap-1">
                <p className="text-[17px] font-bold" style={{ color: onAccent.fg }}>
                  {urgentTask.title}
                </p>
                <p className="text-[12px] font-medium" style={{ color: onAccent.dim }}>
                  {urgentTask.datetime}
                </p>
              </div>

              {/* 태그 뱃지들 */}
              <div className="flex flex-wrap gap-2">
                {urgentTask.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                    style={{ background: onAccent.veil, color: onAccent.fg }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          )}
        </section>

        {/* ── 섹션: 팀원 ── */}
        <section
          className="rounded-2xl p-5 flex flex-col gap-4 text-left transition-opacity active:opacity-80"
          style={{ background: "#fff", color: "#1C1C1E" }}
          onClick={() => navigate(`/project/${project.id}/team`)}
        >
          {/* 헤더: 활동 중 카운트 + 이니셜 미리보기 */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black leading-none" style={{ color: "#1C1C1E" }}>
                {activeCount}
              </span>
              <span className="text-[13px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
                / {members.length}명 활동 중
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 미리보기 이니셜 (겹쳐 표시) */}
              <div className="flex items-center">
                {members.map((m, i) => (
                  <div
                    key={`${m.initials}-${i}`}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white"
                    style={{
                      ...memberAvatar(accentColor, m.state),
                      marginLeft: i > 0 ? -6 : 0,
                      zIndex: members.length - i,
                      position: "relative",
                    }}
                  >
                    {m.initials}
                  </div>
                ))}
              </div>
              <AddButton label="팀원 초대" onClick={goInviteMember} />
            </div>
          </div>

          {/* 아바타 목록 — 팀 규모가 프로젝트마다 달라 좌측 정렬 + 줄바꿈 */}
          {members.length === 0 ? (
            <p className="text-[12px]" style={{ color: "rgba(28,28,30,0.45)" }}>
              아직 팀원이 없어요. + 를 눌러 초대해보세요
            </p>
          ) : (
          <div className="flex flex-wrap gap-x-5 gap-y-3">
            {members.map((m, i) => (
              <div key={`${m.initials}-${i}`} className="flex flex-col items-center gap-1.5">
                {/* 아바타 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={memberAvatar(accentColor, m.state)}
                >
                  {m.initials}
                </div>
                {/* 역할 */}
                <span className="text-[9px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
                  {m.role}
                </span>
                {/* 상태 닷 — 지연이면 경고색, 활동 중이면 프로젝트 색, 없으면 비운다 */}
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      m.state === "inactive"
                        ? "transparent"
                        : memberAvatar(accentColor, m.state).background,
                  }}
                />
              </div>
            ))}
          </div>
          )}
        </section>

        {/* ── 섹션: 이 프로젝트의 마일스톤 ──
            지난 것도 달성한 것도 모두 보여준다 — 목표일이 지났다고 사라지면
            방금 놓친 마일스톤을 확인할 길이 없어진다. */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              이 프로젝트의 마일스톤
            </p>
            <AddButton label="마일스톤 추가" onClick={() => setAddingMilestone(true)} onDark />
          </div>

          {milestones.length === 0 ? (
            <button
              onClick={() => setAddingMilestone(true)}
              className="rounded-2xl px-4 py-5 text-left transition-opacity active:opacity-70"
              style={{ background: "rgba(240,240,236,0.06)" }}
            >
              <span className="text-[12px]" style={{ color: "rgba(240,240,236,0.45)" }}>
                아직 마일스톤이 없어요. + 를 눌러 추가해보세요
              </span>
            </button>
          ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
            {milestones.map((m, i) => {
              // 목표일이 지난 것은 "급한 일"이 아니라 지나간 기록이다 —
              // 경고색으로 채우면 아직 쫓아야 할 일처럼 읽히므로, 전체를
              // 흐린 회색으로 내리고 부제에 "기한 지남"을 적는다.
              const past = !m.done && m.dday < 0;
              const muted = m.done || past;
              return (
              <button
                key={m.id}
                onClick={() => goMilestone(m.id)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left transition-opacity active:opacity-60"
                style={{
                  borderBottom: i < milestones.length - 1
                    ? "1px solid rgba(0,0,0,0.06)"
                    : "none",
                  opacity: muted ? 0.5 : 1,
                }}
              >
                {/* D-Day 뱃지 — 달성한 것과 지난 것은 회색으로 가라앉히고,
                    아직 남았는데 급한 것(D-7 이하)만 경고색으로 꽉 채운다.
                    나머지는 프로젝트 색을 옅게 깐다. */}
                <span
                  className="text-[11px] font-black px-2.5 py-1.5 rounded-lg shrink-0 min-w-[44px] text-center"
                  style={
                    muted
                      ? { background: "rgba(28,28,30,0.06)", color: "rgba(28,28,30,0.45)" }
                      : m.dday <= 7
                        ? { background: ALERT, color: "#fff" }
                        : softBadge(accentColor)
                  }
                >
                  {ddayLabel(m.dueDate)}
                </span>
                {/* 목표 + 연결된 작업 진행 */}
                <span className="flex-1 flex flex-col gap-0.5">
                  <span
                    className="text-[14px] font-semibold"
                    style={{ color: muted ? "rgba(28,28,30,0.45)" : "#1C1C1E" }}
                  >
                    {m.label}
                  </span>
                  <span className="text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.4)" }}>
                    {m.done
                      ? "달성"
                      : past
                        ? "기한 지남"
                        : m.totalCount === 0
                          ? "연결된 작업 없음"
                          : `작업 ${m.doneCount}/${m.totalCount} 완료`}
                  </span>
                </span>
                {/* 화살표 */}
                <ChevronRight size={16} strokeWidth={2} color="rgba(28,28,30,0.3)" />
              </button>
              );
            })}
          </div>
          )}

          {/* 마일스톤에 걸리지 않은 일정까지 포함한 전체 목록으로 가는 입구.
              위 목록은 팀 목표(마일스톤)만 보여주므로 날짜순 전체 일정은
              여기서만 볼 수 있다. */}
          <button
            onClick={() => navigate(`/project/${project.id}/schedule`)}
            className="flex items-center justify-between rounded-2xl px-4 py-3 transition-opacity active:opacity-60"
            style={{ background: "rgba(240,240,236,0.06)" }}
          >
            <span className="text-[12px] font-semibold" style={{ color: "rgba(240,240,236,0.7)" }}>
              이 프로젝트의 전체 일정
            </span>
            <ChevronRight size={15} strokeWidth={2} color="rgba(240,240,236,0.4)" />
          </button>
        </section>

        {/* ── 섹션: 전체 진행률 ── */}
        <section
          className="rounded-2xl p-5 flex flex-col gap-4 text-left transition-opacity active:opacity-80"
          style={{ background: "#fff" }}
          onClick={() => navigate(`/project/${project.id}/report`)}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold" style={{ color: "#1C1C1E" }}>
              전체 진행률
            </span>
            {/* 달성한 마일스톤 수가 곧 진행률이다 */}
            <span className="text-[14px] font-black" style={{ color: "#1C1C1E" }}>
              마일스톤 {progress.done}/{progress.total} · {progress.percent}%
            </span>
          </div>

          {/* 프로그레스 바 */}
          <div className="relative h-2 rounded-full" style={{ background: "rgba(0,0,0,0.08)" }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{
                width: `${progress.percent}%`,
                background: accentColor,
              }}
            />
            {/* 현재 위치 닷 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
              style={{
                left: `calc(${progress.percent}% - 6px)`,
                background: accentColor,
              }}
            />
          </div>

          {/* 하단 레이블 */}
          {/* 양 끝은 이 프로젝트의 첫·마지막 마일스톤 — 타임라인의 시작과 끝 */}
          <div className="flex items-center justify-between gap-2 text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
            <span className="truncate">{progress.startLabel}</span>
            <span className="shrink-0 font-bold" style={{ color: "#1C1C1E" }}>현재</span>
            <span className="truncate text-right">{progress.endLabel}</span>
          </div>
        </section>

      </div>

      {addingMilestone && (
        <MilestoneAddSheet
          accent={accentColor}
          onClose={() => setAddingMilestone(false)}
          onSubmit={handleAddMilestone}
        />
      )}
    </div>
  );
}
