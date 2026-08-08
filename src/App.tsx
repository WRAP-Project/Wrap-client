import { Routes, Route, useNavigate, useLocation, useMatch } from "react-router-dom";
import { Home, Send, Calendar, Users } from "lucide-react";
import { screens } from "@/screens";

// 하단 탭 정의 — path가 있는 건 실제 라우트, 없는 건 미완성
const NAV_ITEMS = [
  { icon: Home, path: "/" },
  { icon: Send, path: "/chat" },
  { icon: Calendar, path: null },
  { icon: Users, path: null },
] as const;

function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bg-[#1C1C1E] shrink-0">
      {/* 아이콘 영역 */}
      <div className="flex items-center justify-around px-6 pt-3 pb-2">
        {NAV_ITEMS.map(({ icon: Icon, path }, i) => {
          const isActive =
            path !== null &&
            (pathname === path ||
              (path === "/" && pathname.startsWith("/project/")));
          return (
            <button
              key={i}
              onClick={() => (path ? navigate(path) : alert("아직 미완성입니다."))}
              className={`w-14 h-14 flex items-center justify-center rounded-full transition-all ${
                isActive ? "bg-[#EFEFEF]" : ""
              }`}
            >
              <Icon
                size={21}
                strokeWidth={1.5}
                className={isActive ? "text-[#1C1C1E]" : "text-white/40"}
              />
            </button>
          );
        })}
      </div>
      {/* iPhone 홈 인디케이터 */}
      <div className="flex justify-center pb-2">
        <div className="w-28 h-[5px] bg-white/20 rounded-full" />
      </div>
    </nav>
  );
}


export default function App() {
  // 채팅방 안(/chat/:roomId)과 프로젝트 생성 화면은 자체 풀스크린 흐름이라 하단 탭바를 숨긴다.
  const isChatRoom      = useMatch("/chat/:roomId");
  const isCreateProject = useMatch("/create-project");

  return (
    <div className="h-screen bg-white flex justify-center overflow-hidden">
      <div className="w-full max-w-[390px] h-full bg-[#1C1C1E] flex flex-col">
        {/* 콘텐츠 영역: 남은 공간 전부 차지하며 내부 스크롤 */}
        <div className="flex-1 overflow-y-auto">
          <Routes>
            {screens.map(({ path, Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Routes>
        </div>
        {/* 하단 네비게이션: 레이아웃 고정 */}
        {!isChatRoom && !isCreateProject && <BottomNav />}
      </div>
    </div>
  );
}

