import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjectsContext, type Project, type ProjectMember } from "@/data/ProjectsContext";
import { useNotifications } from "@/data/useNotifications";

// ─── 포인트 컬러 → 그라데이션 ────────────────────────────────────────────────
// 프로젝트마다 색을 하나(project.color)만 갖고 있으므로, 카드 배경은 그 색에서
// 자동으로 만들어낸다. 좌상단은 밝게, 우하단은 진하게 — 색이 무엇이든 같은
// 명암 리듬이 나오도록 흰색/검정과 섞는 비율만 고정한다.

const HEX = /^#([0-9a-f]{6})$/i;

function mix(hex: string, target: 255 | 0, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(v + (target - v) * amount),
  );
  return `rgb(${ch[0]}, ${ch[1]}, ${ch[2]})`;
}

/** 그라데이션의 우하단(가장 진한) 색 — 아바타 링처럼 배경과 맞춰야 하는 곳에 쓴다. */
function deepShade(color: string): string {
  return HEX.test(color) ? mix(color, 0, 0.14) : color;
}

/** 포인트 컬러 하나로 카드 배경 그라데이션을 만든다. hex가 아니면 원래 색 그대로. */
function projectGradient(color: string): string {
  if (!HEX.test(color)) return color;
  const light = mix(color, 255, 0.3); // 좌상단: 흰색과 30% 섞어 밝게
  return `linear-gradient(145deg, ${light} 0%, ${color} 52%, ${deepShade(color)} 100%)`;
}

// ─── 멤버 아바타 ──────────────────────────────────────────────────────────────
// 카드 위에 겹쳐 쌓아 보여준다. 최대 3명 + 나머지는 +N으로 접는다.

