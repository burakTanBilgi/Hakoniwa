import { useState } from 'react';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import EdgeTierEditor from '../inspector/EdgeTierEditor.jsx';
import CellTierEditor from '../inspector/CellTierEditor.jsx';
import { SubcardAccordion } from '../inspector/SubcardAccordionContext.jsx';
import { piecesOfEdge } from '../../../grid/compile.js';
import { DEFAULT_WAVE } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';
import './WorkflowEditUi.css';

// Curated palette duplicated from GridEditorPage. Could be hoisted to a
// shared module later; kept local to avoid cross-page coupling for now.
const PALETTE = [
  '#d68b54', '#e6a378', '#c87070', '#d4a056', '#a98ec4',
  '#5fb68f', '#7fc9a6', '#5b8c85', '#6b9bd1', '#a3a3a3',
];

const TASK_DEFS = [
  { id: 'connect', icon: 'eff-puzzle',     labelKey: 'editUi.taskConnect', blurbKey: 'editUi.taskConnectBlurb' },
  { id: 'paint',   icon: 'prop-color',     labelKey: 'editUi.taskPaint',   blurbKey: 'editUi.taskPaintBlurb'   },
  { id: 'animate', icon: 'anim-highlight', labelKey: 'editUi.taskAnimate', blurbKey: 'editUi.taskAnimateBlurb' },
];

// Workflow Edit UI (Direction C). Switches the entire panel by task,
// not by selection. Three modes — Connect / Paint / Animate — each
// shows only the controls relevant to its job. The canvas is shared.
export default function WorkflowEditUi(props) {
  const t = useT();
  const TASKS = TASK_DEFS.map((td) => ({ ...td, label: t(td.labelKey), blurb: t(td.blurbKey) }));
  const [task, setTask] = useState('connect');
  return (
    <div className="workflow-edit-ui">
      <div className="workflow-edit-ui__strip" role="tablist" aria-label={t('editUi.editTaskAriaLabel')}>
        {TASKS.map((td) => (
          <Tooltip key={td.id} label={td.blurb}>
            <button
              type="button"
              role="tab"
              aria-selected={task === td.id}
              aria-label={td.label}
              className={`workflow-tab${task === td.id ? ' workflow-tab--active' : ''}`}
              onClick={() => setTask(td.id)}
            >
              <Icon name={td.icon} size={14} />
              <span className="workflow-tab__label">{td.label}</span>
            </button>
          </Tooltip>
        ))}
      </div>

      <div className="workflow-edit-ui__body" role="tabpanel">
        {task === 'connect' && <ConnectTask {...props} />}
        {task === 'paint'   && <PaintTask   {...props} />}
        {task === 'animate' && <AnimateTask {...props} />}
      </div>
    </div>
  );
}

// === Connect — pick a shape ====================================

function ConnectTask({
  project, sharedEdges, pieces,
  selectedEdges, selectedPieceId,
  setDefaultEdgeEffect, setDefaultEdgeConfig, setDefaultEdgeEffects,
  setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
  setEdgeEffect, setEdgeConfig, clearEdgeOverride, setEdgeEffects,
}) {
  const t = useT();
  const edges = project.edges;
  const defaultEdgeEffect  = edges.default.effect;
  const defaultEdgeConfig  = edges.default.config ?? DEFAULT_WAVE;
  const defaultEdgeEffects = edges.default.effects || {};

  const firstPairKey = selectedEdges?.size ? [...selectedEdges][0] : null;
  const pieceId      = selectedPieceId || (firstPairKey ? piecesOfEdge(firstPairKey)[0] : null);

  // Pick the highest applicable scope: per-edge > per-piece > default.
  let scope = 'default';
  if (firstPairKey)    scope = 'edge';
  else if (pieceId)    scope = 'piece';

  if (scope === 'edge') {
    const ov = edges.byEdge?.[firstPairKey] || null;
    return (
      <EditorWrapper kicker={t('editUi.connectEdgeKicker')} body={
        <SubcardAccordion id="workflow-connect-edge" defaultOpenId="shape-stroke">
          <EdgeTierEditor
            title={t('edit.tierEdge')} accent
            effect={ov?.effect ?? defaultEdgeEffect}
            config={ov?.config ?? defaultEdgeConfig}
            ownEffects={ov?.effects || {}}
            inheritedEffects={defaultEdgeEffects}
            onSetEffect={(name) => setEdgeEffect(firstPairKey, name, name === 'wave' ? (ov?.config ?? defaultEdgeConfig) : undefined)}
            onPatchConfig={(patch) => setEdgeConfig(firstPairKey, patch)}
            onChangeEffects={(map) => setEdgeEffects(firstPairKey, map)}
            onClear={ov ? () => clearEdgeOverride(firstPairKey) : null}
          />
        </SubcardAccordion>
      } />
    );
  }
  if (scope === 'piece') {
    const cell = edges.byPiece?.[pieceId] || null;
    return (
      <EditorWrapper kicker={t('editUi.connectPieceKicker')} body={
        <SubcardAccordion id="workflow-connect-piece" defaultOpenId="shape-stroke">
          <EdgeTierEditor
            title={t('edit.tierPiece')} accent
            effect={cell?.effect ?? defaultEdgeEffect}
            config={cell?.config ?? defaultEdgeConfig}
            ownEffects={cell?.effects || {}}
            inheritedEffects={defaultEdgeEffects}
            onSetEffect={(name) => setPieceEdgeEffect(pieceId, name, name === 'wave' ? (cell?.config ?? defaultEdgeConfig) : undefined)}
            onPatchConfig={(patch) => setPieceEdgeConfig(pieceId, patch)}
            onChangeEffects={(map) => setPieceEdgeEffects(pieceId, map)}
            onClear={cell ? () => clearPieceEdgeOverride(pieceId) : null}
          />
        </SubcardAccordion>
      } />
    );
  }
  return (
    <EditorWrapper kicker={t('editUi.connectDefaultKicker')} body={
      <SubcardAccordion id="workflow-connect-default" defaultOpenId="shape-stroke">
        <EdgeTierEditor
          title={t('edit.tierDefault')} accent
          effect={defaultEdgeEffect}
          config={defaultEdgeConfig}
          ownEffects={defaultEdgeEffects}
          inheritedEffects={{}}
          onSetEffect={(name) => setDefaultEdgeEffect(name, name === 'wave' ? defaultEdgeConfig : undefined)}
          onPatchConfig={setDefaultEdgeConfig}
          onChangeEffects={setDefaultEdgeEffects}
        />
      </SubcardAccordion>
    } hint={t('editUi.connectDefaultHint')} />
  );
}

