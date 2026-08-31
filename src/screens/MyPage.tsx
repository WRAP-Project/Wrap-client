import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, LogOut, Plus } from "lucide-react";
import { C, rgba, Sheet } from "./chatShared";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProfile } from "@/data/useProfile";
import { useAuth } from "@/data/useAuth";
import { useIntegrations } from "@/data/useIntegrations";
import { useNotificationSettings } from "@/data/useNotificationSettings";
import { useTeamMembers } from "@/data/useTeamMembers";
import { useProjectInvite } from "@/data/useProjectInvite";
import type { Project } from "@/data/useProjects";

// 마이페이지 — 번호 매긴 섹션 카드(01 프로필 / 02 프로젝트 관리 / 03 연동 툴 /
// 04 알림 설정)가 한 번에 하나씩 펼쳐지고, 사용자 지정색(profile.accentColor)이
// 배지·타일·토글 등 모든 액센트에 일관되게 반영된다.

type SectionId = "profile" | "projects" | "tools" | "alerts";
type SheetState = { type: "roles" | "invite"; project: Project } | null;

// ─── 화면 전용 조각들 (MyPage.tsx에서만 쓰이므로 인라인 정의) ─────────────────

// 사용자 지정색 토글 — 켜짐: 액센트 트랙 + 어두운 노브
function Toggle({ on, accent, onToggle }: { on: boolean; accent: string; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="relative h-7 w-12 shrink-0 rounded-full transition-colors"
      style={{ background: on ? accent : rgba(C.fg, 0.12) }}
    >
      <span
        className="absolute top-[3px] size-[22px] rounded-full transition-all"
        style={{ background: on ? C.ink : rgba(C.fg, 0.35), left: on ? 23 : 3 }}
      />
    </button>
  );
}

// 액센트 틴트 사각 타일 (아바타·프로젝트/연동 툴 이니셜·알림 번호)
function Tile({ accent, size = 40, radius = 12, children }: { accent: string; size?: number; radius?: number; children: ReactNode }) {
  return (
    <div
      className="grid shrink-0 place-items-center font-black"
      style={{ width: size, height: size, borderRadius: radius, background: rgba(accent, 0.14), color: accent }}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ background: rgba(C.fg, 0.06) }} />;
}

function CloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="mt-4 h-12 w-full rounded-xl text-[14px] font-medium transition-opacity active:opacity-60"
      style={{ background: rgba(C.fg, 0.07), color: C.fg70 }}
    >
      닫기
    </button>
  );
}

// 번호 매긴 섹션 카드 — 헤더 오른쪽에 액센트 배지(count) 또는 화살표를 표시
function SectionCard({
  number, title, accent, count, open, onToggle, children,
}: {
  number: string; title: string; accent: string; count?: number;
  open: boolean; onToggle: () => void; children: ReactNode;
}) {
  return (
    <div className="shrink-0 overflow-hidden rounded-[20px]" style={{ background: C.surface }}>
      <button onClick={onToggle} className="flex h-16 w-full items-center gap-4 px-5 text-left">
        <span className="w-5 shrink-0 text-[11px] font-bold tracking-[.08em]" style={{ color: C.fg35 }}>{number}</span>
        <span className="flex-1 text-[16px] font-bold tracking-[-.01em]">{title}</span>
        {count !== undefined && !open ? (
          <span
            className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-black"
            style={{ background: accent, color: C.ink }}
          >
            {count}
          </span>
        ) : (
          <ChevronRight
            size={15}
            style={{ color: C.fg35, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }}
          />
        )}
      </button>
      {open && children}
    </div>
  );
}

