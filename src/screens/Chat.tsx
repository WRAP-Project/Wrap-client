import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, Calendar, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { Btn, C, rgba } from "./chatTheme";
import { useChatRoomGroups } from "@/data/useChatData";
import { useProjectsContext } from "@/data/ProjectsContext";

const springLayout = { type: "spring" as const, damping: 36, stiffness: 380, mass: 0.9 };

export default function Chat() {
  const navigate = useNavigate();
  const { groups } = useChatRoomGroups();
  const { selectedProjectId, selectProject } = useProjectsContext();

  // 한 번에 하나의 그룹만 펼친다 — 기본값은 홈에서 선택한 프로젝트.
  // 아무것도 선택 안 했으면 아무 그룹도 펼치지 않는다(전부 pill 상태).
  const [openProjectId, setOpenProjectId] = useState<string | null>(selectedProjectId);

  const openGroup = (projectId: string) => {
    setOpenProjectId(projectId);
    selectProject(projectId); // 채팅 탭에서 고른 프로젝트도 전역 선택 상태에 반영
  };

  return (
    <main className="flex size-full flex-col overflow-hidden bg-[#0d0e11] text-[#f0f0ec]">
      <header className="shrink-0 px-5 pb-3 pt-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">Chat</h1>
          <div className="flex gap-2">
            <Btn><Search size={16} strokeWidth={2.2} /></Btn>
            <Btn><MoreHorizontal size={17} strokeWidth={2.2} /></Btn>
          </div>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-2 overflow-hidden px-4 pb-2">
        {openProjectId === null && (
          <div className="mb-1 flex flex-col items-center gap-1 rounded-2xl px-4 py-7 text-center" style={{ background: C.surface }}>
            <p className="text-[13px] font-bold" style={{ color: C.fg70 }}>선택된 프로젝트가 없어요</p>
            <p className="text-[11px]" style={{ color: C.fg35 }}>홈에서 프로젝트를 선택하면 여기에 대화가 펼쳐져요</p>
          </div>
        )}
        {groups.map((group, gIdx) => {
          const isOpen = group.projectId === openProjectId;
          const brightGroup = group.color === C.lime || group.color === C.pink;
          const totalUnread = group.rooms.reduce((s, r) => s + r.unread, 0);

          if (!isOpen) {
            /* ── 비활성: 흑백·압축 스트립 ── */
            return (
              <motion.button
                key={group.projectId}
                layout
                layoutId={group.projectId}
                onClick={() => openGroup(group.projectId)}
                className="relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl px-4 active:opacity-40"
                style={{ height: 48, background: "rgba(255,255,255,0.04)" }}
                initial={false}
                animate={{ opacity: 0.3, filter: "saturate(0) brightness(1.3)" }}
                transition={{ layout: springLayout, opacity: { duration: 0.25 }, filter: { duration: 0.25 } }}
              >
                <span className="flex-1 text-left text-[13px] font-bold tracking-[-.01em] text-white/50">
                  {group.project}
                </span>
                {totalUnread > 0 && (
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full text-[9px] font-black text-white"
                    style={{ background: C.red }}
                  >
                    {totalUnread}
                  </span>
                )}
              </motion.button>
            );
          }

          /* ── 활성: flex-1, 쨍한 단색 ── */
          return (
            <motion.div
              key={group.projectId}
              layout
              layoutId={group.projectId}
              className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl"
              style={{ background: group.color }}
              initial={false}
              animate={{ opacity: 1, filter: "saturate(1) brightness(1)" }}
              transition={{ layout: springLayout, opacity: { duration: 0.2 } }}
            >
              {/* 프로젝트명 */}
              <div className="shrink-0 px-5 pt-5 pb-4">
                <h2
                  className="font-black leading-[1.0] tracking-[-.05em]"
                  style={{ fontSize: "clamp(36px,10vw,46px)", color: brightGroup ? C.ink : C.fg }}
                >
                  {group.project.split(" ").map((w, i) => (
                    <span key={i} className="block">{w}</span>
                  ))}
                </h2>
              </div>

              {/* 룸 목록 — 스태거 진입 */}
              <div className="flex-1 overflow-y-auto px-4 pb-5 [scrollbar-width:none]">
                {group.rooms.map((room, rIdx) => (
                  <motion.button
                    key={room.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rIdx * 0.07 + 0.08, duration: 0.22, ease: [0.33, 1, 0.68, 1] }}
                    onClick={() => navigate(`/chat/${room.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left active:opacity-50"
                    style={{ borderTop: rIdx > 0 ? `1px solid ${brightGroup ? rgba(C.ink, 0.1) : "rgba(255,255,255,0.12)"}` : "none" }}
                  >
                    {/* 아바타 */}
                    <div
                      className="grid size-10 shrink-0 place-items-center rounded-xl text-[11px] font-black"
                      style={{
                        background: brightGroup ? rgba(C.ink, 0.1) : "rgba(255,255,255,0.15)",
                        color: brightGroup ? C.ink70 : "rgba(255,255,255,0.7)",
                      }}
                    >
                      {room.initials}
                    </div>
                    {/* 텍스트 */}
                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-[15px] font-black tracking-[-.02em]"
                        style={{ color: brightGroup ? C.ink : C.fg }}
                      >
                        {room.title}
                      </p>
                      <div
                        className="mt-1 flex items-center gap-1.5 text-[11px]"
                        style={{ color: brightGroup ? C.ink45 : "rgba(255,255,255,0.4)" }}
                      >
                        <Calendar size={9} strokeWidth={2.5} />
                        <span>{room.time}</span>
                        <span className="mx-0.5 size-[3px] shrink-0 rounded-full bg-current" />
                        <Users size={9} strokeWidth={2.5} />
                        <span>{room.people}명</span>
                      </div>
                    </div>
                    {/* 미읽음 + 화살표 */}
                    <div className="flex shrink-0 items-center gap-2">
                      {room.unread > 0 && (
                        <span
                          className="grid size-5 place-items-center rounded-full text-[10px] font-black text-white"
                          style={{ background: C.red }}
                        >
                          {room.unread}
                        </span>
                      )}
                      <ArrowRight
                        size={14}
                        strokeWidth={2.5}
                        style={{ color: brightGroup ? C.ink45 : "rgba(255,255,255,0.3)" }}
                      />
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* 우하단 장식 — 프로젝트 인덱스 */}
              <div
                className="pointer-events-none absolute bottom-3 right-5 select-none font-black leading-none tracking-[-.06em]"
                style={{ fontSize: 88, color: rgba(C.ink, 0.07) }}
              >
                {gIdx + 1}
              </div>
            </motion.div>
          );
        })}
        <button
          className="mt-1 flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl py-4 transition-opacity active:opacity-60"
          style={{ background: C.surface }}
        >
          <Plus size={18} strokeWidth={2.2} style={{ color: C.fg50 }} />
          <span className="text-[13px] font-bold" style={{ color: C.fg50 }}>새 채팅 추가</span>
        </button>
      </div>
    </main>
  );
}