// === Paint — pick a color ======================================

function PaintTask({ project, selectedPieceId, selectedEdges, setPieceColor }) {
  const t = useT();
  const currentColor = selectedPieceId ? (project.pieceColors?.[selectedPieceId] ?? null) : null;
  const hasSelection = !!selectedPieceId && !(selectedEdges?.size > 0);
  const setColor = (c) => {
    if (!hasSelection || !setPieceColor) return;
    setPieceColor(selectedPieceId, c);
  };

  return (
    <EditorWrapper
      kicker={hasSelection ? t('editUi.paintKickerSelected') : t('editUi.paintKickerEmpty')}
      body={
        <div className="paint-task">
          {!hasSelection && (
            <p className="hint">
              {t('editUi.paintHint')}
            </p>
          )}
          <div className="color-grid">
            <Tooltip label={t('grid.clearColorLabel')}>
              <button
                type="button"
                className={`color-swatch color-swatch--clear${currentColor == null ? ' color-swatch--active' : ''}`}
                onClick={() => setColor(null)}
                disabled={!hasSelection}
                aria-label={t('grid.clearColorLabel')}
              />
            </Tooltip>
            {PALETTE.map((c) => (
              <Tooltip key={c} label={c}>
                <button
                  type="button"
                  className={`color-swatch${currentColor === c ? ' color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  disabled={!hasSelection}
                  aria-label={t('grid.colorAriaLabel', { c })}
                />
              </Tooltip>
            ))}
            <Tooltip label={t('grid.customColor')}>
              <label className="color-swatch color-swatch--custom">
                <input
                  type="color"
                  value={currentColor || '#888888'}
                  onChange={(e) => setColor(e.target.value)}
                  disabled={!hasSelection}
                />
              </label>
            </Tooltip>
          </div>
        </div>
      }
    />
  );
}

// === Animate — pick effects ====================================

function AnimateTask({
  project, selectedPieceId,
  setDefaultEdgeEffects, setDefaultCellEffects,
  setPieceEdgeEffects, clearPieceEdgeOverride,
  setCellEffects,
}) {
  const t = useT();
  const edges = project.edges;
  const defaultEdgeEffects = edges.default.effects || {};
  const defaultCellEffects = project?.cells?.default?.effects || {};
  const pieceCellEffects   = selectedPieceId ? (project?.cells?.byPiece?.[selectedPieceId]?.effects || {}) : null;
  const pieceEdgeEffects   = selectedPieceId ? (edges.byPiece?.[selectedPieceId]?.effects || {}) : null;

  if (selectedPieceId) {
    return (
      <EditorWrapper kicker={t('editUi.animatePieceKicker')} body={
        <SubcardAccordion id="workflow-animate-piece" defaultOpenId="animations">
          <EdgeTierEditor
            title={t('editUi.animateEdgeEffectsTitle')}
            accent
            strokeHidden
            ownEffects={pieceEdgeEffects}
            inheritedEffects={defaultEdgeEffects}
            onChangeEffects={(map) => setPieceEdgeEffects(selectedPieceId, map)}
            onClear={edges.byPiece?.[selectedPieceId] ? () => clearPieceEdgeOverride(selectedPieceId) : null}
          />
          <CellTierEditor
            title={t('editUi.animatePieceBodyTitle')}
            accent
            ownEffects={pieceCellEffects}
            inheritedEffects={defaultCellEffects}
            onChange={(map) => setCellEffects(selectedPieceId, map)}
          />
        </SubcardAccordion>
      } />
    );
  }

  return (
    <EditorWrapper kicker={t('editUi.animateDefaultKicker')} body={
      <SubcardAccordion id="workflow-animate-default" defaultOpenId="animations">
        <EdgeTierEditor
          title={t('editUi.animateDefaultEdgesTitle')}
          accent
          strokeHidden
          ownEffects={defaultEdgeEffects}
          inheritedEffects={{}}
          onChangeEffects={setDefaultEdgeEffects}
        />
        <CellTierEditor
          title={t('editUi.animateDefaultBodyTitle')}
          accent
          ownEffects={defaultCellEffects}
          inheritedEffects={{}}
          onChange={setDefaultCellEffects}
        />
      </SubcardAccordion>
    } hint={t('editUi.animateDefaultHint')} />
  );
}

// === Shared editor wrapper =====================================

function EditorWrapper({ kicker, body, hint }) {
  return (
    <div className="workflow-edit-ui__editor">
      <p className="workflow-edit-ui__kicker">{kicker}</p>
      {body}
      {hint && <p className="hint workflow-edit-ui__hint">{hint}</p>}
    </div>
  );
}
