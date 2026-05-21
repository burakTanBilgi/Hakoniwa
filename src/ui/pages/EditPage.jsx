import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listOuterEdges } from '../../grid/compile.js';
import EdgeEditorCanvas from '../components/EdgeEditorCanvas.jsx';
import ViewPanel       from '../components/ViewPanel.jsx';
import Tooltip         from '../components/Tooltip.jsx';
import ConfirmDialog   from '../components/ConfirmDialog.jsx';
import BottomSheet     from '../components/BottomSheet.jsx';
import Inspector       from '../components/inspector/Inspector.jsx';
import CanvasEditUi    from '../components/edit-ui/CanvasEditUi.jsx';
import LayersEditUi    from '../components/edit-ui/LayersEditUi.jsx';
import FlatEditUi      from '../components/edit-ui/FlatEditUi.jsx';
import WorkflowEditUi  from '../components/edit-ui/WorkflowEditUi.jsx';
import EditModePicker  from '../components/edit-ui/EditModePicker.jsx';
import { useEditUiMode } from '../hooks/useEditUiMode.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { TilesContext } from '../hooks/TilesContext.jsx';
import { useT } from '../../i18n/index.js';

const DEFAULT_WAVE = { frequency: 0.025, amplitude: 12, phase: 0 };

// Edit page = the canvas + selection state + a user-pickable UI shell.
// The shell is one of:
//   'canvas' (default)  — slim left rail + floating popovers
//   'layers'            — layers list on top + properties pane below
//   'flat' / 'modes'    — reserved for future modes (picker disables them)
//
// EditPage itself owns selection, the hover/click toggles, and the
// confirm-clear modal. Each shell receives the same props and decides
// how to render them.
export default function EditPage({ project }) {
  const t = useT();
  const {
    project: p,
    pieces,
    sharedEdges,
    setDefaultEdgeEffect,
    setDefaultEdgeConfig,
    setEdgeEffect,
    setEdgeConfig,
    clearEdgeOverride,
    resetEdgeOverrides,
    setLayerEffect,
    setLayerConfig,
    clearLayer,
    setPieceEdgeEffect,
    setPieceEdgeConfig,
    clearPieceEdgeOverride,
    setPieceColor,
    setPieceContent,
    updatePieceContent,
    setDefaultCellEffects,
    setCellEffects,
    resetAllCellEffects,
    setDefaultEdgeEffects,
    setLayerEffects,
    setPieceEdgeEffects,
    setEdgeEffects,
  } = project;

  const [selectedEdges, setSelectedEdges] = useState(() => new Set());
  const [selectedPieceId, setSelectedPieceId] = useState(null);
  const [hoverFxEnabled, setHoverFxEnabled] = useState(true);
  const [clickFxEnabled, setClickFxEnabled] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const { mode, setMode, tiles, setTiles } = useEditUiMode();
  // Mobile-viewport detection: at phone widths the four desktop UI shells
  // are bypassed in favour of a canvas-fills-screen layout with the
  // Inspector hosted in a BottomSheet. This is the groundwork piece —
  // shape/snap behaviour stays minimal until a dedicated mobile pass.
  const isPhone = useMediaQuery('(max-width: 640px)');

  const handleSelectEdge = useCallback((pairKey, evt) => {
    setSelectedPieceId(null);
    setSelectedEdges((cur) => {
      const next = new Set(cur);
      if (evt?.shiftKey || evt?.ctrlKey || evt?.metaKey) {
        if (next.has(pairKey)) next.delete(pairKey); else next.add(pairKey);
      } else {
        if (next.size === 1 && next.has(pairKey)) next.clear();
        else { next.clear(); next.add(pairKey); }
      }
      return next;
    });
  }, []);

  const handleSelectPiece = useCallback((pieceId) => {
    setSelectedEdges(new Set());
    setSelectedPieceId(pieceId);
  }, []);

  // Esc clears both selections.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setSelectedEdges(new Set());
      setSelectedPieceId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allEdges = useMemo(() => {
    if (!p) return [];
    return [...sharedEdges, ...listOuterEdges(p)];
  }, [p, sharedEdges]);

  const selectedPiece = useMemo(
    () => (selectedPieceId && pieces ? pieces.find((pp) => pp.id === selectedPieceId) : null),
    [pieces, selectedPieceId]
  );

  if (!p) return null;

  const defaultEffect = p.edges.default.effect;
  const defaultConfig = p.edges.default.config ?? DEFAULT_WAVE;

  const hasAnyEdgeOverride =
    Object.keys(p.edges.byEdge || {}).length > 0 ||
    Object.keys(p.edges.byPiece || {}).length > 0;
  const hasAnyCellOverride =
    Object.keys(p?.cells?.default?.effects || {}).length > 0 ||
    Object.keys(p?.cells?.byPiece || {}).length > 0;
  const hasOverrides = hasAnyEdgeOverride || hasAnyCellOverride;

  const handleClearOverrides = () => {
    if (!hasOverrides) return;
    setConfirmClearOpen(true);
  };

  const handleConfirmClear = () => {
    resetEdgeOverrides();
    resetAllCellEffects();
    setConfirmClearOpen(false);
  };

  const canvas = (
    <ViewPanel>
      <EdgeEditorCanvas
        pieces={pieces}
        effect={defaultEffect}
        effectConfig={defaultConfig}
        allEdges={allEdges}
        selectedEdgeIds={selectedEdges}
        onSelectEdge={handleSelectEdge}
        selectedPieceId={selectedPieceId}
        onSelectPiece={handleSelectPiece}
        edgesByEdge={p.edges.byEdge}
        edgesByPiece={p.edges.byPiece}
        hoverFxEnabled={hoverFxEnabled}
        clickFxEnabled={clickFxEnabled}
      />
    </ViewPanel>
  );

  const modePickerEl = (
    <EditModePicker
      mode={mode}
      onChangeMode={setMode}
      tiles={tiles}
      onChangeTiles={setTiles}
    />
  );

  // Shared props every UI shell needs.
  const sharedProps = {
    project: p,
    pieces,
    sharedEdges,
    selectedEdges,
    selectedPieceId,
    selectedPiece,
    onSelectPiece: handleSelectPiece,
    onSelectEdges: setSelectedEdges,
    onClearPieceSelection: () => setSelectedPieceId(null),
    onClearEdgeSelection: () => setSelectedEdges(new Set()),
    hoverFxEnabled,
    onToggleHover: () => setHoverFxEnabled((v) => !v),
    clickFxEnabled,
    onToggleClick: () => setClickFxEnabled((v) => !v),
    hasOverrides,
    onClearOverrides: handleClearOverrides,
    modePickerSlot: modePickerEl,
    // setters
    setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
    setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
    setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
    setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
    setPieceContent, updatePieceContent,
    setDefaultCellEffects, setCellEffects,
    setPieceColor,
  };

  return (
    <TilesContext.Provider value={tiles}>
    <div className={`page-edit${isPhone ? ' page-edit--phone' : ''}`}>
      {isPhone ? (
        <MobileShell {...sharedProps} canvas={canvas} />
      ) : (
        <>
          {mode === 'canvas' && <CanvasEditUi {...sharedProps} canvas={canvas} />}
          {mode === 'layers' && (
            <LayersShell {...sharedProps} canvas={canvas} />
          )}
          {mode === 'flat' && (
            <RailShell {...sharedProps} canvas={canvas} body={<FlatEditUi {...sharedProps} />} />
          )}
          {mode === 'modes' && (
            <RailShell {...sharedProps} canvas={canvas} body={<WorkflowEditUi {...sharedProps} />} />
          )}
        </>
      )}

      {confirmClearOpen && (
        <ConfirmDialog
          title={t('edit.confirmClearTitle')}
          body={(
            <>
              <p>{t('edit.confirmClearBody')}</p>
              <p className="hint hint--warn">{t('edit.confirmClearWarn')}</p>
            </>
          )}
          confirmLabel={t('edit.confirmClearLabel')}
          danger
          onCancel={() => setConfirmClearOpen(false)}
          onConfirm={handleConfirmClear}
        />
      )}
    </div>
    </TilesContext.Provider>
  );
}

