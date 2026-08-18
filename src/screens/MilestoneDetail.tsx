import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Paperclip } from "lucide-react";
import { useMilestoneDetail, type ChecklistStatus } from "@/data/useMilestoneDetail";

const STATUS_LABEL: Record<ChecklistStatus, string> = {
  done: "완료",
  in_progress: "진행 중",
  blocked: "위험",
  pending: "대기",
};

function ChecklistRow({ item }: { item: { label: string; assignee: string; status: ChecklistStatus; note?: string } }) {
  const { label, assignee, status, note } = item;
  return (
    <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
      {status === "done" ? (
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: "#7B46F8" }}>
          <Check size={13} strokeWidth={3} color="#fff" />
        </div>
      ) : status === "in_progress" ? (
        <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ border: "2px solid #F5C842" }}>
          <div className="w-2 h-2 rounded-full" style={{ background: "#F5C842" }} />
        </div>
      ) : (
        <div className="w-6 h-6 rounded-full shrink-0" style={{ border: "2px solid rgba(28,28,30,0.15)" }} />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: "#1C1C1E" }}>
          {label}
        </p>
        <p className="text-[11px] font-medium truncate" style={{ color: "rgba(28,28,30,0.45)" }}>
          {note ?? assignee}
        </p>
      </div>
      {status === "blocked" && (
        <span
          className="text-[10px] font-black px-2 py-1 rounded-md shrink-0"
          style={{ background: "#EB3E88", color: "#fff" }}
        >
          {STATUS_LABEL.blocked}
        </span>
      )}
    </div>
  );
}

export default function MilestoneDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data } = useMilestoneDetail(projectId);
  const { header, stats, checklist, update } = data;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#1C1C1E", color: "#F0F0EC" }}>
      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-8 [scrollbar-width:none] flex flex-col gap-5">
        {/* 뒤로가기 */}
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 -ml-1 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <ArrowLeft size={16} strokeWidth={2.5} color="#F0F0EC" />
        </button>

        <h1 className="text-[22px] font-black leading-tight tracking-[-0.03em]">마일스톤 상세</h1>

        {/* 헤더 카드 */}
        <div className="rounded-2xl p-5 flex flex-col gap-3" style={{ background: "#7B46F8" }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>
              D-{header.dday} 마감
            </span>
            <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.65)" }}>
              {header.statusBadge}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <p className="text-[19px] font-bold" style={{ color: "#fff" }}>{header.title}</p>
            <p className="text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.60)" }}>{header.datetime}</p>
          </div>

          <div className="relative h-2 rounded-full mt-1" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div
              className="absolute left-0 top-0 h-full rounded-full"
              style={{ width: `${header.readyPercent}%`, background: "#fff" }}
            />
          </div>
          <p className="text-[11px] font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
            준비 진행률 {header.readyPercent}%
          </p>
        </div>

        {/* 통계 3칸 */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: `${stats.checklistDone}/${stats.checklistTotal}`, label: "체크리스트" },
            { value: `${stats.fileCount}개`, label: "첨부 파일" },
            { value: `${stats.participantCount}명`, label: "참여자" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl py-3 flex flex-col items-center gap-1" style={{ background: "#fff" }}>
              <span className="text-[16px] font-black" style={{ color: "#1C1C1E" }}>{s.value}</span>
              <span className="text-[10px] font-medium" style={{ color: "rgba(28,28,30,0.45)" }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* 제출 체크리스트 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              제출 체크리스트
            </p>
            <span className="text-[11px] font-semibold" style={{ color: "rgba(240,240,236,0.45)" }}>
              {stats.checklistDone} / {stats.checklistTotal}
            </span>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: "#fff" }}>
            {checklist.map((item) => (
              <ChecklistRow key={item.label} item={item} />
            ))}
          </div>
        </section>

        {/* 자료 및 최근 업데이트 */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold tracking-[0.06em] uppercase" style={{ color: "rgba(240,240,236,0.45)" }}>
              자료 및 최근 업데이트
            </p>
            <span className="text-[11px] font-semibold" style={{ color: "rgba(240,240,236,0.45)" }}>
              파일 {stats.fileCount}개
            </span>
          </div>
          <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "#fff" }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0"
              style={{ background: "#A78BFA", color: "#fff" }}
            >
              {update.author}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium" style={{ color: "#1C1C1E" }}>&ldquo;{update.text}&rdquo;</p>
              <p className="text-[11px] font-medium mt-1" style={{ color: "rgba(28,28,30,0.4)" }}>
                {update.author} · {update.time}
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* 하단 고정 액션 */}
      <div className="shrink-0 px-4 pb-8 pt-2 flex gap-3">
        <button
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 transition-opacity active:opacity-70"
          style={{ background: "rgba(240,240,236,0.08)" }}
        >
          <Paperclip size={18} color="#F0F0EC" />
        </button>
        <button
          className="flex-1 rounded-2xl text-[15px] font-bold transition-opacity active:opacity-70"
          style={{ background: "#F0F0EC", color: "#1C1C1E" }}
        >
          체크리스트 업데이트
        </button>
      </div>
    </div>
  );
}
