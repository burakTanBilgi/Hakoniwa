import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import EdgeTierEditor from './EdgeTierEditor.jsx';
import CellTierEditor from './CellTierEditor.jsx';
import InspectorTabs from './InspectorTabs.jsx';
import InspectorSubcard from './InspectorSubcard.jsx';
import { SubcardAccordion } from './SubcardAccordionContext.jsx';
import SliderRow from '../SliderRow.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { useFileInput } from '../../hooks/useFileInput.js';
import { FIT_OPTIONS } from '../../utils/fitOptions.js';
import { DEFAULT_WAVE } from '../edges/constants.js';
import { useT } from '../../../i18n/index.js';

// Doxa picker is heavy (modal + Supabase query layer) and only matters
// when a piece is being assigned a Doxa embed — lazy-load so the
// Inspector chunk stays light.
const DoxaEmbedPicker = lazy(() => import('../../../embeds/DoxaEmbedPicker.jsx'));

// Tab ids — labels are resolved from i18n at render time
const TAB_IDS = ['content', 'body', 'edges'];

// Align option values — labels are resolved from i18n at render time
const ALIGN_OPTION_VALUES = [
  { value: 'left',   icon: 'align-left',   labelKey: 'inspector.content.alignLeft'   },
  { value: 'center', icon: 'align-center', labelKey: 'inspector.content.alignCenter' },
  { value: 'right',  icon: 'align-right',  labelKey: 'inspector.content.alignRight'  },
];

// Body of the "Piece" accordion card. Renders the three-tab editor
// (Content / Body / Edges) scoped to the selected piece. Lower / higher
// tiers are owned by Inspector.jsx as sibling accordion cards now.
export default function PieceInspector({
  piece,
  project,
  activeTab,
  onChangeTab,
  onClearSelection,
  // content
  setPieceContent, updatePieceContent,
  // cells
  setCellEffects,
  // edges
  setPieceEdgeEffect, setPieceEdgeConfig, setPieceEdgeEffects, clearPieceEdgeOverride,
}) {
  const t = useT();

  const edges = project.edges;
  const defaultEdgeEffect = edges.default.effect;
  const defaultEdgeConfig = edges.default.config ?? DEFAULT_WAVE;
  const defaultEdgeEffects = edges.default.effects || {};

  const cellOverride = edges.byPiece?.[piece.id] || null;
  const pieceEdgeEffect = cellOverride?.effect ?? defaultEdgeEffect;
  const pieceEdgeConfig = cellOverride?.config ?? defaultEdgeConfig;

  const defaultCellEffects = project?.cells?.default?.effects || {};
  const pieceCellEffects   = project?.cells?.byPiece?.[piece.id]?.effects || {};

  const tabs = TAB_IDS.map((id) => ({ id, label: t(`inspector.tab.${id}`) }));

  return (
    <>
      <div className="inspector-header">
        <div>
          <span className="inspector-header__kind">{t('inspector.pieceKind')}</span>
          <span className="inspector-header__title">{piece.label || piece.id}</span>
        </div>
        <Tooltip label={t('inspector.clearSelection')}>
          <button type="button" className="icon-action-btn" aria-label={t('inspector.clearSelection')} onClick={onClearSelection}>
            <Icon name="close" size={13} />
          </button>
        </Tooltip>
      </div>

      <InspectorTabs tabs={tabs} active={activeTab} onPick={onChangeTab} />

      {activeTab === 'content' && (
        <SubcardAccordion id="piece-content" defaultOpenId="content">
          <ContentTab
            piece={piece}
            setPieceContent={setPieceContent}
            updatePieceContent={updatePieceContent}
          />
        </SubcardAccordion>
      )}

      {activeTab === 'body' && (
        <SubcardAccordion id="piece-body" defaultOpenId="body-animations">
          <CellTierEditor
            title={t('inspector.piecesBodyTitle')}
            accent
            ownEffects={pieceCellEffects}
            inheritedEffects={defaultCellEffects}
            onChange={(map) => setCellEffects(piece.id, map)}
          />
        </SubcardAccordion>
      )}

      {activeTab === 'edges' && (
        <SubcardAccordion id="piece-edges" defaultOpenId="shape-stroke">
          <EdgeTierEditor
            title={t('inspector.piecesEdgesTitle')}
            accent
            effect={pieceEdgeEffect}
            config={pieceEdgeConfig}
            ownEffects={cellOverride?.effects || {}}
            inheritedEffects={defaultEdgeEffects}
            onSetEffect={(name) => setPieceEdgeEffect(piece.id, name, name === 'wave'
              ? (cellOverride?.config ?? defaultEdgeConfig) : undefined)}
            onPatchConfig={(patch) => setPieceEdgeConfig(piece.id, patch)}
            onChangeEffects={(map) => setPieceEdgeEffects(piece.id, map)}
            onClear={cellOverride ? () => clearPieceEdgeOverride(piece.id) : null}
          />
        </SubcardAccordion>
      )}
    </>
  );
}

