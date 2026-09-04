import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Calendar } from "lucide-react";
import { useProjectsContext } from "@/data/ProjectsContext";
import { DatePickerSheet, type PickedDate } from "@/components/DatePickerSheet";

// 포인트 컬러 옵션
const COLOR_OPTIONS = [
  { id: "green",  hex: "#CDEA6F" },
  { id: "yellow", hex: "#F5E03A" },
  { id: "purple", hex: "#A78BFA" },
  { id: "pink",   hex: "#F4A8A8" },
  { id: "blue",   hex: "#60C8F5" },
];

// "YYYY. MM. DD" 문자열 <-> PickedDate 변환
function parseDeadline(value: string): PickedDate | null {
  if (!value) return null;
  const parts = value.replace(/\./g, "").trim().split(/\s+/);
  if (parts.length !== 3) return null;
  const [y, m, d] = parts.map(Number);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return null;
  return { year: y, month: m - 1, day: d };
}
function formatDeadline({ year, month, day }: PickedDate): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}. ${mm}. ${dd}`;
}
/** 화면 표기("2026. 09. 04")를 ProjectDraft.endDate 형식("2026-09-04")으로 바꾼다. */
function toIsoDate(value: string): string | undefined {
  const picked = parseDeadline(value);
  if (!picked) return undefined;
  const mm = String(picked.month + 1).padStart(2, "0");
  const dd = String(picked.day).padStart(2, "0");
  return `${picked.year}-${mm}-${dd}`;
}

// ── 메인 화면 ──────────────────────────────────────────────────────────────────

export default function CreateProject() {
  const navigate = useNavigate();
  const { addProject } = useProjectsContext();

  const [name, setName]         = useState("");
  const [goal, setGoal]         = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor]       = useState(COLOR_OPTIONS[0].id);
  const [calOpen, setCalOpen]   = useState(false);

  const canCreate = name.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;

    const selectedHex = COLOR_OPTIONS.find((o) => o.id === color)?.hex ?? "#CDEA6F";

    try {
      const created = await addProject({
        name: name.trim(),
        goal: goal.trim() || undefined,
        endDate: toIsoDate(deadline),
        color: selectedHex,
      });
      // 생성 완료 화면 → 팀원 초대 화면으로 이어진다. replace로 넘겨서
      // 완료 화면에서 뒤로가기 하면 빈 폼이 아니라 이전 화면으로 나가게 한다.
      navigate(`/create-project/${created.id}/done`, { replace: true });
    } catch {
      alert("프로젝트 생성에 실패했습니다.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── 스크롤 가능 콘텐츠 ── */}
      <div className="flex-1 px-5 pt-4 pb-8 flex flex-col gap-6">

        {/* 뒤로가기 */}
        <button
          id="create-project-back"
          onClick={() => navigate(-1)}
          className="create-back-btn"
          aria-label="뒤로가기"
        >
          <ChevronLeft size={22} strokeWidth={2} />
        </button>

        {/* 제목 */}
        <h1 className="create-title">
          새 프로젝트<br />만들기
        </h1>

        {/* ── 폼 ── */}
        <div className="flex flex-col gap-5">

          {/* 프로젝트 이름 */}
          <div className="create-field">
            <label className="create-label" htmlFor="project-name">
              프로젝트 이름
            </label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="예: 리브랜딩 캠페인 2026"
              className="create-input"
            />
          </div>

          {/* 목표 한 줄 */}
          <div className="create-field">
            <label className="create-label" htmlFor="project-goal">
              목표 한 줄
            </label>
            <input
              id="project-goal"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="이 프로젝트로 무엇을 달성하나요?"
              className="create-input"
            />
          </div>

          {/* 마감일 — 캘린더 트리거 */}
          <div className="create-field">
            <label className="create-label">마감일</label>
            <button
              id="project-deadline"
              type="button"
              onClick={() => setCalOpen(true)}
              className="create-input create-input--deadline flex items-center justify-between text-left"
              style={{ cursor: "pointer" }}
            >
              <span style={{ color: deadline ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)" }}>
                {deadline || "예: 2026. 08. 31"}
              </span>
              <Calendar size={16} color="rgba(255,255,255,0.35)" strokeWidth={1.8} />
            </button>
          </div>

          {/* 포인트 컬러 */}
          <div className="create-field">
            <label className="create-label">포인트 컬러</label>
            <div className="create-color-row">
              {COLOR_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  id={`color-${opt.id}`}
                  onClick={() => setColor(opt.id)}
                  className={`create-color-btn ${color === opt.id ? "create-color-btn--active" : ""}`}
                  style={{ backgroundColor: opt.hex }}
                  aria-label={opt.id}
                >
                  {color === opt.id && (
                    <svg width="13" height="10" viewBox="0 0 13 10" fill="none">
                      <path
                        d="M1.5 5L5 8.5L11.5 1"
                        stroke="#1C1C1E"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── 하단 CTA 버튼 ── */}
      <div className="px-5 pb-6 pt-2">
        <button
          id="create-project-submit"
          onClick={handleCreate}
          disabled={!canCreate}
          className={`create-submit-btn ${canCreate ? "create-submit-btn--active" : ""}`}
        >
          <span className="text-lg leading-none mr-1">+</span>
          만들기
        </button>
      </div>

      {/* ── 캘린더 피커 ── */}
      {calOpen && (
        <DatePickerSheet
          selected={parseDeadline(deadline)}
          onSelect={(d) => setDeadline(formatDeadline(d))}
          onClose={() => setCalOpen(false)}
        />
      )}
    </div>
  );
}
