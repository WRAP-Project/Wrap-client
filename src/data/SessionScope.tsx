import { Fragment, type ReactNode } from "react";
import { useAuth } from "./useAuth";

/**
 * SessionScope
 *
 * 로그인한 사용자가 바뀌면 그 아래의 데이터 Context를 통째로 새로 mount한다.
 *
 * 왜 필요한가 — 프로젝트 목록·일정 같은 Context는 mount 시 한 번만 조회한다.
 * AuthProvider 안에 있긴 해도 로그인/로그아웃으로 다시 mount되지는 않으므로,
 * A로 로그아웃하고 B로 로그인하면 A의 프로젝트 목록이 화면에 그대로 남는다.
 * key를 회원 id로 걸면 사용자가 바뀔 때 하위 state가 전부 폐기되고 새로 조회된다.
 * 나중에 Context가 추가돼도 이 안에 들어가기만 하면 같은 보호를 받는다.
 *
 * 세션 확인이 끝나기 전에는 children을 mount하지 않는다. 확인 중에 먼저 mount하면
 * 아직 null인 회원 id로 한 번, 확인 뒤 실제 id로 또 한 번 — 같은 목록을 두 번
 * 조회하게 되고 첫 번째 요청은 비로그인 상태라 401로 버려진다.
 */
export function SessionScope({ children }: { children: ReactNode }) {
  const { member, checking } = useAuth();

  if (checking) {
    // 배포가 Render 무료 플랜이라 잠들어 있던 서버를 깨우는 첫 요청은 1분 가까이
    // 걸릴 수 있다 — 그동안 빈 화면만 두지 않는다.
    // 아직 App(폰 프레임)이 mount되기 전이라 프레임을 여기서 똑같이 흉내낸다 —
    // 세션이 확정되는 순간 레이아웃이 튀지 않도록.
    return (
      <div className="h-screen bg-white flex justify-center overflow-hidden">
        <div className="w-full max-w-[390px] h-full bg-[#1C1C1E] flex items-center justify-center">
          <p className="text-white/40 text-sm">불러오는 중…</p>
        </div>
      </div>
    );
  }

  return <Fragment key={member?.id ?? "anon"}>{children}</Fragment>;
}
