import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight, Plus } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProjectDetail } from "@/data/useProjectDetail";
import { ALERT, FALLBACK_ACCENT, memberAvatar, onAccentPalette, softBadge } from "@/lib/color";

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

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, selectProject, loading: projectsLoading } = useProjectsContext();
  const project = projects.find((p) => p.id === projectId);
  const { data } = useProjectDetail(project?.id);

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

  const { urgentTask, members, schedules, progress } = data;
  const activeCount = members.filter((m) => m.state !== "inactive").length;

  // D-Day 카드는 프로젝트 색을 그대로 쓴다. 글자색은 배경 밝기에 따라 뒤집힌다.
  const onAccent = onAccentPalette(accentColor);

  // 일정 추가는 캘린더의 등록 시트를 재사용한다 — 이 프로젝트를 미리 골라둔
  // 상태로 열린다. 팀원 추가는 초대 화면으로 보낸다.
  const goAddSchedule = () =>
    navigate(`/calendar?register=1&project=${encodeURIComponent(project.id)}`);
  const goInviteMember = () => navigate(`/create-project/${project.id}/invite`);

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

          {/* D-Day 카드 — 다가오는 일정 중 마감이 가장 가까운 것을 자동으로 뽑은
              파생 뷰다. 여기서 직접 등록하지 않으므로 추가 버튼을 두지 않는다
              (일정 추가 입구는 아래 "다가오는 일정" 섹션 하나로 통일). */}
          {!urgentTask ? (
            <div
              className="rounded-2xl px-5 py-8 text-center"
              style={{ background: "rgba(240,240,236,0.06)" }}
            >
              <p className="text-[13px] font-bold" style={{ color: "rgba(240,240,236,0.7)" }}>
                아직 표시할 일정이 없어요
              </p>
              <p className="mt-1 text-[11px]" style={{ color: "rgba(240,240,236,0.35)" }}>
                일정을 추가하면 마감이 가장 가까운 일정이 여기 올라와요
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
                  onClick={() => navigate(`/project/${project.id}/milestone`)}
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
                  style={{ background: onAccent.veil }}
                  aria-label="마감 임박 일정 자세히 보기"
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

        {/* ── 섹션: 다가오는 일정 ── */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              다가오는 일정
            </p>
            <AddButton label="일정 추가" onClick={goAddSchedule} onDark />
          </div>

          {schedules.length === 0 ? (
            <button
              onClick={goAddSchedule}
              className="rounded-2xl px-4 py-5 text-left transition-opacity active:opacity-70"
              style={{ background: "rgba(240,240,236,0.06)" }}
            >
              <span className="text-[12px]" style={{ color: "rgba(240,240,236,0.45)" }}>
                예정된 일정이 없어요. + 를 눌러 추가해보세요
              </span>
            </button>
          ) : (
          <div
            className="rounded-2xl overflow-hidden text-left transition-opacity active:opacity-80"
            style={{ background: "#fff" }}
            onClick={() => navigate(`/project/${project.id}/schedule`)}
          >
            {schedules.map((s, i) => (
              <div
                key={s.label}
                className="flex items-center gap-3 px-4 py-3.5"
                style={{
                  borderBottom: i < schedules.length - 1
                    ? "1px solid rgba(0,0,0,0.06)"
                    : "none",
                }}
              >
                {/* D-Day 뱃지 — 급한 것(D-3 이하)만 경고색으로 꽉 채우고, 나머지는
                    프로젝트 색을 옅게 깐다. 목록에서 어느 게 먼저인지 바로 읽히게. */}
                <span
                  className="text-[11px] font-black px-2.5 py-1.5 rounded-lg shrink-0 min-w-[44px] text-center"
                  style={
                    s.dday <= 3
                      ? { background: ALERT, color: "#fff" }
                      : softBadge(accentColor)
                  }
                >
                  D-{s.dday}
                </span>
                {/* 라벨 */}
                <span className="flex-1 text-[14px] font-semibold" style={{ color: "#1C1C1E" }}>
                  {s.label}
                </span>
                {/* 화살표 */}
                <ChevronRight size={16} strokeWidth={2} color="rgba(28,28,30,0.3)" />
              </div>
            ))}
          </div>
          )}
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
            <span className="text-[14px] font-black" style={{ color: "#1C1C1E" }}>
              {progress.percent}%
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
          <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
            <span>착수 ({progress.done}/{progress.total})</span>
            <span className="font-bold" style={{ color: "#1C1C1E" }}>현재</span>
            <span>출품 ({progress.remaining}/{progress.remainingTotal})</span>
          </div>
        </section>

      </div>
    </div>
  );
}
