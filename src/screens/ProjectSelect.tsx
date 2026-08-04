import { RefreshCw } from "lucide-react";
import { useProjects, type Project } from "@/data/useProjects";

// ─── ProjectCard (이 화면에서만 쓰이므로 인라인 정의) ────────────────────────

function ProjectCard({
  project,
  onClick,
  className = "",
}: {
  project: Project;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-4 cursor-pointer flex flex-col justify-between active:opacity-80 transition-opacity ${className}`}
      style={{ backgroundColor: project.color }}
    >
      {/* 상단: 뱃지 + 선택 체크 */}
      <div className="flex items-start justify-between gap-2">
        <span className="bg-black/20 text-black/80 text-xs font-medium px-2.5 py-1 rounded-full shrink-0">
          {project.name}
        </span>
        {project.selected && (
          <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
            <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
              <path
                d="M1 4L4 7.5L10 1"
                stroke="#1C1C1E"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 하단: 설명 + 프로그레스 + 태그 */}
      <div className="mt-3">
        {project.description && (
          <p className="text-black/60 text-xs leading-relaxed mb-2 whitespace-pre-line">
            {project.description}
          </p>
        )}
        {project.progress !== undefined && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-[3px] bg-black/20 rounded-full">
              <div
                className="h-full bg-black/50 rounded-full"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-black/50 text-[10px] shrink-0">
              {project.progress}%
            </span>
          </div>
        )}
        {project.tags && project.tags.length > 0 && (
          <div className="flex gap-1 justify-end">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="bg-black/15 text-black/70 text-[10px] font-medium px-2 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 화면 ─────────────────────────────────────────────────────────────────────

export default function ProjectSelect() {
  const { projects } = useProjects();
  const [large, ...small] = projects;

  return (
    <div className="min-h-screen">
      <div className="px-5 py-8 flex flex-col gap-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[#CDEA6F] text-xl leading-none">⚡</span>
            <span className="text-white font-semibold text-base tracking-tight">Wrap</span>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-white/40 hover:text-white/80 transition-colors">
              <RefreshCw size={17} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#3A3A3C] flex items-center justify-center text-white text-xs font-medium">
              나
            </div>
          </div>
        </div>

        {/* 타이틀 */}
        <h1 className="text-white text-[2.6rem] font-bold leading-[1.15] tracking-tight">
          프로젝트<br />선택
        </h1>

        {/* 카드 영역 */}
        <div className="flex flex-col gap-3">
          {/* 대형 카드 (선택됨) */}
          <ProjectCard
            project={large}
            onClick={() => alert("프로젝트로 이동합니다.")}
            className="min-h-[130px]"
          />

          {/* 소형 카드 3개: 좌측 tall 1개 + 우측 2개 */}
          <div className="flex gap-3" style={{ height: 220 }}>
            {/* 좌측: tall 카드 */}
            <ProjectCard
              project={small[0]}
              onClick={() => alert("프로젝트로 이동합니다.")}
              className="flex-1 h-full"
            />
            {/* 우측: 두 카드 세로 배치 */}
            <div className="flex-1 flex flex-col gap-3">
              <ProjectCard
                project={small[1]}
                onClick={() => alert("프로젝트로 이동합니다.")}
                className="flex-1"
              />
              <ProjectCard
                project={small[2]}
                onClick={() => alert("프로젝트로 이동합니다.")}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* 새 프로젝트 만들기 버튼 */}
        <button
          onClick={() => alert("새 프로젝트 만들기")}
          className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] active:bg-[#48484A] transition-colors text-white/50 hover:text-white/70 text-sm py-4 rounded-2xl flex items-center justify-center gap-2"
        >
          <span className="text-base leading-none">+</span>
          새 프로젝트 만들기
        </button>

      </div>
    </div>
  );
}
