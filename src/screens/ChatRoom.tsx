import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft, ArrowRight, Calendar, Camera, Check, ChevronLeft,
  FileText, Image, MapPin, Mic, PhoneOff, Plus, Send, Users, X,
} from "lucide-react";
import { Btn, C, dim, muted } from "./chatShared";
import { useChatMessages, useChatParticipants, useChatRoom } from "@/data/useChatData";

// 백엔드가 내려주는 데이터가 아니라 클라이언트가 고정으로 제공하는 첨부
// 옵션이라 mock-데이터 스왑 대상이 아니다. useChatData.ts와 구분해서 여기 둔다.
const ATTACHMENT_OPTIONS = [
  { label: "카메라", icon: Camera },
  { label: "사진", icon: Image },
  { label: "파일", icon: FileText },
  { label: "위치", icon: MapPin },
];

export default function ChatRoom() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { room } = useChatRoom(Number(roomId));
  const { messages } = useChatMessages();
  const { participants } = useChatParticipants();
  const themeColor = room.color;

  // 퍼플은 어두운 색이므로 위의 글자는 밝게, 나머지(라임·핑크)는 어둡게
  const isDarkTheme = themeColor === C.purple;
  const themeText = isDarkTheme ? C.fg : C.ink;

  const [phase, setPhase] = useState<"idle" | "ending" | "done">("idle");
  const [sheet, setSheet] = useState(false);
  const [step, setStep] = useState(0);
  const [attach, setAttach] = useState(false);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [people, setPeople] = useState(false);
  const [checks, setChecks] = useState([false, true, false]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (recording) {
      setSeconds(0);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (timer.current) {
      clearInterval(timer.current);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [recording]);

  const endSession = () => {
    setPhase("ending");
    setAttach(false);
    setRecording(false);
    window.setTimeout(() => { setPhase("done"); setSheet(true); }, 1800);
  };

  const next = () => (step < 2 ? setStep(step + 1) : setSheet(false));

  return (
    <main className="relative flex size-full flex-col overflow-hidden bg-[#1e1f23] text-[#f0f0ec]">
      <header className="relative z-10 flex items-center gap-2.5 border-b border-white/[.07] px-3 py-2.5">
        <Btn onClick={() => navigate("/chat")}><ArrowLeft size={17} strokeWidth={2.2} /></Btn>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-bold tracking-[-.02em]">{room.title}</p>
          <div className="mt-[2px] flex items-center gap-1.5">
            <span className="inline-block size-[6px] rounded-full" style={{ background: themeColor }} />
            <p className="truncate text-[11px]" style={{ color: muted }}>{room.project} · {room.time}</p>
          </div>
        </div>
        <Btn onClick={() => { setPeople(true); setAttach(false); }}>
          <Users size={16} strokeWidth={2.2} />
        </Btn>
        <button
          disabled={phase !== "idle"}
          onClick={endSession}
          className="flex h-10 items-center gap-1.5 rounded-xl bg-[#27282d] px-3.5 text-[12px] font-bold transition-opacity active:opacity-60 disabled:opacity-30"
          style={{ color: C.red }}
        >
          <PhoneOff size={13} strokeWidth={2.2} />종료
        </button>
      </header>

      <div
        className="flex-1 overflow-y-auto px-4 py-5 [scrollbar-width:none]"
        onClick={() => setAttach(false)}
      >
        <div className="mx-auto mb-5 w-fit rounded-full px-3 py-1 text-[10px] font-medium tracking-[.04em]" style={{ color: muted }}>
          오늘 · 14:00
        </div>

        {messages.map((msg, i) =>
          msg[0] === "시스템" ? (
            <p key={i} className="my-5 text-center text-[10px] font-medium tracking-[.03em]" style={{ color: dim }}>{msg[1]}</p>
          ) : msg[0] === "나" ? (
            /* 보낸 메시지 — 테마 색 말풍선 */
            <div key={i} className="mb-3 flex justify-end">
              <div
                className="max-w-[78%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-[13px] font-medium leading-[1.5]"
                style={{ background: themeColor, color: themeText }}
              >
                {msg[1]}
              </div>
            </div>
          ) : (
            /* 받은 메시지 — 중립 회색 말풍선, 화자 색은 아바타에만 */
            <div key={i} className="mb-3 flex items-start gap-2">
              <div
                className="grid size-7 shrink-0 place-items-center rounded-lg text-[9px] font-black"
                style={{ background: msg[2], color: C.ink }}
              >
                {String(msg[0]).slice(0, 1)}
              </div>
              <div className="max-w-[70%]">
                <p className="mb-1 text-[10px] font-medium" style={{ color: muted }}>{msg[0]}</p>
                <div
                  className="rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-[13px] font-medium leading-[1.5]"
                  style={{ background: C.surface, color: C.fg }}
                >
                  {msg[1]}
                </div>
              </div>
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {phase === "ending" && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 grid place-items-center bg-[#1e1f23]/95 backdrop-blur-sm"
          >
            <div className="text-center">
              <div className="mx-auto mb-5 flex w-fit gap-2">
                {[C.red, C.yellow, themeColor].map((color, i) => (
                  <motion.i
                    key={i}
                    className="size-2.5 rounded-full"
                    style={{ background: color }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14 }}
                  />
                ))}
              </div>
              <p className="text-[15px] font-bold">AI가 미팅을 정리하고 있어요</p>
              <p className="mt-1.5 text-[11px] font-medium" style={{ color: muted }}>핵심 내용과 액션 아이템을 추출 중</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {attach && (
          <motion.div
            initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }}
            className="relative z-10 mx-3 mb-2 grid grid-cols-4 overflow-hidden rounded-2xl bg-[#27282d]"
          >
            {ATTACHMENT_OPTIONS.map((item, idx) => (
              <button
                key={item.label}
                onClick={() => setAttach(false)}
                className={`flex flex-col items-center gap-2 py-4 transition-opacity active:opacity-60 ${idx < 3 ? "border-r border-white/[.07]" : ""}`}
              >
                <span className="grid size-10 place-items-center rounded-xl bg-[#32333a]">
                  <item.icon size={16} strokeWidth={2} style={{ color: C.fg }} />
                </span>
                <span className="text-[10px] font-medium" style={{ color: muted }}>{item.label}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <footer className="relative z-10 border-t border-white/[.07] px-3 pb-5 pt-3">
        {recording ? (
          <div className="flex items-center gap-3 rounded-2xl bg-[#27282d] p-2">
            <Btn onClick={() => setRecording(false)}><X size={17} strokeWidth={2} /></Btn>
            <div className="flex flex-1 items-center gap-2.5">
              <span className="flex items-end gap-[3px]">
                {[6, 12, 8, 14, 9].map((h, i) => (
                  <motion.span
                    key={i}
                    className="w-[3px] rounded-full"
                    style={{ height: h, background: C.red }}
                    animate={{ scaleY: [1, 1.9, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
              </span>
              <div>
                <p className="text-[12px] font-bold">
                  녹음 중 · {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
                </p>
                <p className="text-[10px] font-medium" style={{ color: muted }}>눌러서 저장하기</p>
              </div>
            </div>
            <Btn onClick={() => setRecording(false)}><Check size={17} strokeWidth={2.2} /></Btn>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Btn onClick={() => setAttach(!attach)}>
              <Plus size={18} strokeWidth={2} className={`transition-transform duration-200 ${attach ? "rotate-45" : ""}`} />
            </Btn>
            <div className="flex h-11 flex-1 items-center rounded-2xl bg-[#27282d] px-4 text-[13px]" style={{ color: dim }}>
              메시지 보내기
            </div>
            <Btn onClick={() => setRecording(true)}><Mic size={16} strokeWidth={2.2} /></Btn>
            <Btn><Send size={15} strokeWidth={2.2} /></Btn>
          </div>
        )}
      </footer>

      <AnimatePresence>
        {people && (
          <motion.div
            className="absolute inset-0 z-20 flex items-end bg-black/50"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setPeople(false)}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full rounded-t-[28px] bg-[#27282d] p-5 pb-8 text-[#f0f0ec]"
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold tracking-[.12em] uppercase" style={{ color: muted }}>
                    참여자 · {participants.length}
                  </p>
                  <h2 className="mt-1 text-[22px] font-black leading-tight tracking-[-.03em]">이번 세션의 사람들</h2>
                </div>
                <Btn onClick={() => setPeople(false)}><X size={17} strokeWidth={2} /></Btn>
              </div>
              {participants.map((person) => (
                <div key={person.name} className="mb-2 flex items-center gap-3 rounded-xl bg-[#32333a] p-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-[11px] font-black text-[#1e1f23]"
                    style={{ background: person.color }}
                  >
                    {person.initials}
                  </span>
                  <div className="flex-1">
                    <p className="text-[14px] font-bold">{person.name}</p>
                    <p className="text-[11px]" style={{ color: muted }}>{person.role}</p>
                  </div>
                  <span className="size-2 rounded-full" style={{ background: themeColor }} />
                </div>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {sheet && (
          <motion.div
            className="absolute inset-0 z-30 flex items-end bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSheet(false)}
          >
            <motion.section
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full rounded-t-[28px] bg-[#27282d] p-5 pb-8 text-[#f0f0ec]"
            >
              <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-white/20" />

              {/* 단계 표시 — 테마 색 */}
              <div className="mb-5 flex gap-1.5">
                {[0, 1, 2].map((item) => (
                  <i
                    key={item}
                    className="h-[3px] flex-1 rounded-full transition-colors duration-300"
                    style={{ background: item <= step ? themeColor : C.fg20 }}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.18 }}
                >
                  {step === 0 && (
                    <>
                      <p className="text-[10px] font-bold tracking-[.12em] uppercase" style={{ color: muted }}>AI Summary</p>
                      <h2 className="mt-1.5 text-[26px] font-black leading-none tracking-[-.03em]">미팅 요약</h2>
                      {/* 요약 카드 — 테마 색 */}
                      <div
                        className="mt-4 rounded-2xl p-4 text-[13px] font-medium leading-[1.65]"
                        style={{ background: themeColor, color: themeText }}
                      >
                        최종 카드 레이아웃을 확정했고, 모바일에서도 선명한 테두리 톤을 유지하기로 했어요. 핸드오프 스펙과 리뷰 담당자도 정리됐습니다.
                      </div>
                    </>
                  )}
                  {step === 1 && (
                    <>
                      <p className="text-[10px] font-bold tracking-[.12em] uppercase" style={{ color: muted }}>Action Items</p>
                      <h2 className="mt-1.5 text-[26px] font-black leading-none tracking-[-.03em]">다음 할 일</h2>
                      <div className="mt-4 space-y-2">
                        {["유나: 목요일까지 카드 레이아웃 확정", "민지: 핸드오프 스펙 작성", "도윤: 모바일 화면 리뷰"].map((item, i) => (
                          <button
                            key={item}
                            onClick={() => setChecks(checks.map((v, idx) => idx === i ? !v : v))}
                            className="flex w-full items-center gap-3 rounded-xl bg-[#32333a] p-3.5 text-left transition-opacity active:opacity-70"
                          >
                            <span
                              className="grid shrink-0 place-items-center rounded-md transition-colors"
                              style={{
                                width: 20, height: 20,
                                background: checks[i] ? themeColor : "transparent",
                                outline: checks[i] ? "none" : `1.5px solid ${C.fg35}`,
                                color: isDarkTheme ? C.fg : C.ink,
                              }}
                            >
                              {checks[i] && <Check size={12} strokeWidth={3} />}
                            </span>
                            <span
                              className={`text-[13px] font-medium ${checks[i] ? "line-through" : ""}`}
                              style={{ color: checks[i] ? muted : C.fg }}
                            >
                              {item}
                            </span>
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <p className="text-[10px] font-bold tracking-[.12em] uppercase" style={{ color: muted }}>Recommended</p>
                      <h2 className="mt-1.5 text-[26px] font-black leading-none tracking-[-.03em]">다음 미팅 제안</h2>
                      <div className="mt-4 rounded-2xl p-4" style={{ background: C.blue, color: C.ink }}>
                        <div className="flex items-center gap-2.5 text-[15px] font-bold">
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#1e1f23]/15">
                            <Calendar size={15} strokeWidth={2.2} />
                          </span>
                          목요일 · 오후 2:00
                        </div>
                        <p className="mt-3 text-[12px] font-medium opacity-70">디자인 핸드오프 후속 점검 · 30분</p>
                      </div>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>

              <div className="mt-5 flex gap-2">
                {step > 0 && (
                  <button
                    onClick={() => setStep(step - 1)}
                    className="grid size-12 shrink-0 place-items-center rounded-xl bg-[#32333a] text-[#f0f0ec] transition-opacity active:opacity-60"
                  >
                    <ChevronLeft size={20} strokeWidth={2.2} />
                  </button>
                )}
                {/* CTA 버튼 — 핫핑크 고정 */}
                <button
                  onClick={next}
                  className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl text-[14px] font-black text-white transition-opacity active:opacity-80"
                  style={{ background: C.red }}
                >
                  {step === 2 ? "완료" : "계속하기"}
                  <ArrowRight size={16} strokeWidth={2.8} />
                </button>
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