function MemberStack({ members, ringColor }: { members: ProjectMember[]; ringColor: string }) {
  const shown = members.slice(0, 3);
  const overflow = members.length - shown.length;

  return (
    // isolate: 아래 zIndex가 카드 밖(하단 고정 버튼 등)까지 올라가지 않도록 가둔다.
    <div className="flex items-center shrink-0 isolate">
      {shown.map((m, i) => (
        <div
          key={m.id}
          className="w-6 h-6 rounded-full overflow-hidden bg-black/35 flex items-center justify-center text-white text-[10px] font-medium"
          style={{
            marginLeft: i === 0 ? 0 : -8,
            boxShadow: `0 0 0 2px ${ringColor}`,
            zIndex: shown.length - i,
          }}
        >
          {m.avatarUrl ? (
            <img src={m.avatarUrl} alt={m.initials} className="w-full h-full object-cover" />
          ) : (
            m.initials
          )}
        </div>
      ))}
      {overflow > 0 && (
        <div
          className="w-6 h-6 rounded-full bg-black/45 flex items-center justify-center text-white text-[10px] font-medium"
          style={{ marginLeft: -8, boxShadow: `0 0 0 2px ${ringColor}` }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}

// ─── ProjectCard (이 화면에서만 쓰이므로 인라인 정의) ────────────────────────

/**
 * 카드 크기 — 슬롯마다 쓸 수 있는 높이가 달라서, 넣을 수 있는 정보량도 다르다.
 * 이 구분이 없으면 좁은 슬롯에서 내용이 카드 밖으로 넘쳐 옆 카드를 덮는다.
 *
 *  wide    가로 전체 / 최소 130px  → 설명(2줄) + 프로그레스 + 태그
 *  tall    가로 절반 / 220px       → 설명(3줄) + 프로그레스 + 태그
 *  compact 가로 절반 / ~106px      → 프로그레스만 (설명·태그 생략)
 */
type CardSize = "wide" | "tall" | "compact";

function ProjectCard({
  project,
  selected,
  onClick,
  size,
  className = "",
}: {
  project: Project;
  selected: boolean;
  onClick: () => void;
  size: CardSize;
  className?: string;
}) {
  const showDescription = size !== "compact" && Boolean(project.description);
  const showTags = size !== "compact" && Boolean(project.tags?.length);
  // 아바타는 자리를 차지하므로 compact 슬롯에서는 생략한다.
  const members = size === "compact" ? [] : project.members ?? [];

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl p-4 cursor-pointer flex flex-col justify-between overflow-hidden active:opacity-80 transition-opacity ${className}`}
      style={{ background: projectGradient(project.color) }}
    >
      {/* 상단: 뱃지 + 선택 체크 */}
      <div className="flex items-start justify-between gap-2">
        <span className="bg-black/20 text-black/80 text-xs font-medium px-2.5 py-1 rounded-full min-w-0 truncate">
          {project.name}
        </span>
        {selected && (
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
      <div className="mt-3 min-h-0">
        {showDescription && (
          <p
            className={`text-black/60 text-xs leading-relaxed mb-2 whitespace-pre-line overflow-hidden ${
              size === "wide" ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
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
        {/* 태그(좌) + 멤버 아바타(우) — 둘 중 하나만 있어도 같은 줄을 유지한다. */}
        {(showTags || members.length > 0) && (
          <div className="flex items-center justify-between gap-2 overflow-hidden">
            <div className="flex gap-1 min-w-0 overflow-hidden">
              {showTags &&
                project.tags!.map((tag: string) => (
                  <span
                    key={tag}
                    className="bg-black/15 text-black/70 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
                  >
                    {tag}
                  </span>
                ))}
            </div>
            {members.length > 0 && (
              <MemberStack members={members} ringColor={deepShade(project.color)} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 모자이크 레이아웃 ────────────────────────────────────────────────────────
//
// 규칙은 두 줄로 끝난다:
//   1) 첫 프로젝트는 항상 가로 전체 wide 카드.
//   2) 나머지는 3개씩 묶어 "좌측 tall + 우측 compact 2단" 블록을 반복한다.
//
// 마지막 묶음이 3개가 안 될 때만 아래처럼 채운다 (빈칸을 남기지 않는다):
//   3개 → [ tall | compact / compact ]   높이 220
//   2개 → [ tall | tall ]                높이 220
//   1개 → [       wide       ]           최소 130
//
// 개수별로 보면:
//   1개  wide
//   2개  wide + wide
//   3개  wide + [tall|tall]
//   4개  wide + [tall|compact/compact]
//   5개  wide + [tall|compact/compact] + wide
//   6개  wide + [tall|compact/compact] + [tall|tall]
//   7개  wide + [tall|compact/compact] × 2 ... 이후 3개마다 블록이 하나씩 늘어난다.
//
// 슬롯마다 높이가 고정이므로 카드 내용도 CardSize에 맞춰 줄인다 — 그래야
// 내용이 카드 밖으로 넘쳐 옆 카드를 덮는 일이 생기지 않는다.

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

// ─── 화면 ─────────────────────────────────────────────────────────────────────

export default function ProjectSelect() {
  const { projects, selectedProjectId, selectProject } = useProjectsContext();
  const { hasUnread: hasUnreadNotifications } = useNotifications();
  const navigate = useNavigate();
  const [large, ...rest] = projects;
  const groups = chunk(rest, 3);

  const openProject = (id: string) => {
    selectProject(id);
    navigate(`/project/${id}`);
  };

  return (
    // 콘텐츠가 짧아도 버튼이 하단에 붙도록 스크롤 영역 높이를 꽉 채운다.
    <div className="min-h-full flex flex-col">
      <div className="flex-1 px-5 pt-5 pb-0 flex flex-col gap-4">

        {/* 탭 상단 헤더 — 홈만 시안대로 큰 두 줄 타이틀을 쓴다(다른 탭은 26px 한 줄) */}
        <header>
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3">
              {/* 알림 — 읽지 않은 알림이 있으면 우상단에 점을 띄운다.
                  (알림 목록 화면/API는 아직 없어 이동 동작은 비워둔다) */}
              <button
                aria-label="알림"
                className="relative text-white/60 hover:text-white transition-colors"
              >
                <Bell size={19} />
                {hasUnreadNotifications && (
                  <span className="absolute -top-0.5 -right-0.5 w-[7px] h-[7px] rounded-full bg-[#CDEA6F] ring-2 ring-[#1C1C1E]" />
                )}
              </button>
              <div className="w-8 h-8 rounded-full bg-[#3A3A3C] flex items-center justify-center text-white text-xs font-medium">
                나
              </div>
            </div>
          </div>
          <h1 className="text-white text-[44px] font-black leading-[0.92] tracking-[-.045em] mt-5">
            <span className="block">프로젝트</span>
            <span className="block">선택</span>
          </h1>
          <p className="text-white/35 text-[13px] mt-3">
            진행 중인 프로젝트 {projects.length}개
          </p>
        </header>

        {/* 카드 영역 */}
        <div className="flex flex-col gap-3">
          {/* 1) 첫 프로젝트 = wide */}
          {large && (
            <ProjectCard
              project={large}
              selected={large.id === selectedProjectId}
              onClick={() => openProject(large.id)}
              size="wide"
              className="min-h-[130px] shrink-0"
            />
          )}

          {/* 2) 나머지는 3개 묶음 블록 반복 (개수 제한 없음) */}
          {groups.map((group) => {
            const [first, second, third] = group;

            // 남은 카드 1개 → wide 한 장으로 가로 전체를 채운다.
            if (group.length === 1) {
              return (
                <ProjectCard
                  key={first.id}
                  project={first}
                  selected={first.id === selectedProjectId}
                  onClick={() => openProject(first.id)}
                  size="wide"
                  className="min-h-[130px] shrink-0"
                />
              );
            }

            // 남은 카드 2개 → tall 두 장, 3개 → tall + compact 2단.
            return (
              <div
                key={first.id}
                className="flex gap-3 shrink-0"
                style={{ height: 220 }}
              >
                <ProjectCard
                  project={first}
                  selected={first.id === selectedProjectId}
                  onClick={() => openProject(first.id)}
                  size="tall"
                  className="flex-1 min-w-0 h-full"
                />
                <div className="flex-1 min-w-0 flex flex-col gap-3">
                  <ProjectCard
                    project={second}
                    selected={second.id === selectedProjectId}
                    onClick={() => openProject(second.id)}
                    size={third ? "compact" : "tall"}
                    className="flex-1 min-h-0"
                  />
                  {third && (
                    <ProjectCard
                      project={third}
                      selected={third.id === selectedProjectId}
                      onClick={() => openProject(third.id)}
                      size="compact"
                      className="flex-1 min-h-0"
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 새 프로젝트 만들기 버튼 —
            스크롤 위치와 무관하게 하단바 바로 위에 고정된다.
            (sticky의 스크롤 컨테이너는 App.tsx의 콘텐츠 영역이고,
             그 아래쪽 경계가 곧 하단바 윗선이다.)
            뒤로 카드가 지나가므로 아래쪽은 배경색으로 덮고 위쪽은 그라데이션으로 뺀다. */}
        <div className="sticky bottom-0 z-10 -mx-5 mt-auto px-5 pt-8 pb-4 bg-gradient-to-t from-[#1C1C1E] via-[#1C1C1E] via-60% to-transparent">
          <button
            onClick={() => navigate("/create-project")}
            className="w-full bg-[#2C2C2E] hover:bg-[#3A3A3C] active:bg-[#48484A] transition-colors text-white/50 hover:text-white/70 text-sm py-4 rounded-2xl flex items-center justify-center gap-2"
          >
            <span className="text-base leading-none">+</span>
            새 프로젝트 만들기
          </button>
        </div>

      </div>
    </div>
  );
}
