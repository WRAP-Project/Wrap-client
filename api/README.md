# API contract

`openapi.yaml` is the single source of truth for the backend-frontend contract.

The backend is Spring Boot with springdoc-openapi, which auto-generates the
OpenAPI spec from controller/DTO annotations and serves it at
`/v3/api-docs.yaml`. So this file is **not hand-edited** — it's synced from
the running backend.

- **Backend devs**: just annotate controllers/DTOs as usual. Nothing to
  hand-write here — the spec follows the code automatically.
- **Syncing the spec into this repo**: run `npm run sync:api` (defaults to
  `http://localhost:8080/v3/api-docs.yaml`, override with `API_DOCS_URL`)
  while the backend is running locally. Commit the resulting diff to
  `openapi.yaml` alongside the frontend changes that depend on it.
- **Frontend (AI-assisted) changes**: point the AI at this file — it should
  regenerate/adjust fetch calls and TypeScript types from the spec rather
  than guessing at shapes. Typed client + types are codegen'd via
  `npm run codegen:api` into `src/lib/api/schema.gen.ts` (committed, checked
  for drift in CI via `npm run codegen:api:check`).
- **Human-readable view**: run `npm run docs:api` to generate
  `public/api-docs.html` (Redoc-rendered) — open it in a browser for a page
  you can skim without reading YAML.

Validate the spec any time with:

```
npx @redocly/cli lint api/openapi.yaml
```
