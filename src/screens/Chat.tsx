import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { Calendar, ChevronRight, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { Btn, C, rgba } from "./chatShared";
import { useChatRoomGroups } from "@/data/useChatData";
import { useProjectsContext } from "@/data/ProjectsContext";

export default function Chat() {
  const navigate = useNavigate();
  const { groups } = useChatRoomGroups();
  const { selectedProjectId, selectProject } = useProjectsContext();

  // 한 번에 하나의 그룹만 펼친다 — 기본값은 홈에서 선택한 프로젝트, 없으면 첫 그룹.
  const [openProjectId, setOpenProjectId] = useState<string | null>(
    selectedProjectId ?? groups[0]?.projectId ?? null,
  );

  const openGroup = (projectId: string) => {
    setOpenProjectId(projectId);
    selectProject(projectId); // 채팅 탭에서 고른 프로젝트도 전역 선택 상태에 반영
  };

  return (
    <main className="flex size-full flex-col overflow-hidden bg-[#1e1f23] text-[#f0f0ec]">
      <header className="px-5 pb-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[26px] font-black leading-none tracking-[-.03em]">Chat</h1>
          <div className="flex gap-2">
            <Btn><Search size={16} strokeWidth={2.2} /></Btn>
            <Btn><MoreHorizontal size={17} strokeWidth={2.2} /></Btn>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pb-8 [scrollbar-width:none]">
        {groups.map((group) => {
          const isOpen = group.projectId === openProjectId;
          const totalUnread = group.rooms.reduce((s, r) => s + r.unread, 0);

          if (!isOpen) {
            return (
              <button
                key={group.projectId}
                onClick={() => openGroup(group.projectId)}
                className="mb-2 flex w-full items-center gap-2.5 rounded-2xl px-3.5 py-3 text-left transition-opacity active:opacity-70"
                style={{ background: C.surface }}
              >
                <span className="size-2 shrink-0 rounded-full" style={{ background: group.color }} />
                <span className="flex-1 truncate text-[13px] font-bold tracking-[-.01em]">{group.project}</span>
                {totalUnread > 0 && (
                  <span
                    className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
                    style={{ background: C.red }}
                  >
                    {totalUnread}
                  </span>
                )}
                <ChevronRight size={14} strokeWidth={2.4} style={{ color: C.fg35 }} />
              </button>
            );
          }

          return (
            <motion.div
              key={group.projectId}
              layout
              className="relative mb-3 overflow-hidden rounded-2xl p-5 pb-4"
              style={{ background: group.color }}
            >
              <h2
                className="mb-3 font-black leading-[1.12] tracking-[-.03em]"
                style={{ fontSize: "clamp(26px,7.5vw,32px)", color: C.ink }}
              >
                {group.project}
              </h2>

              <div>
                {group.rooms.map((room, i) => (
                  <div key={room.id}>
                    {i > 0 && <div className="h-px" style={{ background: rgba(C.ink, 0.12) }} />}
                    <button
                      onClick={() => navigate(`/chat/${room.id}`)}
                      className="flex w-full items-center gap-3 py-3 text-left transition-opacity active:opacity-70"
                    >
                      <div
                        className="grid size-11 shrink-0 place-items-center rounded-xl text-[11px] font-black"
                        style={{ background: rgba(C.ink, 0.12), color: C.ink }}
                      >
                        {room.initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-bold" style={{ color: C.ink }}>{room.title}</p>
                        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium" style={{ color: C.ink70 }}>
                          <Calendar size={10} strokeWidth={2.5} />
                          <span>{room.time}</span>
                          <span className="mx-0.5 size-[3px] rounded-full bg-current" />
                          <Users size={10} strokeWidth={2.5} />
                          <span>{room.people}명</span>
                        </div>
                      </div>
                      {room.unread > 0 && (
                        <span
                          className="grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-black text-white"
                          style={{ background: C.red }}
                        >
                          {room.unread}
                        </span>
                      )}
                      <ChevronRight size={16} strokeWidth={2.4} style={{ color: C.ink45 }} />
                    </button>
                  </div>
                ))}
              </div>

              {/* 그룹 내 방 개수 — 워터마크 */}
              <span
                className="pointer-events-none absolute bottom-1 right-4 font-black leading-none"
                style={{ fontSize: 56, color: rgba(C.ink, 0.15) }}
              >
                {group.rooms.length}
              </span>
            </motion.div>
          );
        })}
        <button
          className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl py-4 transition-opacity active:opacity-60"
          style={{ background: C.surface }}
        >
          <Plus size={18} strokeWidth={2.2} style={{ color: C.fg50 }} />
          <span className="text-[13px] font-bold" style={{ color: C.fg50 }}>새 채팅 추가</span>
        </button>
      </div>
    </main>
  );
}
