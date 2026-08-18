import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProjectDetail } from "@/data/useProjectDetail";

// ── 컴포넌트 ──────────────────────────────────────────────────────────────────

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects, selectProject } = useProjectsContext();
  const { data } = useProjectDetail(projectId);

  const project = projects.find((p) => p.id === projectId) ?? projects[0];
  const accentColor = project?.color ?? "#A78BFA";

  // 이 프로젝트를 보는 순간 "현재 선택된 프로젝트"로 기록 — 하단 탭 홈 버튼이
  // 뒤로가기 전까지 이 프로젝트로 돌아오도록 한다.
  useEffect(() => {
    if (project) selectProject(project.id);
  }, [project, selectProject]);

  const handleBack = () => {
    selectProject(null);
    navigate("/");
  };

  const { urgentTask, members, schedules, progress } = data;
  const activeCount = members.filter((m) => m.active).length;

  // 디자인 시안이 항상 보라색이므로 고정
  const ddayBg = "#7B46F8";

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
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
            지금 가장 중요한 것
          </p>

          {/* D-Day 카드 */}
          <div
            className="relative rounded-2xl p-5 flex flex-col gap-3"
            style={{ background: ddayBg }}
          >
            {/* 상단: 태그 + 화살표 버튼 */}
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-bold tracking-[0.04em]"
                style={{ color: "rgba(255,255,255,0.65)" }}
              >
                마감 임박
              </span>
              <button
                onClick={() => navigate(`/project/${project?.id}/milestone`)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
                style={{ background: "rgba(255,255,255,0.18)" }}
              >
                <ArrowRight size={15} strokeWidth={2.5} color="#fff" />
              </button>
            </div>

            {/* D-Day 숫자 */}
            <p
              className="text-[56px] font-black leading-none tracking-[-0.04em]"
              style={{ color: "#fff" }}
            >
              D-{urgentTask.dday}
            </p>

            {/* 태스크 제목 */}
            <div className="flex flex-col gap-1">
              <p className="text-[17px] font-bold" style={{ color: "#fff" }}>
                {urgentTask.title}
              </p>
              <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>
                {urgentTask.datetime}
              </p>
            </div>

            {/* 태그 뱃지들 */}
            <div className="flex flex-wrap gap-2">
              {urgentTask.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[11px] font-semibold px-3 py-1 rounded-full"
                  style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 섹션: 팀원 ── */}
        <section
          className="rounded-2xl p-5 flex flex-col gap-4 text-left transition-opacity active:opacity-80"
          style={{ background: "#fff", color: "#1C1C1E" }}
          onClick={() => navigate(`/project/${project?.id}/team`)}
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

            {/* 미리보기 이니셜 (겹쳐 표시) */}
            <div className="flex items-center">
              {members.map((m, i) => (
                <div
                  key={m.initials}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-white"
                  style={{
                    background: m.avatarBg,
                    color: "#1C1C1E",
                    marginLeft: i > 0 ? -6 : 0,
                    zIndex: members.length - i,
                    position: "relative",
                  }}
                >
                  {m.initials}
                </div>
              ))}
            </div>
          </div>

          {/* 아바타 목록 */}
          <div className="flex justify-between">
            {members.map((m) => (
              <div key={m.initials} className="flex flex-col items-center gap-1.5">
                {/* 아바타 */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-[11px] font-black"
                  style={{
                    background: m.avatarBg,
                    color: "#fff",
                  }}
                >
                  {m.initials}
                </div>
                {/* 역할 */}
                <span className="text-[9px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
                  {m.role}
                </span>
                {/* 활성 닷 */}
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: m.active ? accentColor : "transparent" }}
                />
              </div>
            ))}
          </div>
        </section>

        {/* ── 섹션: 다가오는 일정 ── */}
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
            다가오는 일정
          </p>

          <div
            className="rounded-2xl overflow-hidden text-left transition-opacity active:opacity-80"
            style={{ background: "#fff" }}
            onClick={() => navigate(`/project/${project?.id}/schedule`)}
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
                {/* D-Day 뱃지 */}
                <span
                  className="text-[11px] font-black px-2.5 py-1 rounded-lg shrink-0 min-w-[40px] text-center"
                  style={{ background: s.ddayColor, color: "#fff" }}
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
        </section>

        {/* ── 섹션: 전체 진행률 ── */}
        <section
          className="rounded-2xl p-5 flex flex-col gap-4 text-left transition-opacity active:opacity-80"
          style={{ background: "#fff" }}
          onClick={() => navigate(`/project/${project?.id}/report`)}
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
                background: `linear-gradient(90deg, ${accentColor}, #7B46F8)`,
              }}
            />
            {/* 현재 위치 닷 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
              style={{
                left: `calc(${progress.percent}% - 6px)`,
                background: "#7B46F8",
              }}
            />
          </div>

          {/* 하단 레이블 */}
          <div className="flex items-center justify-between text-[11px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>
            <span>착수 ({progress.done}/{progress.total})</span>
            <span className="font-bold" style={{ color: "#1C1C1E" }}>현재</span>
            <span>남음 ({progress.remaining}/{progress.remainingTotal})</span>
          </div>
        </section>

      </div>
    </div>
  );
}
