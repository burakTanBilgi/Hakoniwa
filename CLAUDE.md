# CLAUDE.md — Hakoniwa (箱庭)

## Project Purpose

A React + Vite design tool for grid-based layouts where sections are separated by stylized connectors (puzzle tabs/sockets, wave, straight). You build a grid, merge cells into pieces, style edges, fill cells with text/images, and export as JSON, a single React file, or a full ZIP module.

**Live at [hak10iwa.netlify.app](https://hak10iwa.netlify.app).**

## Design docs

Design specs and references live in **`docs/`** — read the relevant one
before changing a feature it covers.

- [`docs/design-system.md`](docs/design-system.md) — visual language, tokens, components
- [`docs/adaptive-edit-ui-design.md`](docs/adaptive-edit-ui-design.md) — the four Edit-UI layout modes
- [`docs/multi-language-support-design.md`](docs/multi-language-support-design.md) — i18n (English + Turkish)

## Architecture

```
src/
  main.jsx                    — ReactDOM entry
  index.css                   — Theme tokens (light/dark via [data-theme])
  puzzle/                     — Self-contained rendering module (no outside imports)
    geometry.js               — SVG path math (pure)
    board.js                  — neighbor + segment helpers (pure)
    effects/                  — puzzle, wave, straight effect strategies
    PuzzleBoard.jsx           — root <svg>
    PuzzlePiece.jsx           — one piece + clipped content
    PuzzleBoard.css           — themeable CSS
    index.js                  — public API
    CLAUDE.md                 — module-specific notes
  grid/                       — Data model + state + I/O
    project.js                — pure: newProject() constructor
    grid.js                   — pure cell-grid helpers (MAX_GRID = 50)
    compile.js                — pure: Project → Piece[]
    import.js                 — pure: CSV/TSV/paste → grid + content
    ids.js                    — pure id factories (groups, projects, bgs)
    zip.js                    — pure ZIP encoder (no deps)
    actions/                  — pure mutation factories (grid/edge/piece/bg)
    browser-storage.js        — localStorage CRUD (browser-only)
    file-io.js                — exportJSON / importJSON (browser file I/O)
    export.js                 — single-file JSX + module ZIP exports
    useProject.js             — React hook: state + auto-save + lifecycle
    CLAUDE.md
  ui/                         — App shell + pages + components
    App.jsx                   — page switcher + theme state (lazy-loads non-landing pages)
    components/               — PageNav, GridCanvas, EdgeEditorCanvas,
                                ImportDialog, SliderRow, ViewPanel,
                                PreviewSvg, BackgroundsPanel, AccordionCard
    components/inspector/     — Inspector (accordion of tier cards),
                                CascadeStrip, ProjectDefaultsCard,
                                PieceInspector, EdgeInspector,
                                EdgeTierEditor, CellTierEditor,
                                InspectorSubcard, InspectorTabs, SourcePill,
                                cascade-source (pure helpers)
    components/interactions/  — EffectsPicker (per-tier animation editor)
    components/edges/         — StyleControls, constants
    pages/                    — Landing / Docs / Projects / Preview / Grid / Edit
    hooks/useFileInput.js     — hidden-input + open-button boilerplate
    utils/formatTime.js       — relative-time helper
    utils/computeViewBox.js   — pure: SVG viewBox snug around all pieces
    utils/fitOptions.js       — shared cover/contain/stretch options
    styles/App.css            — shell only; imports per-component & per-page sheets
    CLAUDE.md
```

The `src/puzzle/` folder is a **portable drop-in module** — no imports from outside itself, works in any React 18+ project. It is also shipped verbatim by the "Module bundle (ZIP)" export.

## Data Model

```js
// Project (the persistent unit)
{
  id, name, createdAt, updatedAt,
  grid: { rows, cols, cellSize, groups: string[][] },   // groupId per cell
  edges: {
    default: { effect, config? },                       // 'puzzle' | 'wave' | 'straight'
    inner:   null | { effect, config? },                // override for shared edges
    outer:   null | { effect, config? },                // override for outer edges
    byPiece: { [pieceId]: { effect, config? } },        // cell-tier override (every edge of the piece)
    byEdge:  { [pairKey]: { effect, config? } },        // per-edge overrides
  },
  // Effect & style resolution chain (highest first):
  //   byEdge > byPiece > inner/outer > default
  // (computed by `compile.js#resolveEdge`). For shared edges where both
  // pieces have a byPiece entry, the lex-smaller id wins (matches edgeKey).
  //
  // `config` is a bag with both effect-specific keys (inverted, frequency,
  // amplitude) AND stroke-style keys (color, opacity, strokeWidth) — they all
  // cascade through the same chain.
  pieceColors:  { [groupId]: '#hex' },
  pieceContent: { [groupId]: ContentSpec },
  backgrounds:  Background[],                              // multi-piece images
}

