# AGENTS.md

This is an Expo SDK 57 / React Native 0.86 application targeting mobile (iOS, Android) and web. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

---

## 1. Expo Has Changed — Do Not Trust Training Data

Expo APIs evolve rapidly across major releases. Do not guess from memory:
1. **Read SDK version**: Check `package.json` for the major version of `expo` (SDK 57).
2. **Fetch versioned docs**: Always fetch `https://docs.expo.dev/versions/v57.0.0/`
3. **Markdown-first documentation**: Append `.md` to any Expo doc URL (e.g. `https://docs.expo.dev/router/introduction.md`) or use `https://docs.expo.dev/llms.txt` for the full map and corrections to common LLM misconceptions.
4. **Official MCP & Skills**: Leverage the official Expo MCP server (`https://mcp.expo.dev/mcp`), official Expo skills (e.g. `expo-overview`, `expo-router`, `expo-animation`), and project skills in `.agents/skills/` (e.g. `react-native-best-practices`).

---

## 2. Package Management Invariant

- **ALWAYS** use `npx expo install <package>` instead of `npm install` or `yarn add` for any React Native / Expo library. This ensures version compatibility with SDK 57.
- Check dependency issues with `npx expo-doctor`.
- Automatically resolve mismatched package versions with `npx expo install --fix`.

---

## 3. Architecture & Code Layout

- **Routing & Navigation**: Use **Expo Router** with file-based routing inside `app/`. Do not use legacy React Navigation container setups.
- **Source Structure**: Application domain logic, state stores, integrations, and UI primitives reside in `src/`, imported via the `@/*` alias (e.g. `@/state/TopoStore`, `@/ui/fonts`).
- **High-Performance Modules & Graphics**:
  - Topo rendering: `@shopify/react-native-skia`.
  - Native image processing & camera: `react-native-nitro-modules`, `react-native-nitro-image`, `react-native-vision-camera`.
  - Animations & Gestures: `react-native-reanimated` and `react-native-gesture-handler`.
- **Cross-Platform & Web Invariants**:
  - Production web is exported statically for Cloudflare Workers via `npm run build:web` (`expo export --platform web`).
  - Web uses CanvasKit WASM (`public/canvaskit.wasm`) and `expo-sqlite` with SharedArrayBuffer / COOP & COEP headers (`docs/web.md`).
  - Guard native-only APIs with `Platform.OS === 'web'` or platform-specific extensions (`.web.tsx`).
- **Backend Sync**: Bi-directional issue sync with the Tabvar API is defined in `docs/tabvar-issues-api.md`.

---

## 4. Verification Workflow

Run these checks before declaring any task complete:
```bash
npm run typecheck    # tsc --noEmit (ensure 0 TypeScript errors)
npm test             # Jest unit tests
npm run test:web     # Playwright web smoke tests (when modifying routing, web, or UI)
```
