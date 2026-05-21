import PieceInspector from '../inspector/PieceInspector.jsx';
import EdgeInspector from '../inspector/EdgeInspector.jsx';
import EdgeTierEditor from '../inspector/EdgeTierEditor.jsx';
import ProjectDefaultsCard from '../inspector/ProjectDefaultsCard.jsx';
import { SubcardAccordion } from '../inspector/SubcardAccordionContext.jsx';
import { DEFAULT_WAVE } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';

// Properties pane for the Layers Edit UI: a thin dispatcher that
// renders the right tier editor for the currently-focused layer row.
// Reuses every existing inspector component; no new editor logic.
export default function PropertiesPane({
  focus,
  project,
  pieces,
  sharedEdges,
  pieceTab,
  setPieceTab,
  onClearPieceSelection,
  onClearEdgeSelection,
  // setters
  setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
  setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
  setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
  setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
  setPieceContent, updatePieceContent,
  setDefaultCellEffects, setCellEffects,
}) {
  const t = useT();
  if (!focus) return <p className="hint properties-pane__hint">{t('edit.pickALayer')}</p>;

  const edges = project.edges;
  const defaultEdgeEffect  = edges.default.effect;
  const defaultEdgeConfig  = edges.default.config ?? DEFAULT_WAVE;
  const defaultEdgeEffects = edges.default.effects || {};

  if (focus.kind === 'default') {
    return (
      <ProjectDefaultsCard
        project={project}
        setDefaultEdgeEffect={setDefaultEdgeEffect}
        setDefaultEdgeConfig={setDefaultEdgeConfig}
        setDefaultEdgeEffects={setDefaultEdgeEffects}
        setDefaultCellEffects={setDefaultCellEffects}
      />
    );
  }

  if (focus.kind === 'inner' || focus.kind === 'outer') {
    const kind = focus.kind;
    const layer = edges[kind];
    return (
      <SubcardAccordion id={kind} defaultOpenId="shape-stroke">
        <EdgeTierEditor
          title={kind === 'inner' ? t('edit.tierInnerEdges') : t('edit.tierOuterEdges')}
          accent
          effect={layer?.effect ?? defaultEdgeEffect}
          config={layer?.config ?? defaultEdgeConfig}
          ownEffects={layer?.effects || {}}
          inheritedEffects={defaultEdgeEffects}
          onSetEffect={(name) => setLayerEffect(kind, name, name === 'wave'
            ? (layer?.config ?? defaultEdgeConfig) : undefined)}
          onPatchConfig={(patch) => setLayerConfig(kind, patch)}
          onChangeEffects={(map) => setLayerEffects(kind, map)}
          onClear={layer ? () => clearLayer(kind) : null}
        />
      </SubcardAccordion>
    );
  }

  if (focus.kind === 'piece') {
    const piece = pieces.find((p) => p.id === focus.id);
    if (!piece) return <p className="hint properties-pane__hint">{t('edit.pieceNotFound')}</p>;
    return (
      <PieceInspector
        piece={piece}
        project={project}
        activeTab={pieceTab}
        onChangeTab={setPieceTab}
        onClearSelection={onClearPieceSelection}
        setPieceContent={setPieceContent}
        updatePieceContent={updatePieceContent}
        setCellEffects={setCellEffects}
        setPieceEdgeEffect={setPieceEdgeEffect}
        setPieceEdgeConfig={setPieceEdgeConfig}
        setPieceEdgeEffects={setPieceEdgeEffects}
        clearPieceEdgeOverride={clearPieceEdgeOverride}
      />
    );
  }

  if (focus.kind === 'edge') {
    const selected = new Set([focus.id]);
    return (
      <EdgeInspector
        selected={selected}
        project={project}
        pieces={pieces}
        sharedEdges={sharedEdges}
        onClearSelection={onClearEdgeSelection}
        setEdgeEffect={setEdgeEffect}
        setEdgeConfig={setEdgeConfig}
        clearEdgeOverride={clearEdgeOverride}
        setEdgeEffects={setEdgeEffects}
      />
    );
  }

  return null;
}
