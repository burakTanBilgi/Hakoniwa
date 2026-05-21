import { useEffect, useMemo, useState } from 'react';
import EdgeTierEditor from '../inspector/EdgeTierEditor.jsx';
import CellTierEditor from '../inspector/CellTierEditor.jsx';
import { SubcardAccordion } from '../inspector/SubcardAccordionContext.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { piecesOfEdge } from '../../../grid/compile.js';
import { DEFAULT_WAVE } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';
import './FlatEditUi.css';

// Flat-panel Edit UI (Direction B). One scrollable panel, no tier
// switching. A single "Apply changes to" pill row at the top picks
// which cascade tier (Default / Inner / Outer / Piece / Edge) the next
// edits will write to. The control rows below render through the
// chosen scope's setters.
//
// Compared to the layered Inspector this trades the cascade-strip + per-
// tier accordion for one fixed panel; the scope is now a property of
// the panel, not a navigation step.
const ALL_SCOPE_IDS = ['default', 'inner', 'outer', 'piece', 'edge'];

export default function FlatEditUi(props) {
  const t = useT();
  const ALL_SCOPES = [
    { id: 'default', label: t('edit.tierDefault') },
    { id: 'inner',   label: t('edit.tierInner')   },
    { id: 'outer',   label: t('edit.tierOuter')   },
    { id: 'piece',   label: t('edit.tierPiece')   },
    { id: 'edge',    label: t('edit.tierEdge')     },
  ];
  const {
    project,
    pieces,
    sharedEdges,
    selectedEdges, selectedPieceId, selectedPiece,
    onClearPieceSelection, onClearEdgeSelection,
    // setters
    setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
    setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
    setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
    setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
    setDefaultCellEffects, setCellEffects,
  } = props;

  const edges = project.edges;
  const defaultEdgeEffect  = edges.default.effect;
  const defaultEdgeConfig  = edges.default.config ?? DEFAULT_WAVE;
  const defaultEdgeEffects = edges.default.effects || {};
  const defaultCellEffects = project?.cells?.default?.effects || {};

  // Which tiers are even applicable to the current selection?
  const hasInnerLayer  = sharedEdges && sharedEdges.length > 0;
  const hasOuterLayer  = useMemo(() => pieces?.some((p) =>
    Object.values({ top: 1, right: 1, bottom: 1, left: 1 }).some(() => true)
  ) ?? false, [pieces]);

  const pieceSelected  = !!selectedPieceId;
  const edgeSelected   = (selectedEdges?.size ?? 0) > 0;
  const firstPairKey   = edgeSelected ? [...selectedEdges][0] : null;
  const firstEdgePieceId = firstPairKey ? piecesOfEdge(firstPairKey)[0] : null;
  const isOuterEdge    = firstPairKey?.includes('||outer-');

  const scopeApplicable = (scopeId) => {
    if (scopeId === 'default') return true;
    if (scopeId === 'inner')   return hasInnerLayer;
    if (scopeId === 'outer')   return hasOuterLayer;
    if (scopeId === 'piece')   return pieceSelected || !!firstEdgePieceId;
    if (scopeId === 'edge')    return edgeSelected;
    return false;
  };

  // Default scope on each selection change: highest applicable tier.
  const desiredScope =
    edgeSelected         ? 'edge' :
    pieceSelected        ? 'piece' :
    'default';
  const [scope, setScope] = useState(desiredScope);
  useEffect(() => { setScope(desiredScope); }, [desiredScope]);

  // Which piece-id we'll write to for scope=piece. If a piece is
  // selected, use that; otherwise if an edge is selected, use its first
  // touching piece.
  const pieceTargetId = selectedPieceId || firstEdgePieceId;

  // Build the editor's setter wiring for the active scope.
  const editorProps = useMemo(() => {
    if (scope === 'default') {
      return {
        title: t('edit.tierDefault'),
        effect: defaultEdgeEffect,
        config: defaultEdgeConfig,
        ownEffects: defaultEdgeEffects,
        inheritedEffects: {},
        onSetEffect: (name) => setDefaultEdgeEffect(name, name === 'wave' ? defaultEdgeConfig : undefined),
        onPatchConfig: setDefaultEdgeConfig,
        onChangeEffects: setDefaultEdgeEffects,
        onClear: null,
      };
    }
    if (scope === 'inner' || scope === 'outer') {
      const kind = scope;
      const layer = edges[kind];
      return {
        title: kind === 'inner' ? t('edit.tierInnerEdges') : t('edit.tierOuterEdges'),
        effect: layer?.effect ?? defaultEdgeEffect,
        config: layer?.config ?? defaultEdgeConfig,
        ownEffects: layer?.effects || {},
        inheritedEffects: defaultEdgeEffects,
        onSetEffect: (name) => setLayerEffect(kind, name, name === 'wave' ? (layer?.config ?? defaultEdgeConfig) : undefined),
        onPatchConfig: (patch) => setLayerConfig(kind, patch),
        onChangeEffects: (map) => setLayerEffects(kind, map),
        onClear: layer ? () => clearLayer(kind) : null,
      };
    }
    if (scope === 'piece' && pieceTargetId) {
      const cell = edges.byPiece?.[pieceTargetId] || null;
      return {
        title: t('edit.piecePanelTitle', { label: pieceTargetId }),
        effect: cell?.effect ?? defaultEdgeEffect,
        config: cell?.config ?? defaultEdgeConfig,
        ownEffects: cell?.effects || {},
        inheritedEffects: defaultEdgeEffects,
        onSetEffect: (name) => setPieceEdgeEffect(pieceTargetId, name, name === 'wave' ? (cell?.config ?? defaultEdgeConfig) : undefined),
        onPatchConfig: (patch) => setPieceEdgeConfig(pieceTargetId, patch),
        onChangeEffects: (map) => setPieceEdgeEffects(pieceTargetId, map),
        onClear: cell ? () => clearPieceEdgeOverride(pieceTargetId) : null,
      };
    }
    if (scope === 'edge' && firstPairKey) {
      const ov = edges.byEdge?.[firstPairKey] || null;
      return {
        title: t('edit.tierEdge'),
        effect: ov?.effect ?? defaultEdgeEffect,
        config: ov?.config ?? defaultEdgeConfig,
        ownEffects: ov?.effects || {},
        inheritedEffects: defaultEdgeEffects,
        onSetEffect: (name) => setEdgeEffect(firstPairKey, name, name === 'wave' ? (ov?.config ?? defaultEdgeConfig) : undefined),
        onPatchConfig: (patch) => setEdgeConfig(firstPairKey, patch),
        onChangeEffects: (map) => setEdgeEffects(firstPairKey, map),
        onClear: ov ? () => clearEdgeOverride(firstPairKey) : null,
      };
    }
    return null;
  }, [scope, edges, defaultEdgeEffect, defaultEdgeConfig, defaultEdgeEffects,
      pieceTargetId, firstPairKey,
      setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
      setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
      setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
      setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects]);

  // Cell setters only apply at the Default or Piece scope (cells have a
  // two-tier cascade in compile.js#resolveCellEffects).
  const cellEditor = useMemo(() => {
    if (scope === 'default') {
      return { ownEffects: defaultCellEffects, inheritedEffects: {}, onChange: setDefaultCellEffects };
    }
    if (scope === 'piece' && pieceTargetId) {
      const pieceCellEffects = project?.cells?.byPiece?.[pieceTargetId]?.effects || {};
      return {
        ownEffects: pieceCellEffects,
        inheritedEffects: defaultCellEffects,
        onChange: (map) => setCellEffects(pieceTargetId, map),
      };
    }
    return null;
  }, [scope, project, defaultCellEffects, pieceTargetId, setDefaultCellEffects, setCellEffects]);

  // Selection label for the header.
  const selectionLabel =
    edgeSelected ? t('edit.edgesPanelTitle', { n: selectedEdges.size }) :
    pieceSelected ? `${t('edit.tierPiece')} ${selectedPiece?.label || pieceTargetId}` :
    t('edit.selectionNone');

  return (
    <div className="flat-edit-ui">
      <header className="flat-edit-ui__head">
        <div>
          <p className="flat-edit-ui__kicker">{t('edit.selectionKicker')}</p>
          <p className="flat-edit-ui__selection">{selectionLabel}</p>
        </div>
        {(pieceSelected || edgeSelected) && (
          <Tooltip label={t('edit.clearSelection')}>
            <button
              type="button"
              className="icon-action-btn"
              aria-label={t('edit.clearSelection')}
              onClick={() => {
                if (pieceSelected) onClearPieceSelection?.();
                if (edgeSelected)  onClearEdgeSelection?.();
              }}
            >
              <Icon name="close" size={13} />
            </button>
          </Tooltip>
        )}
      </header>

      <div className="flat-edit-ui__scope" role="radiogroup" aria-label={t('edit.applyChangesTo')}>
        <span className="flat-edit-ui__scope-label">{t('edit.applyTo')}</span>
        <div className="flat-edit-ui__scope-pills">
          {ALL_SCOPES.map((s) => {
            const applicable = scopeApplicable(s.id);
            const active = scope === s.id;
            return (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`flat-scope-pill${active ? ' flat-scope-pill--active' : ''}${applicable ? '' : ' flat-scope-pill--na'}`}
                disabled={!applicable}
                onClick={() => applicable && setScope(s.id)}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flat-edit-ui__body">
        <SubcardAccordion id={`flat-${scope}`} defaultOpenId="shape-stroke">
          {editorProps && (
            <EdgeTierEditor
              {...editorProps}
              accent
            />
          )}

          {cellEditor && (
            <CellTierEditor
              title="Body"
              accent
              ownEffects={cellEditor.ownEffects}
              inheritedEffects={cellEditor.inheritedEffects}
              onChange={cellEditor.onChange}
            />
          )}

          {!editorProps && (
            <p className="hint">{t('edit.noApplicableScope')}</p>
          )}
        </SubcardAccordion>
      </div>
    </div>
  );
}