function ContentTab({ piece, setPieceContent, updatePieceContent }) {
  const t = useT();
  const content = piece.content || null;
  const textareaRef = useRef(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  // Type-to-fill: while the piece is selected on the Content tab with no
  // content yet, the first printable keypress (outside any input) seeds a
  // text content and focuses the textarea so typing continues naturally.
  useEffect(() => {
    if (content) return;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (typeof e.key !== 'string' || e.key.length !== 1) return;
      e.preventDefault();
      const ch = e.key;
      setPieceContent(piece.id, { type: 'text', text: ch });
      requestAnimationFrame(() => {
        const ta = textareaRef.current;
        if (ta) {
          ta.focus();
          ta.setSelectionRange(ta.value.length, ta.value.length);
        }
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [content, piece.id, setPieceContent]);

  const setType = (type) => {
    if (type === 'none')  return setPieceContent(piece.id, null);
    if (type === 'text')  return setPieceContent(piece.id, { type: 'text',  text: content?.text || '' });
    if (type === 'image') return setPieceContent(piece.id, { type: 'image', src: content?.src || '', fit: content?.fit || 'cover' });
    if (type === 'doxa-embed') return setPickerOpen(true);
  };

  const handleImageFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      updatePieceContent(piece.id, {
        type: 'image',
        src: e.target.result,
        fit: content?.fit || 'cover',
      });
    };
    reader.readAsDataURL(file);
  };

  const { inputProps, open } = useFileInput(handleImageFile);

  const contentTypeChips = [
    { v: 'none',       l: t('inspector.content.typeEmpty') },
    { v: 'text',       l: t('inspector.content.typeText')  },
    { v: 'image',      l: t('inspector.content.typeImage') },
    { v: 'doxa-embed', l: t('inspector.content.typeDoxa')  },
  ];

  const alignOptions = ALIGN_OPTION_VALUES.map((a) => ({ ...a, label: t(a.labelKey) }));

  return (
    <InspectorSubcard
      id="content"
      title={t('inspector.content.title')}
      accent
      actions={content
        ? (
          <Tooltip label={t('inspector.content.clearContent')}>
            <button type="button" className="icon-action-btn icon-action-btn--danger"
              aria-label={t('inspector.content.clearContent')}
              onClick={() => setPieceContent(piece.id, null)}>
              <Icon name="trash" size={13} />
            </button>
          </Tooltip>
        )
        : null}
    >
      <div className="effect-chips">
        {contentTypeChips.map((chip) => (
          <button key={chip.v} type="button"
            className={`chip chip--sm ${(content?.type || 'none') === chip.v ? 'chip--active' : ''}`}
            onClick={() => setType(chip.v)}>
            {chip.l}
          </button>
        ))}
      </div>

      {content?.type === 'doxa-embed' && (
        <div className="content-config">
          <p className="hint">{summarizeDoxaView(content.view, t)}</p>
          <button
            type="button"
            className="action-btn action-btn--ghost"
            onClick={() => setPickerOpen(true)}
          >
            <Icon name="upload" size={14} />
            <span>{t('inspector.content.pickAnotherChart')}</span>
          </button>
        </div>
      )}

      <Suspense fallback={null}>
        {pickerOpen && (
          <DoxaEmbedPicker
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onPick={({ projectId, view }) => {
              setPieceContent(piece.id, { type: 'doxa-embed', projectId, view });
            }}
          />
        )}
      </Suspense>

      {content?.type === 'text' && (
        <div className="content-config">
          <textarea
            ref={textareaRef}
            className="modal__textarea"
            style={{ minHeight: 80 }}
            placeholder={t('inspector.content.textPlaceholder')}
            value={content.text || ''}
            onChange={(e) => updatePieceContent(piece.id, { text: e.target.value })}
          />
          <div className="form-row">
            <label className="form-row__label">{t('inspector.content.alignLabel')}</label>
            <div className="effect-chips effect-chips--icons">
              {alignOptions.map((a) => (
                <Tooltip key={a.value} label={a.label}>
                  <button type="button"
                    className={`chip chip--icon ${(content.align || 'center') === a.value ? 'chip--active' : ''}`}
                    onClick={() => updatePieceContent(piece.id, { align: a.value })}
                    aria-label={a.label}
                    aria-pressed={(content.align || 'center') === a.value}>
                    <Icon name={a.icon} size={14} />
                  </button>
                </Tooltip>
              ))}
            </div>
          </div>
          <SliderRow
            label={t('inspector.content.sizeLabel')}
            min={8} max={64} step={1}
            value={Math.round(content.fontSize || Math.min(piece.w, piece.h) / 8)}
            onChange={(v) => updatePieceContent(piece.id, { fontSize: v })}
          />
          <div className="form-row">
            <label className="form-row__label">{t('inspector.content.colorLabel')}</label>
            <input
              type="color"
              className="form-row__color"
              value={content.color || '#ede8de'}
              onChange={(e) => updatePieceContent(piece.id, { color: e.target.value })}
            />
          </div>
        </div>
      )}

      {content?.type === 'image' && (
        <div className="content-config">
          <input {...inputProps} type="file" accept="image/*" hidden />
          <button type="button" className="action-btn action-btn--ghost" onClick={open}>
            <Icon name="upload" size={14} />
            <span>{content.src ? t('inspector.content.replaceImage') : t('inspector.content.uploadImage')}</span>
          </button>

          {content.src && (
            <>
              <div className="image-preview">
                <img src={content.src} alt={t('inspector.content.imagePreviewAlt')} />
              </div>
              <div className="form-row">
                <label className="form-row__label">{t('inspector.content.fitLabel')}</label>
                <div className="effect-chips">
                  {FIT_OPTIONS.map((f) => {
                    const labelKey = f.value === 'fill' ? 'common.fitStretch' : f.value === 'contain' ? 'common.fitContain' : 'common.fitCover';
                    const hintKey  = f.value === 'fill' ? 'common.fitHintStretch' : f.value === 'contain' ? 'common.fitHintContain' : 'common.fitHintCover';
                    return (
                      <Tooltip key={f.value} label={t(hintKey)}>
                        <button type="button"
                          className={`chip chip--sm ${(content.fit || 'cover') === f.value ? 'chip--active' : ''}`}
                          onClick={() => updatePieceContent(piece.id, { fit: f.value })}>
                          {t(labelKey)}
                        </button>
                      </Tooltip>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </InspectorSubcard>
  );
}

// Summary of a Doxa embed view, shown beneath the type picker so the user
// can see at a glance what's currently embedded.
function summarizeDoxaView(view, t) {
  if (!view) return t('inspector.content.noChartPicked');
  if (view.kind === 'chart')      return t('inspector.content.singleChart', { id: view.chartId });
  if (view.kind === 'comparison') return t('inspector.content.comparisonCharts', { n: view.chartIds?.length || 0 });
  return t('inspector.content.unknownViewKind', { kind: view.kind });
}
