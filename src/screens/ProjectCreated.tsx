import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";

/**
 * 프로젝트 생성 직후 확인 화면.
 * CreateProject → (여기) → InviteTeam → ProjectDetail 흐름의 두 번째 단계다.
 */

/** 카드 배경색이 밝은지 판단해서 그 위 텍스트를 검정/흰색 중 고른다. */
function isLightColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  // 상대 휘도 근사치 (sRGB 가중치)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export default function ProjectCreated() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectsContext();

  const project = projects.find((p) => p.id === projectId);

  // 새로고침/딥링크로 없는 프로젝트에 들어온 경우 — 목록으로 되돌린다.
  if (!project) return <Navigate to="/" replace />;

  const accent = project.color;
  const light = isLightColor(accent);
  const ink = light ? "#1E1F23" : "#FFFFFF";
  const inkSoft = light ? "rgba(30,31,35,0.62)" : "rgba(255,255,255,0.72)";
  const inkFaint = light ? "rgba(30,31,35,0.45)" : "rgba(255,255,255,0.5)";
  const divider = light ? "rgba(30,31,35,0.18)" : "rgba(255,255,255,0.22)";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#1C1C1E", color: "#F0F0EC" }}
    >
      <div className="flex-1 px-5 pt-14 pb-6 flex flex-col gap-7">

        {/* 제목 */}
        <h1 className="text-[2.3rem] font-extrabold leading-[1.15] tracking-[-0.03em] text-white">
          프로젝트가<br />준비됐어요!
        </h1>

        {/* ── 생성된 프로젝트 카드 ── */}
        <div
          className="rounded-[26px] px-6 pt-6 pb-8 flex flex-col"
          style={{ background: accent, minHeight: 300 }}
        >
          {/* 생성 완료 뱃지 */}
          <div
            className="self-start inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1.5"
            style={{ background: light ? "rgba(30,31,35,0.12)" : "rgba(255,255,255,0.2)" }}
          >
            <Check size={13} strokeWidth={3} color={ink} />
            <span className="text-[0.72rem] font-semibold" style={{ color: ink }}>
              생성 완료
            </span>
          </div>

          {/* 프로젝트명 */}
          <h2
            className="mt-5 text-[1.6rem] font-extrabold leading-tight tracking-[-0.03em]"
            style={{ color: ink }}
          >
            {project.name}
          </h2>

          {/* 목표 한 줄 */}
          <p className="mt-2.5 text-[0.85rem] leading-relaxed" style={{ color: inkSoft }}>
            목표 · {project.goal?.trim() || "아직 목표를 적지 않았어요"}
          </p>

          <div className="mt-5 h-px w-full" style={{ background: divider }} />

          {/* 마감일 / 포인트 컬러 */}
          <div className="mt-5 flex items-center justify-between">
            <span className="text-[0.82rem] font-semibold" style={{ color: ink }}>
              마감{"  "}
              <span style={{ color: inkSoft }}>
                {project.endDate?.trim() || "미정"}
              </span>
            </span>
            <span className="text-[0.78rem]" style={{ color: inkFaint }}>
              포인트 컬러
            </span>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="flex flex-col gap-3">
          <button
            id="project-created-invite"
            onClick={() => navigate(`/create-project/${project.id}/invite`)}
            className="w-full py-[17px] rounded-[100px] text-[0.95rem] font-semibold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"
            style={{ background: "#3A3A3C", color: "rgba(255,255,255,0.92)" }}
          >
            팀원 초대하고 시작하기
            <ArrowRight size={16} strokeWidth={2.2} />
          </button>

          <button
            id="project-created-skip"
            onClick={() => navigate(`/project/${project.id}`, { replace: true })}
            className="w-full py-[17px] rounded-[100px] text-[0.95rem] font-medium transition-colors active:scale-[0.98]"
            style={{ background: "#2C2C2E", color: "rgba(255,255,255,0.5)" }}
          >
            프로젝트 화면 먼저 보기
          </button>
        </div>

        <p className="text-center text-[0.75rem]" style={{ color: "rgba(255,255,255,0.3)" }}>
          초대는 프로젝트 설정에서 언제든 다시 할 수 있어요
        </p>
      </div>
    </div>
  );
}
