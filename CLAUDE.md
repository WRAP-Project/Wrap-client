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

## 데이터 계층 패턴 (선 하드코딩 → 후 백엔드)

이 프로젝트에서 가장 중요한 규칙입니다. 화면 컴포넌트는 데이터가 mock인지
API인지 몰라야 하고, 오직 `src/data/`의 훅을 통해서만 데이터에 접근합니다.

### 읽기(Query): `src/data/use<Something>.ts`

화면은 mock이든 API든 **같은 훅 인터페이스**를 통해서만 데이터를 읽는다.
백엔드 연동 시 훅 내부만 교체하면 화면은 건드릴 필요가 없다.

```
src/data/useProjects.ts   ← 지금은 mock 배열 반환, 나중에 GET /projects fetch로 교체
```

### 쓰기(Mutation): Repository 패턴

**쓰기도 읽기와 같은 원칙** — 화면은 "어디에 저장되는지" 몰라야 한다.
`src/data/` 안에 `use<Something>.ts`가 `add / update / remove` 함수를 함께 반환한다.

```
// 화면이 아는 것: 이 함수만 호출하면 된다
const { projects, addProject } = useProjects();

// 지금 (하드코딩): addProject → 로컬 배열에 push
// 나중 (백엔드):   addProject → POST /projects fetch → 응답으로 배열 갱신
```

전역 공유가 필요한 상태(예: 프로젝트 목록을 여러 화면이 함께 읽고 씀)는
`src/data/<Something>Context.tsx`로 Context를 만들고, `main.tsx`에서 한 번만 감싼다.
Context 내부 구현을 fetch로 바꿔도 소비 화면 코드는 그대로다.

```
// 구조 요약
src/data/
  useProjects.ts          ← 읽기 훅 (+ addProject 등 mutation 함수 포함)
  ProjectsContext.tsx     ← 전역 공유가 필요할 때만 추가
```

### 규칙 요약

| | 지금 (mock) | 나중 (API) | 바꾸는 곳 |
|---|---|---|---|
| 읽기 | 로컬 배열 반환 | `GET /x` fetch | `src/data/` 훅 내부만 |
| 쓰기 | 로컬 상태 업데이트 | `POST /x` fetch | `src/data/` 훅 내부만 |
| 화면 | 훅 호출만 | 훅 호출만 | **건드리지 않음** |

## 디자이너가 제출한 새 화면 통합하기
1. 디자이너가 Figma Make로 만든 `.tsx` 화면(또는 소수의 관련 파일들)을
   제출합니다 — 이 저장소와 동일한 스택을 쓰지만, 보통 색상이 하드코딩되어
   있고, 인라인 스타일이 섞여 있으며, 모든 로직이 하나의 컴포넌트에
   몰려 있습니다.
2. 해당 화면을 있는 그대로 통합할지, 구조를 다시 손보도록 돌려보낼지는
   리드 디자이너가 판단합니다. 이 저장소는 그 판단을 다시 따지지
   않습니다 — 승인되었다면 그대로 통합합니다.
3. 승인된 파일을 실제로 옮기기 전에, 아래 여섯 가지를 판단합니다.
   "어느 파일을 가져올지"만으로는 해결되지 않는, 옮긴 뒤에도 남는
   판단들입니다.
   - **쉘 중복 제거**: 디자이너 파일은 보통 자체 상태바/폰 프레임/하단
     탭바를 포함합니다. 이 앱의 실제 쉘(`src/App.tsx`)이 이미 제공하는
     요소라면 걷어내고 콘텐츠만 가져옵니다.
   - **화면 경계 판단**: 디자이너 파일 내부에서 `useState`로 여러
     "화면"을 토글하는 경우, 뒤로가기/딥링크가 의미 있는 전환이면 실제
     라우트로 승격하고, 아니면 화면 내부 상태로 그대로 둡니다.
   - **신규 npm 의존성은 설치 전에 확인**: 디자이너 파일이 프로젝트에
     없는 패키지를 쓰면, 설치 전에 사용자에게 알리고 확인받습니다.
   - **외부 리소스(폰트 등)도 설치 전에 확인**: CDN 등 외부 의존을
     추가하기 전에 자체 호스팅 여부를 포함해 사용자 확인을 받습니다.
   - **mock 데이터는 `src/data/`의 훅 뒤에 감춥니다**: 상세 규칙은 위
     "데이터 계층 패턴" 섹션 참고. 화면 컴포넌트가 mock 배열/객체를
     직접 import하지 않게 하고, `src/screens/` 안에는 mock 데이터를
     두지 않습니다. (백엔드 개발자가 직접 보는 곳은 아닙니다 — 백엔드
     계약은 여전히 `api/openapi.yaml`이 유일한 소스입니다.)
   - **검증까지 끝내고 완료 보고**: typecheck/lint/build 외에 가능하면
     브라우저 렌더링도 확인합니다. 헤드리스 브라우저 도구가 없어 확인을
     못 했다면, 그 사실을 명시적으로 보고하고 완료로 단정하지 않습니다.
4. 화면을 `src/screens/<Name>.tsx`에 넣고, `src/screens/index.tsx`에
   라우트 경로와 함께 등록합니다.
5. `src/components/`로 공용 컴포넌트를 분리하는 것은 실제로 재사용될 때만
   합니다 — 한 디자이너의 화면 하나만을 위해 미리 추상화하지 않습니다.
6. 커밋 전에 `npm run typecheck && npm run lint && npm run build`를
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