// Generic rail shell — used by Flat and Workflow modes. Renders the
// shared top action row (toggles + clear + picker) above a body that
// the mode provides, with the canvas on the right.
function RailShell({ canvas, body, ...rest }) {
  return (
    <>
      <aside className="side-tools">
        <TopActionRow {...rest} />
        {body}
      </aside>
      {canvas}
    </>
  );
}

// Shared top-action row for rail-style modes (Layers / Flat / Workflow).
function TopActionRow({
  hoverFxEnabled, onToggleHover,
  clickFxEnabled, onToggleClick,
  hasOverrides, onClearOverrides,
  modePickerSlot,
}) {
  const t = useT();
  return (
    <div className="edit-top-row">
      <div className="fx-toggle-group" role="group" aria-label={t('edit.interactionPreviewsGroup')}>
        <Tooltip label={hoverFxEnabled ? t('edit.hoverPreviewsOn') : t('edit.hoverPreviewsOff')}>
          <button
            type="button"
            className={`fx-icon-btn${hoverFxEnabled ? '' : ' fx-icon-btn--off'}`}
            onClick={onToggleHover}
            aria-pressed={hoverFxEnabled}
            aria-label={t('edit.toggleHoverPreviews')}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 2 L3 11 L6 8 L8 12 L9.4 11.4 L7.4 8 L11 8 Z" fill="currentColor" />
              <path d="M2 14 Q4.5 12.5 7 14 T12.5 14" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </Tooltip>
        <Tooltip label={clickFxEnabled ? t('edit.clickPreviewsOn') : t('edit.clickPreviewsOff')}>
          <button
            type="button"
            className={`fx-icon-btn${clickFxEnabled ? '' : ' fx-icon-btn--off'}`}
            onClick={onToggleClick}
            aria-pressed={clickFxEnabled}
            aria-label={t('edit.toggleClickPreviews')}
          >
            <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
              <path d="M3 2 L3 11 L6 8 L8 12 L9.4 11.4 L7.4 8 L11 8 Z" fill="currentColor" />
              <g stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                <line x1="12.5" y1="3.5" x2="14.5" y2="1.5" />
                <line x1="13" y1="6" x2="15.4" y2="6" />
                <line x1="12.5" y1="8.5" x2="14.5" y2="10.5" />
              </g>
            </svg>
          </button>
        </Tooltip>
      </div>
      <Tooltip label={hasOverrides ? t('edit.clearAllOverrides') : t('edit.noOverridesSet')}>
        <button
          type="button"
          className="clear-overrides-btn"
          onClick={onClearOverrides}
          disabled={!hasOverrides}
          aria-label={t('edit.clearAllOverrides')}
        >
          <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 8 A5 5 0 1 0 5.2 4" />
            <path d="M3 2 L3 5 L6 5" />
          </svg>
        </button>
      </Tooltip>
      <div className="edit-top-row__picker">{modePickerSlot}</div>
    </div>
  );
}