// 02 프로젝트 관리 — 프로젝트 목록 + 행 펼침 시 권한 설정·초대하기
function ProjectSectionBody({
  accent, onOpenSheet,
}: {
  accent: string;
  onOpenSheet: (sheet: NonNullable<SheetState>) => void;
}) {
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const [openRow, setOpenRow] = useState<string | null>(null);

  return (
    <div style={{ borderTop: `1px solid ${rgba(C.fg, 0.06)}` }}>
      {projects.map((project, i) => {
        const open = openRow === project.id;
        return (
          <div key={project.id}>
            {i > 0 && <Divider />}
            <button
              onClick={() => setOpenRow((cur) => (cur === project.id ? null : project.id))}
              className="flex h-[72px] w-full items-center gap-3.5 px-4 text-left"
            >
              <Tile accent={accent} size={48} radius={14}>
                <span className="text-[15px]">{project.name.charAt(0)}</span>
              </Tile>
              <div className="flex-1">
                <div className="text-[16px] font-bold tracking-[-.01em]">{project.name}</div>
                <div className="mt-0.5 text-[12px]" style={{ color: C.fg50 }}>
                  {open ? "권한 · 초대 관리" : `최근 업데이트 · ${project.lastUpdatedLabel ?? "오늘"}`}
                </div>
              </div>
              {open ? (
                <ChevronRight size={14} style={{ color: C.fg35, transform: "rotate(90deg)", transition: "transform .2s" }} />
              ) : (
                <span
                  className="grid size-7 shrink-0 place-items-center rounded-full text-[12px] font-black"
                  style={{ background: accent, color: C.ink }}
                >
                  {project.recentUpdates ?? 0}
                </span>
              )}
            </button>
            {open && (
              <div className="flex gap-2 px-4 pb-4">
                <button
                  onClick={() => onOpenSheet({ type: "roles", project })}
                  className="h-12 flex-1 rounded-xl text-[14px] font-bold transition-opacity active:opacity-60"
                  style={{ background: rgba(C.fg, 0.07), color: C.fg70 }}
                >
                  권한 설정
                </button>
                <button
                  onClick={() => onOpenSheet({ type: "invite", project })}
                  className="h-12 flex-[1.4] rounded-xl text-[14px] font-bold transition-opacity active:opacity-60"
                  style={{ background: accent, color: C.ink }}
                >
                  초대하기
                </button>
              </div>
            )}
          </div>
        );
      })}
      <Divider />
      <button
        onClick={() => navigate("/create-project")}
        className="flex h-14 w-full items-center gap-3.5 px-4 text-left"
      >
        <span className="grid w-12 shrink-0 place-items-center">
          <Plus size={15} style={{ color: C.fg35 }} />
        </span>
        <span className="flex-1 text-[14px] font-medium" style={{ color: C.fg50 }}>새 프로젝트 추가</span>
      </button>
    </div>
  );
}

