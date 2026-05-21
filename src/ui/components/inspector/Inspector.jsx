import { useEffect, useMemo, useState } from 'react';
import CascadeStrip from './CascadeStrip.jsx';
import ProjectDefaultsCard from './ProjectDefaultsCard.jsx';
import PieceInspector from './PieceInspector.jsx';
import EdgeInspector from './EdgeInspector.jsx';
import EdgeTierEditor from './EdgeTierEditor.jsx';
import { SubcardAccordion } from './SubcardAccordionContext.jsx';
import { computeTierStates } from './cascade-source.js';
import { DEFAULT_WAVE } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';

// Top-level selection-driven inspector. Three modes:
//
//   * No selection — show the project-wide defaults stack (Default body +
//     Default edges, plus Inner / Outer when applicable). Uses the cascade
//     strip + accordion model.
//   * Piece selected — focus the whole panel on that piece. The cascade
//     strip and all other tier cards disappear; only PieceInspector renders.
//   * Edge(s) selected — same focus rule, scoped to the edge selection.
//
// The "project defaults" mode keeps the accordion + cascade because that's
// where you actually navigate between tiers; the selection modes intentionally
// hide them so the user isn't drowned in chrome while editing one piece.
export default function Inspector({
  project,
  pieces,
  sharedEdges,
  selectedEdges,
  selectedPieceId,
  onClearEdgeSelection,
  onClearPieceSelection,
  setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
  setLayerEffect, setLayerConfig, clearLayer, setLayerEffects,
  setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
  setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
  setPieceContent, updatePieceContent,
  setDefaultCellEffects, setCellEffects,
}) {
  const t = useT();
  const [expandedTier, setExpandedTier] = useState(null);
  const [pieceTab, setPieceTab] = useState('edges');

  const selectionType = selectedEdges.size > 0 ? 'edge'
                      : selectedPieceId      ? 'piece'
                                             : 'none';
  const selectedPiece = useMemo(
    () => (selectedPieceId ? pieces.find((p) => p.id === selectedPieceId) : null),
    [pieces, selectedPieceId]
  );

  // Reset the tier pick whenever the selection fundamentally changes.
  useEffect(() => {
    setExpandedTier(null);
  }, [selectionType, selectedPieceId]);

  // === Piece-only focused view =========================================
  if (selectionType === 'piece' && selectedPiece) {
    return (
      <div className="inspector inspector--focus">
        <PieceInspector
          piece={selectedPiece}
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
      </div>
    );
  }

  // === Edge-only focused view ==========================================
  if (selectionType === 'edge') {
    return (
      <div className="inspector inspector--focus">
        <EdgeInspector
          selected={selectedEdges}
          project={project}
          pieces={pieces}
          sharedEdges={sharedEdges}
          onClearSelection={onClearEdgeSelection}
          setEdgeEffect={setEdgeEffect}
          setEdgeConfig={setEdgeConfig}
          clearEdgeOverride={clearEdgeOverride}
          setEdgeEffects={setEdgeEffects}
        />
      </div>
    );
  }

  // === No-selection view: pill menu picks ONE tier card =================
  const selectionShape = { type: 'none' };
  const tierStates = computeTierStates(project.edges, selectionShape);
  const openTier = expandedTier || 'default';
  const handlePickTier = (tier) => setExpandedTier(tier);

  const edges = project.edges;
  const defaultEdgeEffect = edges.default.effect;
  const defaultEdgeConfig = edges.default.config ?? DEFAULT_WAVE;
  const defaultEdgeEffects = edges.default.effects || {};

  return (
    <div className="inspector">
      <CascadeStrip
        states={tierStates}
        currentTier={openTier}
        onSelectTier={handlePickTier}
      />

      <div className="inspector-acc">
        {openTier === 'default' && (
          <ProjectDefaultsCard
            project={project}
            setDefaultEdgeEffect={setDefaultEdgeEffect}
            setDefaultEdgeConfig={setDefaultEdgeConfig}
            setDefaultEdgeEffects={setDefaultEdgeEffects}
            setDefaultCellEffects={setDefaultCellEffects}
          />
        )}

        {openTier === 'inner' && tierStates.inner.applicable && (
          <SubcardAccordion id="inner" defaultOpenId="shape-stroke">
            <EdgeTierEditor
              title={t('inspector.innerEdges')}
              accent
              effect={edges.inner?.effect ?? defaultEdgeEffect}
              config={edges.inner?.config ?? defaultEdgeConfig}
              ownEffects={edges.inner?.effects || {}}
              inheritedEffects={defaultEdgeEffects}
              onSetEffect={(name) => setLayerEffect('inner', name, name === 'wave'
                ? (edges.inner?.config ?? defaultEdgeConfig) : undefined)}
              onPatchConfig={(patch) => setLayerConfig('inner', patch)}
              onChangeEffects={(map) => setLayerEffects('inner', map)}
              onClear={edges.inner ? () => clearLayer('inner') : null}
            />
          </SubcardAccordion>
        )}

        {openTier === 'outer' && tierStates.outer.applicable && (
          <SubcardAccordion id="outer" defaultOpenId="shape-stroke">
            <EdgeTierEditor
              title={t('inspector.outerEdges')}
              accent
              effect={edges.outer?.effect ?? defaultEdgeEffect}
              config={edges.outer?.config ?? defaultEdgeConfig}
              ownEffects={edges.outer?.effects || {}}
              inheritedEffects={defaultEdgeEffects}
              onSetEffect={(name) => setLayerEffect('outer', name, name === 'wave'
                ? (edges.outer?.config ?? defaultEdgeConfig) : undefined)}
              onPatchConfig={(patch) => setLayerConfig('outer', patch)}
              onChangeEffects={(map) => setLayerEffects('outer', map)}
              onClear={edges.outer ? () => clearLayer('outer') : null}
            />
          </SubcardAccordion>
        )}
      </div>
    </div>
  );
}