// Layers mode shell: a 280-px rail with the shared top-action row +
// LayersEditUi inside; canvas on the right.
function LayersShell(props) {
  const { canvas, ...rest } = props;
  return (
    <>
      <aside className="side-tools">
        <TopActionRow {...rest} />
        <LayersEditUi {...rest} />
      </aside>
      {canvas}
    </>
  );
}

// Phone shell: canvas fills the viewport; the Inspector lives in a
// bottom sheet the user can drag between snap points. Same Inspector
// tree as desktop — the sheet is itself a query container so subcards
// adapt to the sheet's width via the same `@container editui` rules.
//
// Selection-driven snap: the sheet auto-expands to 'default' the
// moment the user picks a piece or edge (they clearly want the editor)
// and snaps back to 'collapsed' when they clear the selection. Manual
// drags still win — `snap` is just pushed when the *toggle* itself
// changes, so a user who drags the sheet down to peek the canvas
// keeps it there until they make another selection change.
function MobileShell(props) {
  const t = useT();
  const { canvas, project, pieces, sharedEdges,
    selectedEdges, selectedPieceId,
    onClearEdgeSelection, onClearPieceSelection,
    setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
    setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
    setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
    setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
    setPieceContent, updatePieceContent,
    setDefaultCellEffects, setCellEffects,
  } = props;

  const hasSelection = !!selectedPieceId || (selectedEdges?.size ?? 0) > 0;
  const [snap, setSnap] = useState('collapsed');
  const prevHadSelectionRef = useRef(hasSelection);

  useEffect(() => {
    const had = prevHadSelectionRef.current;
    if (hasSelection && !had) setSnap('default');
    else if (!hasSelection && had) setSnap('collapsed');
    prevHadSelectionRef.current = hasSelection;
  }, [hasSelection]);

  return (
    <>
      <div className="page-edit__mobile-canvas">{canvas}</div>
      <BottomSheet
        open
        title={t('nav.edit')}
        snap={snap}
        onSnapChange={setSnap}
        defaultSnap="collapsed"
      >
        {!hasSelection && (
          <div className="mobile-edit-hint" role="note">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M5 4 L5 19 L9 15 L11 19 L13 18 L11 14.5 L16 14 Z"
                fill="currentColor"
              />
            </svg>
            <div className="mobile-edit-hint__text">
              <strong>{t('edit.mobileTapHint')}</strong>
              <span>{t('edit.mobileTapHintSub')}</span>
            </div>
          </div>
        )}
        <Inspector
          project={project}
          pieces={pieces}
          sharedEdges={sharedEdges}
          selectedEdges={selectedEdges}
          selectedPieceId={selectedPieceId}
          onClearEdgeSelection={onClearEdgeSelection}
          onClearPieceSelection={onClearPieceSelection}
          setDefaultEdgeEffect={setDefaultEdgeEffect}
          setDefaultEdgeConfig={setDefaultEdgeConfig}
          setDefaultEdgeEffects={setDefaultEdgeEffects}
          setLayerEffect={setLayerEffect}
          setLayerConfig={setLayerConfig}
          clearLayer={clearLayer}
          setLayerEffects={setLayerEffects}
          setPieceEdgeEffect={setPieceEdgeEffect}
          setPieceEdgeConfig={setPieceEdgeConfig}
          setPieceEdgeEffects={setPieceEdgeEffects}
          clearPieceEdgeOverride={clearPieceEdgeOverride}
          setEdgeEffect={setEdgeEffect}
          setEdgeConfig={setEdgeConfig}
          clearEdgeOverride={clearEdgeOverride}
          setEdgeEffects={setEdgeEffects}
          setPieceContent={setPieceContent}
          updatePieceContent={updatePieceContent}
          setDefaultCellEffects={setDefaultCellEffects}
          setCellEffects={setCellEffects}
        />
      </BottomSheet>
    </>
  );
}
