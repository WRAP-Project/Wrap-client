# CLAUDE.md

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)에게 제공하는 가이드입니다.

## 프로젝트

Wrap-client — Wrap 프로젝트의 프론트엔드 웹 앱입니다.

디자이너들은 각자 Figma에서 디자인하고 Figma Make(바이브 코딩)를 사용해
독립적으로 동작하는 React 화면을 만듭니다. 이 저장소는 그렇게 만들어진
화면들을 하나의 앱으로 통합하고, 백엔드와 통신하는 부분을 담당합니다.

스택: React 18.3.1 + TypeScript + Vite 6 + Tailwind v4 + shadcn/ui +
react-router-dom. Figma Make가 출력하는 스택과 동일하므로, 디자이너의 화면을
최소한의 수정만으로 바로 가져다 쓸 수 있습니다.

## 디자이너가 제출한 새 화면 통합하기
1. 디자이너가 Figma Make로 만든 `.tsx` 화면(또는 소수의 관련 파일들)을
   제출합니다 — 이 저장소와 동일한 스택을 쓰지만, 보통 색상이 하드코딩되어
   있고, 인라인 스타일이 섞여 있으며, 모든 로직이 하나의 컴포넌트에
   몰려 있습니다.
2. 해당 화면을 있는 그대로 통합할지, 구조를 다시 손보도록 돌려보낼지는
   리드 디자이너가 판단합니다. 이 저장소는 그 판단을 다시 따지지
   않습니다 — 승인되었다면 그대로 통합합니다.
3. 화면을 `src/screens/<Name>.tsx`에 넣고, `src/screens/index.tsx`에
   라우트 경로와 함께 등록합니다.
4. `src/components/`로 공용 컴포넌트를 분리하는 것은 실제로 재사용될 때만
   합니다 — 한 디자이너의 화면 하나만을 위해 미리 추상화하지 않습니다.
5. 커밋 전에 `npm run typecheck && npm run lint && npm run build`를
   실행합니다. 비주얼 회귀 테스트는 따로 없습니다 — 화면이 제대로
   보이는지에 대한 유일한 검증은 리드 디자이너의 최종 확인입니다. 이
   방식으로 충분하지 않게 되면 그때 검증 절차를 추가하고, 미리
   추가하지 않습니다.

## 백엔드 계약

`api/openapi.yaml`이 백엔드 API 계약의 유일한 소스입니다.

- 백엔드 엔지니어는 엔드포인트가 바뀔 때 이 파일을 직접 수정합니다.
- AI가 작성하는 프론트엔드 변경 사항(라우트, 요청/응답 형태, 상태 코드)은
  반드시 이 스펙을 기반으로 해야 합니다 — fetch 호출이나 API 타입을
  작성하기 전에 이 파일을 먼저 읽고, 백엔드 저장소를 보고 형태를
  추측하지 않습니다.
- `npm run docs:api`는 이 파일을 `public/api-docs.html`로 렌더링해서
  (Redoc 사용) 사람이 빠르게 훑어볼 수 있게 합니다 — 백엔드 개발자도
  YAML을 직접 건드리지 않고 같은 파일로 확인할 수 있습니다.
- `npx @redocly/cli lint api/openapi.yaml`로 변경 사항을 검증합니다.

## 명령어

- `npm run dev` — 로컬 개발 서버
- `npm run build` — 타입체크 + 프로덕션 빌드
- `npm run typecheck` — `tsc -b --noEmit`
- `npm run lint` — eslint
- `npm run docs:api` — OpenAPI 스펙을 사람이 읽기 쉬운 HTML로 렌더링

## CI

`.github/workflows/ci.yml`은 모든 PR에서 typecheck, lint, build,
OpenAPI lint를 실행합니다. 프론트엔드 변경 사항을 다른 사람이 따로
코드 리뷰하지 않는 상황에서 이것이 최소한의 안전망이므로 — 항상
통과 상태를 유지해야 합니다.