// ContentSpec
type ContentSpec =
  | { type: 'text',  text: string, align?, fontSize?, fontWeight?, color? }
  | { type: 'image', src: string /* data: URL */, fit?: 'cover'|'contain'|'fill' };

// Background — image spanning a rectangular cell range; sliced by SVG clipPath
// across all overlapped pieces (no merging needed; pieces stay separate).
type Background = {
  id, src, fit?,
  rect: { rMin, rMax, cMin, cMax },                        // in cell coordinates
};

// Piece (derived via compileProject)
{
  id, x, y, w, h, label?, fill?, content?,
  sides: { top?, right?, bottom?, left? },
  edgeEffects, edgeEffectConfigs,
}
```

## Key Invariants

- All grid mutation functions in `grid.js` are **pure**: take a grid, return a new grid.
- Pieces are derived from a Project via `compileProject` — never mutated directly.
- Adjacency is computed geometrically in `puzzle/board.js#findNeighbors`.
- `KNOB_R = 30` — pieces must be ≥ `2 * KNOB_R = 60px` per side.
- Tab vs socket: tabs protrude outward (`sweep-flag=1`), sockets indent inward (`sweep-flag=0`).
- All theme colors are CSS custom properties in `src/index.css`. The light theme is `[data-theme='light']`.

## Conventions

- **No TypeScript** — plain JS + JSDoc where types matter.
- **No external UI libraries**, **no state management libraries** — `useState`/`useMemo`/`useCallback` only.
- **Minimal dependencies** — only `react`/`react-dom`. The ZIP encoder, CSV parser, and theme system are all hand-rolled to keep deps slim.
- **Co-located CSS** for portable modules (`puzzle/PuzzleBoard.css`); shared UI styles in `ui/styles/App.css`.
- Comments only when the *why* is non-obvious.

## Pages (state-based routing)

| Page     | What it does                                                                |
| -------- | --------------------------------------------------------------------------- |
| Landing  | Hero / brand front door. Tagline, primary CTAs, feature cards, and a "Continue to docs ↓" pill at the bottom. **First-visit default.** |
| Docs     | Interactive tutorial. Sidebar nav for sections; live demo components in `components/docs/demos/`. |
| Projects | Project library + JSON import.                                              |
| Preview  | Large preview of current project; rename it; jump to Grid or Edit; **export menu** (JSON / single-file / ZIP) at top of side panel. |
| Grid     | Cell grid (in `ViewPanel` for pan/zoom): drag-select, merge/unmerge, resize, color, **paste/CSV import**, click/drag row & column numbers to delete, **multi-piece background images** (upload or Ctrl+V into selected cells). |
| Edit     | Same canvas (in `ViewPanel`). Selection-driven side panel: clicking a piece or edge opens a tier-aware Inspector with five accordion cards — `Default → Inner → Outer → Piece → Edge` — that share `expandedTier` state with the cascade strip. One card open at a time; only that card's body scrolls. A pair of icon toggles above the inspector independently silences hover- and click-state previews on the canvas. |

The last visited page is persisted to `localStorage[hakoniwa:lastPage]`; first-time visitors land on Landing.

The Edit page uses one canvas (`EdgeEditorCanvas`) with both edge hit-rects and piece clicks always live; the Inspector adapts to selection without the user picking a mode. Selection state lives on `EditPage` so the canvas can read it; edge and piece selections are mutually exclusive. Non-landing pages are `React.lazy`-loaded so the initial bundle stays small.

## Export options

- **JSON** — re-importable project state (`file-io.js#exportJSON`).
- **Single-file React** (`export.js#exportSingleFileJSX`) — generates one `.jsx` with paths precomputed and content baked in. Zero deps beyond React. Bundled with a README in a small ZIP.
- **Module bundle (ZIP)** (`export.js#exportModuleZip`) — ships the full `puzzle/` folder + `project.json` + a wrapper component + standalone `compileProject.js` + README. Drop-in for serious integration.

## Build & Dev

```bash
npm install
npm run dev      # Vite dev server
npm run build    # Output to /build (not /dist)
npm run preview  # Preview production build
```

Deployed on Netlify with SPA redirect (`netlify.toml`).
