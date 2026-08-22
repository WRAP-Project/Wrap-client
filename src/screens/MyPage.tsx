import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, MoreHorizontal, Plus, Search, Sparkles } from "lucide-react";
import { Btn, C, rgba } from "./chatShared";
import { useProjectsContext } from "@/data/ProjectsContext";
import { useProfile } from "@/data/useProfile";
import { useIntegrations } from "@/data/useIntegrations";
import { useNotificationSettings } from "@/data/useNotificationSettings";

// ─── 화면 전용 조각들 (MyPage.tsx에서만 쓰이므로 인라인 정의) ─────────────────

function DetailPanel({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-2 px-4 pb-3.5 pt-3"
      style={{ borderTop: `1px solid ${rgba(C.fg, 0.07)}` }}
    >
      {children}
    </div>
  );
}

function ActionBtn({ label, primary = false, onClick }: { label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-9 flex-1 rounded-xl text-[12px] font-bold transition-opacity active:opacity-60"
      style={{
        background: primary ? C.red : rgba(C.fg, 0.08),
        color: primary ? "#fff" : C.fg50,
      }}
    >
      {label}
    </button>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="relative h-[26px] w-11 shrink-0 rounded-full transition-colors"
      style={{ background: on ? C.red : "transparent", border: `1.5px solid ${on ? C.red : rgba(C.fg, 0.15)}` }}
    >
      <span
        className="absolute top-[2px] size-[18px] rounded-full transition-all"
        style={{ background: on ? "#fff" : rgba(C.fg, 0.3), left: on ? 21 : 2 }}
      />
    </button>
  );
}

