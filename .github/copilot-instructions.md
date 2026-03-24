# Project Guidelines

## Code Style
- Use TypeScript + React functional components with hooks.
- Reuse existing UI primitives in `src/components/ui` (shadcn-based) instead of rebuilding common controls.
- Prefer `@/` path alias imports (configured in `tsconfig.app.json` and `vite.config.ts`).
- Keep styling in Tailwind utility classes + CSS variables (`src/index.css`, `components.json`), avoid hard-coded color tokens when possible.
- Keep canvas rendering paths lightweight: avoid adding heavy logic inside high-frequency React Flow render paths.

## Architecture
- Routing is centralized in `src/router/index.tsx` with two main pages:
  - `/` → `src/pages/Home`
  - `/canvas` → `src/pages/Canvas`
- Canvas graph state is centralized in `src/store/canvasFlowStore.ts` (nodes, edges, connect handlers, generation polling).
- AI/network requests live in `src/api/ai.ts`; orchestration logic should stay in hooks (for example `src/hooks/useAgentExecution.ts`) or store actions, not scattered across UI components.
- Custom flow node implementations live under `src/pages/Canvas/CustomNodes`, with shared typing in `src/types/flow`.

## Build and Test
- Install dependencies: `npm install`
- Start dev server: `npm run dev` (Vite, port 3004)
- Build: `npm run build`
- Preview build: `npm run preview`
- There are currently no dedicated lint/test scripts in `package.json`. If adding them, document usage in `README.md`.

## Environment and Security
- Proxy-related environment variables are configured in `.env` and consumed by `vite.config.ts`:
  - `VITE_API_BASE_URL`
  - `VITE_REQUEST_TIMEOUT`
  - `AI_PROXY_TARGET`
  - `AI_PROXY_TOKEN` (server-side proxy injection only)
- Never hardcode secrets in frontend source files.
- Keep token handling in dev proxy/server context (see `vite.config.ts` proxy `configure` hook).

## Conventions
- For new canvas node types, keep changes consistent across:
  - `src/types/flow/*` (types)
  - `src/store/canvasFlowStore.ts` (state/actions)
  - `src/pages/Canvas/CustomNodes/*` (UI)
  - `src/pages/Canvas/index.tsx` (node type registration if needed)
- Prefer store actions for graph mutations (`addNode`, `onConnect`, `onNodesChange`, etc.) instead of ad-hoc local state mutations.
- Link to source-of-truth files instead of duplicating long design docs in instruction files.
