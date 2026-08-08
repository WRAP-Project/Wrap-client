import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// 포인트 컬러 옵션
const COLOR_OPTIONS = [
  { id: "green",  hex: "#CDEA6F" },
  { id: "yellow", hex: "#F5E03A" },
  { id: "purple", hex: "#A78BFA" },
  { id: "pink",   hex: "#F4A8A8" },
  { id: "blue",   hex: "#60C8F5" },
];

export default function CreateProject() {
  const navigate = useNavigate();

  const [name, setName]         = useState("");
  const [goal, setGoal]         = useState("");
  const [deadline, setDeadline] = useState("");
  const [color, setColor]       = useState(COLOR_OPTIONS[0].id);

  const canCreate = name.trim().length > 0;

  function handleCreate() {
    if (!canCreate) return;
    // TODO: 실제 API 연동 (POST /projects)
    alert(`"${name}" 프로젝트가 생성되었습니다!`);
    navigate(-1);
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

          {/* 마감일 */}
          <div className="create-field">
            <label className="create-label" htmlFor="project-deadline">
              마감일
            </label>
            <input
              id="project-deadline"
              type="text"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              placeholder="예: 2026. 08. 31"
              className="create-input create-input--deadline"
            />
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
    </div>
  );
}
