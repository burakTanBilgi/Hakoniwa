import { useMemo } from 'react';
import EdgeTierEditor from './EdgeTierEditor.jsx';
import { SubcardAccordion } from './SubcardAccordionContext.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { piecesOfEdge } from '../../../grid/compile.js';
import { DEFAULT_WAVE, MIXED } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';

// Body of the "Edge" accordion card. Renders the per-edge tier editor for
// one or more selected edges (collapsing properties that disagree across
// the selection to MIXED). Higher tiers (default / inner / outer / piece)
// are owned by Inspector.jsx as sibling accordion cards now.
export default function EdgeInspector({
  selected, // Set<pairKey>
  project,
  pieces,
  sharedEdges,
  onClearSelection,
  setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
}) {
  const t = useT();
  const piecesById = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);

  const edges = project.edges;
  const defaultEdge = edges.default;
  const defaultEdgeEffect = defaultEdge.effect;
  const defaultEdgeConfig = defaultEdge.config ?? DEFAULT_WAVE;

  const pairKeys = useMemo(() => [...selected], [selected]);
  const firstPk = pairKeys[0];
  const isOuter = firstPk?.includes('||outer-');

  const firstPiece = useMemo(() => {
    if (!firstPk) return null;
    const [pid] = piecesOfEdge(firstPk);
    return piecesById.get(pid) || null;
  }, [firstPk, piecesById]);

  const resolveOne = (pk) => {
    const ov = edges.byEdge[pk];
    const isO = pk.includes('||outer-');
    const lay = isO ? edges.outer : edges.inner;
    let cell = null;
    for (const pid of piecesOfEdge(pk)) {
      if (edges.byPiece?.[pid]) { cell = edges.byPiece[pid]; break; }
    }
    return {
      effect: ov?.effect ?? cell?.effect ?? lay?.effect ?? defaultEdgeEffect,
      cfg:    ov?.config ?? cell?.config ?? lay?.config ?? defaultEdgeConfig,
    };
  };

  // Fold each selected edge's resolved values into one combo; properties
  // that disagree across the selection are tagged MIXED.
  const combo = useMemo(() => {
    if (pairKeys.length === 0) return null;
    let effect = null;
    let cfg = null;
    let first = true;
    for (const pk of pairKeys) {
      const { effect: e, cfg: c } = resolveOne(pk);
      if (first) { effect = e; cfg = c; first = false; }
      else {
        if (e !== effect) effect = MIXED;
        if (cfg?.frequency   !== c?.frequency)   cfg = { ...cfg, frequency:   MIXED };
        if (cfg?.amplitude   !== c?.amplitude)   cfg = { ...cfg, amplitude:   MIXED };
        if (cfg?.inverted    !== c?.inverted)    cfg = { ...cfg, inverted:    MIXED };
        if (cfg?.color       !== c?.color)       cfg = { ...cfg, color:       MIXED };
        if (cfg?.opacity     !== c?.opacity)     cfg = { ...cfg, opacity:     MIXED };
        if (cfg?.strokeWidth !== c?.strokeWidth) cfg = { ...cfg, strokeWidth: MIXED };
      }
    }
    return { effect, cfg };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pairKeys, edges.byEdge, edges.byPiece, edges.inner, edges.outer, defaultEdgeEffect, defaultEdgeConfig]);

  // Effects-picker baseline = what cascade resolves up to (but not including) byEdge.
  const ownEffectsFirst = edges.byEdge[firstPk]?.effects || {};
  const inheritedEffectsFirst = useMemo(() => {
    if (!firstPk) return {};
    const lay = isOuter ? edges.outer : edges.inner;
    const cellTiers = piecesOfEdge(firstPk)
      .map((id) => edges.byPiece?.[id]?.effects)
      .filter(Boolean);
    const out = {};
    for (const m of [edges.default?.effects, lay?.effects, ...cellTiers]) {
      if (!m) continue;
      for (const [k, v] of Object.entries(m)) {
        if (v === null) delete out[k];
        else out[k] = v;
      }
    }
    return out;
  }, [firstPk, isOuter, edges]);

  // Multi-edge effects: detect mixed across edges' own maps.
  const effectsMixed = pairKeys.length > 1 && pairKeys.some((pk) =>
    JSON.stringify(edges.byEdge[pk]?.effects || {}) !== JSON.stringify(ownEffectsFirst)
  );

  const applyEdgeEffect = (name) => {
    const cfg = name === 'wave'
      ? (combo?.cfg && combo.cfg.frequency !== MIXED && combo.cfg.amplitude !== MIXED
          ? combo.cfg : defaultEdgeConfig)
      : undefined;
    for (const pk of pairKeys) setEdgeEffect(pk, name, cfg);
  };
  const applyEdgeConfig = (patch) => {
    for (const pk of pairKeys) setEdgeConfig(pk, patch);
  };
  const applyEdgeEffects = (map) => {
    for (const pk of pairKeys) setEdgeEffects(pk, map);
  };
  const resetSelected = () => {
    for (const pk of pairKeys) clearEdgeOverride(pk);
  };

  const headerSub = (() => {
    if (pairKeys.length !== 1) return t('inspector.edges.count', { n: pairKeys.length });
    if (isOuter) {
      const piece = firstPiece;
      return t('inspector.edgeOuter', { label: piece?.label || piece?.id || '' });
    }
    const e = sharedEdges.find((x) => x.pairKey === firstPk);
    if (!e) return '';
    const a = piecesById.get(e.pieceAId)?.label || e.pieceAId;
    const b = piecesById.get(e.pieceBId)?.label || e.pieceBId;
    return `${a} ↔ ${b}`;
  })();

  return (
    <>
      <div className="inspector-header">
        <div>
          <span className="inspector-header__kind">{t('inspector.edgeKind')}</span>
          <span className="inspector-header__title">
            {pairKeys.length === 1
              ? t('inspector.selectedEdge')
              : t('inspector.edges.count', { n: pairKeys.length })}
          </span>
          {headerSub && <div className="inspector-header__sub">{headerSub}</div>}
        </div>
        <Tooltip label={t('inspector.clearSelection')}>
          <button type="button" className="icon-action-btn" aria-label={t('inspector.clearSelection')} onClick={onClearSelection}>
            <Icon name="close" size={13} />
          </button>
        </Tooltip>
      </div>

      <SubcardAccordion id="edge" defaultOpenId="shape-stroke">
        <EdgeTierEditor
          title={t('inspector.thisEdge')}
          accent
          effect={combo?.effect}
          config={combo?.cfg}
          ownEffects={ownEffectsFirst}
          inheritedEffects={inheritedEffectsFirst}
          mixed={effectsMixed}
          onSetEffect={applyEdgeEffect}
          onPatchConfig={applyEdgeConfig}
          onChangeEffects={applyEdgeEffects}
          onClear={resetSelected}
        />
      </SubcardAccordion>
    </>
  );
}