// 권한 설정 시트 — 팀장/팀원 역할 선택. 역할 저장 엔드포인트가 아직 없어
// (openapi.yaml 기준) 선택 상태는 시트 로컬 mock으로만 유지한다.
function RolesSheet({ project, accent, onClose }: { project: Project; accent: string; onClose: () => void }) {
  const { members } = useTeamMembers(project.id);
  const [roles, setRoles] = useState<Record<string, "팀장" | "팀원">>({});
  const roleOf = (id: string, idx: number) => roles[id] ?? (idx === 0 ? "팀장" : "팀원");

  return (
    <Sheet title={`권한 설정 · ${project.name}`} onClose={onClose}>
      <div className="flex flex-col gap-1">
        {members.map((member, idx) => (
          <div key={member.id} className="flex h-14 items-center">
            <span className="flex-1 text-[16px] font-bold tracking-[-.01em]">{member.name}</span>
            <div className="flex gap-1.5">
              {(["팀장", "팀원"] as const).map((role) => {
                const selected = roleOf(member.id, idx) === role;
                return (
                  <button
                    key={role}
                    onClick={() => setRoles((prev) => ({ ...prev, [member.id]: role }))}
                    className="h-9 rounded-full px-4 text-[13px] font-bold transition-opacity active:opacity-60"
                    style={{
                      background: selected ? accent : rgba(C.fg, 0.08),
                      color: selected ? C.ink : C.fg50,
                    }}
                  >
                    {role}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <CloseBtn onClose={onClose} />
    </Sheet>
  );
}

// 초대 링크 시트
function InviteSheet({ project, accent, onClose }: { project: Project; accent: string; onClose: () => void }) {
  const { invite, copyLink, copied } = useProjectInvite(project.id);

  return (
    <Sheet title={`초대 링크 · ${project.name}`} onClose={onClose}>
      <div className="flex h-14 items-center gap-2 rounded-xl pl-4 pr-2" style={{ background: rgba(C.fg, 0.06) }}>
        <span className="flex-1 truncate text-[14px]" style={{ color: C.fg }}>{invite.link}</span>
        <button
          onClick={copyLink}
          className="h-9 shrink-0 rounded-lg px-3.5 text-[13px] font-bold transition-opacity active:opacity-60"
          style={{ background: accent, color: C.ink }}
        >
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <p className="mt-3 text-[12px]" style={{ color: C.fg50 }}>
        이 링크로 가입하면 팀원 권한으로 프로젝트에 참여합니다.
      </p>
      <CloseBtn onClose={onClose} />
    </Sheet>
  );
}

// ─── 화면 ──────────────────────────────────────────────────────────────────────

export default function MyPage() {
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const { profile } = useProfile();
  const { logout } = useAuth();
  const { integrations, toggleIntegration } = useIntegrations();
  const { settings, toggleSetting } = useNotificationSettings();
  const [openSection, setOpenSection] = useState<SectionId | null>("profile");
  const [sheet, setSheet] = useState<SheetState>(null);

  const accent = profile.accentColor;
  const connectedCount = integrations.filter((i) => i.connected).length;
  const toggle = (id: SectionId) => setOpenSection((cur) => (cur === id ? null : id));

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const alertRows: { num: string; label: string; key: "push" | "email" | "meetingReminder" }[] = [
    { num: "01", label: "푸시 알림", key: "push" },
    { num: "02", label: "이메일 알림", key: "email" },
    { num: "03", label: "미팅 리마인더", key: "meetingReminder" },
  ];

  return (
    <main className="relative flex size-full flex-col overflow-hidden bg-[#1C1C1E] text-[#f0f0ec]">
      <header className="px-5 pb-4 pt-5">
        <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">마이페이지</h1>
      </header>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 pb-8 [scrollbar-width:none]">
        {/* 01 — 프로필 */}
        <div className="shrink-0 overflow-hidden rounded-[20px]" style={{ background: C.surface }}>
          <button onClick={() => toggle("profile")} className="flex w-full items-center gap-4 px-4 pb-4 pt-4 text-left">
            <Tile accent={accent} size={48} radius={14}><span className="text-[16px]">{profile.avatarInitial}</span></Tile>
            <div className="flex-1">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: C.fg35 }}>
                01 — {profile.role}
              </div>
              <div className="text-[18px] font-black leading-none tracking-[-.02em]">{profile.name}</div>
            </div>
            <ChevronRight
              size={15}
              style={{ color: C.fg35, transform: openSection === "profile" ? "rotate(90deg)" : "none", transition: "transform .2s" }}
            />
          </button>

          {openSection === "profile" && (
            <>
              <div className="px-4 pb-4" style={{ borderBottom: `1px solid ${rgba(C.fg, 0.06)}` }}>
                <div className="mb-3 text-[13px]" style={{ color: C.fg50 }}>{profile.email}</div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1" style={{ background: rgba(C.fg, 0.06) }}>
                    <span className="size-[5px] rounded-full" style={{ background: accent }} />
                    <span className="text-[10px] font-medium" style={{ color: C.fg70 }}>{profile.team}</span>
                  </span>
                  <button
                    onClick={() => navigate("/mypage/edit")}
                    className="h-8 rounded-full px-3.5 text-[12px] font-bold transition-opacity active:opacity-60"
                    style={{ background: rgba(C.fg, 0.08), color: C.fg70 }}
                  >
                    편집 ›
                  </button>
                </div>
              </div>
              <div className="flex">
                {[
                  [String(projects.length), "PROJECTS"],
                  [String(profile.teamMembers), "MEMBERS"],
                  [String(profile.tasks), "TASKS"],
                ].map(([val, label], i) => (
                  <div
                    key={label}
                    className="flex h-16 flex-1 flex-col items-center justify-center gap-1"
                    style={i > 0 ? { borderLeft: `1px solid ${rgba(C.fg, 0.06)}` } : undefined}
                  >
                    <span className="text-[19px] font-black leading-none">{val}</span>
                    <span className="text-[9px] font-bold tracking-[.12em]" style={{ color: C.fg35 }}>{label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* 02 — 프로젝트 관리 */}
        <SectionCard
          number="02" title="프로젝트 관리" accent={accent} count={projects.length}
          open={openSection === "projects"} onToggle={() => toggle("projects")}
        >
          <ProjectSectionBody accent={accent} onOpenSheet={setSheet} />
        </SectionCard>

        {/* 03 — 연동 툴 */}
        <SectionCard
          number="03" title="연동 툴" accent={accent} count={connectedCount}
          open={openSection === "tools"} onToggle={() => toggle("tools")}
        >
          <div style={{ borderTop: `1px solid ${rgba(C.fg, 0.06)}` }}>
            {integrations.map((tool, i) => (
              <div key={tool.id}>
                {i > 0 && <Divider />}
                <div className="flex h-[68px] items-center gap-3.5 px-4">
                  <Tile accent={accent}><span className="text-[15px]">{tool.name.charAt(0)}</span></Tile>
                  <div className="flex-1">
                    <div className="text-[15px] font-bold">{tool.name}</div>
                    <div className="mt-0.5 text-[11px]" style={{ color: C.fg50 }}>
                      {tool.connected ? "연동됨" : "미연동"}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleIntegration(tool.id)}
                    className="h-8 rounded-full px-4 text-[12px] font-bold transition-opacity active:opacity-60"
                    style={{ background: rgba(C.fg, 0.08), color: C.fg70 }}
                  >
                    {tool.connected ? "해제" : "연결"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 04 — 알림 설정 */}
        <SectionCard
          number="04" title="알림 설정" accent={accent}
          open={openSection === "alerts"} onToggle={() => toggle("alerts")}
        >
          <div style={{ borderTop: `1px solid ${rgba(C.fg, 0.06)}` }}>
            {alertRows.map((row, i) => (
              <div key={row.key}>
                {i > 0 && <Divider />}
                <div className="flex h-[64px] items-center gap-3.5 px-4">
                  <Tile accent={accent}><span className="text-[12px]">{row.num}</span></Tile>
                  <span className="flex-1 text-[15px] font-bold">{row.label}</span>
                  <Toggle on={settings[row.key]} accent={accent} onToggle={() => toggleSetting(row.key)} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* 로그아웃 — 섹션 카드가 아니라 목록 끝에 놓아 계정 동작임을 구분한다. */}
        <button
          onClick={handleLogout}
          className="flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-[20px] text-[14px] font-bold transition-opacity active:opacity-70"
          style={{ background: C.surface, color: C.red }}
        >
          <LogOut size={15} strokeWidth={2.2} />
          로그아웃
        </button>
      </div>

      {sheet?.type === "roles" && (
        <RolesSheet project={sheet.project} accent={accent} onClose={() => setSheet(null)} />
      )}
      {sheet?.type === "invite" && (
        <InviteSheet project={sheet.project} accent={accent} onClose={() => setSheet(null)} />
      )}
    </main>
  );
}
