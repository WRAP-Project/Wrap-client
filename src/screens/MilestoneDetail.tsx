import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Paperclip, Plus } from "lucide-react";
import {
  useMilestoneDetail,
  type ChecklistDraft,
  type ChecklistItem,
  type ChecklistStatus,
} from "@/data/useMilestoneDetail";
import { useTeamMembers } from "@/data/useTeamMembers";

const STATUS_LABEL: Record<ChecklistStatus, string> = {
  done: "완료",
  in_progress: "진행 중",
  blocked: "위험",
  pending: "대기",
};

/** 추가 폼에서 고를 수 있는 상태 — 화면에 보이는 순서 그대로 */
const STATUS_OPTIONS: ChecklistStatus[] = ["pending", "in_progress", "done", "blocked"];

const ACCENT = "#7B46F8";

function ChecklistRow({ item }: { item: ChecklistItem }) {
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
          {note ?? (assignee || "담당 미정")}
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

/** 담당자·상태 선택에 쓰는 알약 버튼 — 선택되면 액센트로 채운다 */
function Chip({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-opacity active:opacity-60"
      style={{
        background: selected ? ACCENT : "rgba(28,28,30,0.06)",
        color: selected ? "#fff" : "rgba(28,28,30,0.55)",
      }}
    >
      {label}
    </button>
  );
}

/**
 * 체크리스트 항목 추가 폼 — 목록 맨 아래 행을 눌렀을 때 그 자리에서 펼쳐진다.
 * 별도 화면·시트로 빼지 않은 건, 추가한 항목이 바로 위에 쌓이는 게 보여야
 * 연속으로 여러 개 넣기 편해서다.
 */
function ChecklistAddForm({
  projectId,
  onAdd,
  onClose,
}: {
  projectId: string | undefined;
  onAdd: (draft: ChecklistDraft) => void;
  onClose: () => void;
}) {
  const { members } = useTeamMembers(projectId ?? null);
  const [label, setLabel] = useState("");
  const [assignee, setAssignee] = useState("");
  const [status, setStatus] = useState<ChecklistStatus>("pending");

  const canSubmit = label.trim() !== "";

  const submit = () => {
    if (!canSubmit) return;
    onAdd({ label, assignee, status });
    // 연속 입력을 위해 폼은 닫지 않고 입력값만 비운다.
    setLabel("");
    setAssignee("");
    setStatus("pending");
  };

  return (
    <div className="px-4 py-3.5 flex flex-col gap-3" style={{ background: "rgba(123,70,248,0.04)" }}>
      <input
        autoFocus
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") onClose();
        }}
        placeholder="무엇을 제출하나요?"
        className="w-full bg-transparent text-[14px] font-semibold outline-none"
        style={{ color: "#1C1C1E" }}
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.06em]" style={{ color: "rgba(28,28,30,0.35)" }}>
          담당
        </span>
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          <Chip selected={assignee === ""} label="미정" onClick={() => setAssignee("")} />
          {members.map((m) => (
            <Chip
              key={m.id}
              selected={assignee === m.initials}
              label={m.initials}
              onClick={() => setAssignee(m.initials)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-bold tracking-[0.06em]" style={{ color: "rgba(28,28,30,0.35)" }}>
          상태
        </span>
        <div className="flex gap-1.5">
          {STATUS_OPTIONS.map((s) => (
            <Chip key={s} selected={status === s} label={STATUS_LABEL[s]} onClick={() => setStatus(s)} />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onClose}
          className="h-10 flex-1 rounded-xl text-[13px] font-bold transition-opacity active:opacity-60"
          style={{ background: "rgba(28,28,30,0.06)", color: "rgba(28,28,30,0.55)" }}
        >
          닫기
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="h-10 flex-1 rounded-xl text-[13px] font-bold text-white transition-opacity active:opacity-60 disabled:opacity-30"
          style={{ background: ACCENT }}
        >
          추가
        </button>
      </div>
    </div>
  );
}

export default function MilestoneDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data, addChecklistItem } = useMilestoneDetail(projectId);
  const { header, stats, checklist, update } = data;
  const [adding, setAdding] = useState(false);

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
              <ChecklistRow key={item.id} item={item} />
            ))}
            {adding ? (
              <ChecklistAddForm
                projectId={projectId}
                onAdd={addChecklistItem}
                onClose={() => setAdding(false)}
              />
            ) : (
              /* 목록 맨 아래 추가 행 — 항목이 0개일 때는 빈 카드 대신 이 행만 보인다 */
              <button
                onClick={() => setAdding(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 transition-opacity active:opacity-60"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(123,70,248,0.12)" }}
                >
                  <Plus size={14} strokeWidth={3} color={ACCENT} />
                </div>
                <span className="text-[14px] font-semibold" style={{ color: ACCENT }}>
                  항목 추가
                </span>
              </button>
            )}
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
          {update ? (
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
          ) : (
            <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "rgba(240,240,236,0.06)" }}>
              <p className="text-[12px] font-semibold" style={{ color: "rgba(240,240,236,0.5)" }}>
                아직 공유된 업데이트가 없어요
              </p>
            </div>
          )}
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