function Row({ label, sub, detail }: { label: string; sub?: string; detail?: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-[52px] w-full items-center gap-3 px-4 text-left"
      >
        <div className="size-8 shrink-0 rounded-[10px]" style={{ background: C.bg }} />
        <div className="flex-1">
          <div className="text-[14px] font-medium">{label}</div>
          {sub && <div className="mt-0.5 text-[10px]" style={{ color: C.fg50 }}>{sub}</div>}
        </div>
        <ChevronRight size={14} style={{ color: C.fg35, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </button>
      {open && detail && <DetailPanel>{detail}</DetailPanel>}
    </div>
  );
}

function ToggleRow({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((v) => !v); }}
        className="flex h-[52px] w-full items-center gap-3 px-4 text-left"
      >
        <span className="flex-1 text-[14px] font-medium">{label}</span>
        <Toggle on={on} onToggle={onToggle} />
        <ChevronRight size={14} style={{ color: C.fg35, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
      </div>
      {open && (
        <DetailPanel>
          <div className="text-[11px]" style={{ color: C.fg50 }}>알림 수신 시간대 및 채널을 설정합니다.</div>
          <div className="flex gap-2">
            <ActionBtn label="스케줄 관리" />
            <ActionBtn label="채널 설정" />
          </div>
        </DetailPanel>
      )}
    </div>
  );
}

function Divider() {
  return <div className="mx-4 h-px" style={{ background: rgba(C.fg, 0.07) }} />;
}

// 색 헤더 + 접히는 리스트 카드 (연동 툴 / 알림 설정)
function AccordionCard({ title, sub, accent, count, children }: { title: string; sub: string; accent: string; count?: number; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-5 overflow-hidden rounded-2xl" style={{ background: C.surface }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative w-full px-4 pb-4 pt-5 text-left"
        style={{ background: accent }}
      >
        <div className="mb-2 text-[22px] font-black leading-[1.1] tracking-[-.02em]" style={{ color: C.ink }}>{title}</div>
        <div className="text-[10px] font-bold uppercase tracking-[.06em]" style={{ color: C.ink45 }}>{sub}</div>
        <div
          className="absolute right-4 top-4 grid size-6 place-items-center rounded-full"
          style={{ background: rgba(C.ink, 0.15) }}
        >
          {count !== undefined ? (
            <span className="text-[11px] font-black" style={{ color: C.ink }}>{count}</span>
          ) : (
            <ChevronRight size={14} style={{ color: C.ink45, transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          )}
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

// 프로젝트 관리 카드 — 실제 프로젝트 목록(useProjectsContext)을 사용
function ProjectManageCard() {
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const [listOpen, setListOpen] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [openRow, setOpenRow] = useState<string | null>(null);

  return (
    <div className="mb-5 overflow-hidden rounded-2xl" style={{ background: C.surface }}>
      <button
        onClick={() => setListOpen((v) => !v)}
        className="relative w-full px-4 pb-4 pt-5 text-left"
        style={{ background: C.lime }}
      >
        <div className="mb-2.5 text-[22px] font-black leading-[1.1] tracking-[-.02em]" style={{ color: C.ink }}>프로젝트 관리</div>
        <div className="text-[10px] font-bold uppercase tracking-[.06em]" style={{ color: C.ink45 }}>목록 · AI 마일스톤 · 팀 초대</div>
        <div
          className="absolute right-4 top-4 flex h-[26px] items-center gap-1 rounded-full px-2.5"
          style={{ background: rgba(C.ink, 0.15) }}
        >
          <span className="text-[10px] font-bold" style={{ color: C.ink }}>목록</span>
          <ChevronRight size={12} style={{ color: C.ink45, transform: listOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
        </div>
      </button>

      {listOpen && (
        <div>
          {projects.map((project, i) => (
            <div key={project.id}>
              {i > 0 && <Divider />}
              <div>
                <button
                  onClick={() => setOpenRow((cur) => (cur === project.id ? null : project.id))}
                  className="flex h-12 w-full items-center gap-3 px-4 text-left"
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ background: project.color }} />
                  <span className="flex-1 text-[14px] font-medium">{project.name}</span>
                  <ChevronRight size={14} style={{ color: C.fg35, transform: openRow === project.id ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
                </button>
                {openRow === project.id && (
                  <DetailPanel>
                    <div className="text-[11px]" style={{ color: C.fg50 }}>{project.name} 프로젝트입니다.</div>
                    <div className="h-px" style={{ background: rgba(C.fg, 0.07) }} />
                    <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.08em]" style={{ color: C.fg35 }}>팀 초대</div>
                    <div className="flex h-8 items-center rounded-lg px-3" style={{ background: C.surfaceHigh }}>
                      <span className="text-[12px]" style={{ color: C.fg20 }}>이메일 입력</span>
                    </div>
                    <div className="flex gap-2">
                      <ActionBtn label="초대 보내기" primary />
                      <ActionBtn label="권한 설정 ›" />
                    </div>
                    <div className="mt-0.5 flex gap-2">
                      <ActionBtn label="채팅 열기" primary onClick={() => navigate("/chat")} />
                      <ActionBtn label="설정" />
                    </div>
                  </DetailPanel>
                )}
              </div>
            </div>
          ))}
          <Divider />
          <button
            onClick={() => navigate("/create-project")}
            className="flex h-12 w-full items-center gap-3 px-4 text-left"
          >
            <span className="size-2 shrink-0 rounded-full" style={{ border: `1.5px solid ${C.fg35}` }} />
            <span className="flex-1 text-[14px] font-medium" style={{ color: C.fg50 }}>새 프로젝트 추가</span>
            <Plus size={16} style={{ color: C.fg35 }} />
          </button>
          <Divider />

          <button onClick={() => setAiOpen((v) => !v)} className="flex h-[52px] w-full items-center gap-3 px-4 text-left">
            <div className="size-8 shrink-0 rounded-[10px]" style={{ background: C.bg }} />
            <span className="flex-1 text-[14px] font-medium">AI 마일스톤 제안</span>
            <span
              className="mr-1.5 flex items-center gap-1 rounded-[5px] px-1.5 py-0.5 text-[9px] font-bold tracking-[.06em]"
              style={{ background: C.purple }}
            >
              <Sparkles size={9} />AI
            </span>
            <ChevronRight size={14} style={{ color: C.fg35, transform: aiOpen ? "rotate(90deg)" : "none", transition: "transform .2s" }} />
          </button>
          {aiOpen && (
            <DetailPanel>
              <div className="text-[11px]" style={{ color: C.fg50 }}>AI가 프로젝트 목표를 분석해 마일스톤을 자동 제안합니다.</div>
              <ActionBtn label="마일스톤 생성하기" primary />
            </DetailPanel>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 화면 ──────────────────────────────────────────────────────────────────────

export default function MyPage() {
  const navigate = useNavigate();
  const { projects } = useProjectsContext();
  const { profile } = useProfile();
  const { integrations, toggleIntegration } = useIntegrations();
  const { settings, toggleSetting } = useNotificationSettings();

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <main className="flex size-full flex-col overflow-hidden bg-[#1C1C1E] text-[#f0f0ec]">
      <header className="px-5 pb-3 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">마이 페이지</h1>
          <div className="flex gap-2">
            <Btn><Search size={16} strokeWidth={2.2} /></Btn>
            <Btn><MoreHorizontal size={17} strokeWidth={2.2} /></Btn>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none]">
        {/* 프로필 카드 */}
        <div className="mb-5 overflow-hidden rounded-2xl" style={{ background: C.red }}>
          <div className="flex items-center gap-3.5 px-4 pt-5">
            <div className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: rgba(C.ink, 0.2) }}>
              <span className="text-[18px] font-black" style={{ color: C.ink }}>{profile.avatarInitial}</span>
            </div>
            <div className="flex-1">
              <div className="mb-0.5 text-[20px] font-black leading-[1.1] tracking-[-.02em]" style={{ color: C.ink }}>{profile.name}</div>
              <div className="mb-1.5 text-[11px]" style={{ color: C.ink70 }}>{profile.email}</div>
              <span className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5" style={{ background: rgba(C.ink, 0.15) }}>
                <span className="size-[5px] rounded-full" style={{ background: C.ink, opacity: 0.4 }} />
                <span className="text-[10px] font-medium" style={{ color: C.ink70 }}>{profile.team}</span>
              </span>
            </div>
            <button
              onClick={() => navigate("/mypage/edit")}
              className="h-8 shrink-0 rounded-full px-3.5 text-[12px] font-bold transition-opacity active:opacity-60"
              style={{ background: rgba(C.ink, 0.2), color: C.ink }}
            >
              편집
            </button>
          </div>
          <div className="mt-4 flex" style={{ borderTop: `1px solid ${rgba(C.ink, 0.12)}` }}>
            {[
              [String(projects.length), "프로젝트"],
              [String(profile.teamMembers), "팀원"],
              [String(profile.tasks), "태스크"],
            ].map(([val, label], i) => (
              <div
                key={label}
                className="flex h-12 flex-1 flex-col items-center justify-center gap-0.5"
                style={i > 0 ? { borderLeft: `1px solid ${rgba(C.ink, 0.12)}` } : undefined}
              >
                <span className="text-[16px] font-black" style={{ color: C.ink }}>{val}</span>
                <span className="text-[9px] font-medium uppercase tracking-[.06em]" style={{ color: C.ink45 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 프로젝트 관리 — lime */}
        <ProjectManageCard />

        {/* 연동 툴 — blue */}
        <AccordionCard title="연동 툴" sub="Figma · Notion · Slack · Drive" accent={C.blue} count={connectedCount}>
          {integrations.map((tool, i) => (
            <div key={tool.id}>
              {i > 0 && <Divider />}
              <Row
                label={tool.name}
                sub={tool.connected ? "연동됨" : "미연동"}
                detail={
                  <>
                    <div className="text-[11px]" style={{ color: C.fg50 }}>
                      {tool.connected ? `${tool.name} 워크스페이스와 연동돼 있습니다.` : `${tool.name} 계정을 연결하세요.`}
                    </div>
                    <ActionBtn
                      label={tool.connected ? "연동 해제" : "연결하기"}
                      primary={!tool.connected}
                      onClick={() => toggleIntegration(tool.id)}
                    />
                  </>
                }
              />
            </div>
          ))}
        </AccordionCard>

        {/* 알림 설정 — pink */}
        <AccordionCard title="알림 설정" sub="푸시 · 이메일 · 미팅 리마인더" accent={C.pink}>
          <ToggleRow label="푸시 알림" on={settings.push} onToggle={() => toggleSetting("push")} />
          <Divider />
          <ToggleRow label="이메일 알림" on={settings.email} onToggle={() => toggleSetting("email")} />
          <Divider />
          <ToggleRow label="미팅 리마인더" on={settings.meetingReminder} onToggle={() => toggleSetting("meetingReminder")} />
        </AccordionCard>
      </div>
    </main>
  );
}
