import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { Calendar, ChevronDown, MoreHorizontal, Plus, Search, Users } from "lucide-react";
import { Btn, C, rgba } from "./chatShared";
import { useChatRoomGroups } from "@/data/useChatData";

export default function Chat() {
  const navigate = useNavigate();
  const { groups } = useChatRoomGroups();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggle = (p: string) => setExpanded((e) => ({ ...e, [p]: !e[p] }));

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
          const isOpen = !!expanded[group.project];
          const words = group.project.split(" ");
          const totalUnread = group.rooms.reduce((s, r) => s + r.unread, 0);

          return (
            <section key={group.project} className="mb-3">
              <AnimatePresence mode="wait" initial={false}>
                {!isOpen ? (
                  <motion.button
                    key="closed"
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.18 }}
                    onClick={() => toggle(group.project)}
                    className="relative w-full rounded-2xl p-5 pb-4 text-left transition-opacity active:opacity-80"
                    style={{ background: group.color }}
                  >
                    <h2
                      className="font-black leading-[1.12] tracking-[-.04em]"
                      style={{ fontSize: "clamp(30px,8.5vw,38px)", color: C.ink }}
                    >
                      {words.map((w, i) => <span key={i} className="block">{w}</span>)}
                    </h2>

                    <div className="mt-4 flex items-center gap-4">
                      {group.rooms.map((r) => (
                        <span key={r.id} className="text-[10px] font-black tracking-[.07em] uppercase" style={{ color: C.ink45 }}>
                          {r.title}
                        </span>
                      ))}
                    </div>

                    {totalUnread > 0 && (
                      <span
                        className="absolute right-4 top-4 grid size-6 place-items-center rounded-full text-[11px] font-black text-white"
                        style={{ background: C.red }}
                      >
                        {totalUnread}
                      </span>
                    )}
                  </motion.button>
                ) : (
                  <motion.div
                    key="open"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      onClick={() => toggle(group.project)}
                      className="mb-2.5 flex w-full items-center gap-2 px-0.5"
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ background: group.color }} />
                      <span className="flex-1 text-left text-[11px] font-bold tracking-[.06em] uppercase" style={{ color: C.fg70 }}>
                        {group.project}
                      </span>
                      <ChevronDown size={14} strokeWidth={2.5} className="rotate-180" style={{ color: C.fg35 }} />
                    </button>

                    <div className="space-y-2 pr-2 pt-2 -mr-2 -mt-2">
                      {group.rooms.map((room) => (
                        <button
                          key={room.id}
                          onClick={() => navigate(`/chat/${room.id}`)}
                          className="relative flex w-full items-center gap-3.5 rounded-2xl p-3.5 text-left transition-opacity active:opacity-75"
                          style={{ background: group.color }}
                        >
                          <div
                            className="grid size-11 shrink-0 place-items-center rounded-xl text-[11px] font-black"
                            style={{ background: rgba(C.ink, 0.12), color: C.ink }}
                          >
                            {room.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <strong className="truncate text-[14px] font-bold tracking-[-.01em]" style={{ color: C.ink }}>
                                {room.title}
                              </strong>
                              <span className="shrink-0 text-[10px] font-medium" style={{ color: C.ink45 }}>방금</span>
                            </div>
                            <p className="mt-[3px] truncate text-[12px]" style={{ color: C.ink70 }}>{room.note}</p>
                            <div className="mt-2 flex items-center gap-1.5 text-[10px] font-medium" style={{ color: C.ink45 }}>
                              <Calendar size={10} strokeWidth={2.5} />
                              <span>{room.time}</span>
                              <span className="mx-0.5 size-[3px] rounded-full bg-current" />
                              <Users size={10} strokeWidth={2.5} />
                              <span>{room.people}명</span>
                            </div>
                          </div>
                          {room.unread > 0 && (
                            <span
                              className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full text-[10px] font-black text-white"
                              style={{ background: C.red }}
                            >
                              {room.unread}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
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
