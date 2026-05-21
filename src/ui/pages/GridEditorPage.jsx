import { useEffect, useMemo, useRef, useState } from 'react';
import { MAX_GRID, MIN_GRID, isRectangular } from '../../grid/grid.js';
import { importTableText } from '../../grid/import.js';
import GridCanvas from '../components/GridCanvas.jsx';
import BackgroundsPanel from '../components/BackgroundsPanel.jsx';
import ImportDialog from '../components/ImportDialog.jsx';
import SliderRow from '../components/SliderRow.jsx';
import ViewPanel from '../components/ViewPanel.jsx';
import AccordionCard from '../components/AccordionCard.jsx';
import BottomSheet from '../components/BottomSheet.jsx';
import Icon from '../components/Icon.jsx';
import Tooltip from '../components/Tooltip.jsx';
import { useFileInput } from '../hooks/useFileInput.js';
import { useMediaQuery } from '../hooks/useMediaQuery.js';
import { useT } from '../../i18n/index.js';

const PASSIVE_CARDS = new Set(['dimensions', 'tips', 'import']);

// Curated palette — warm, sophisticated, mode-agnostic.
const PALETTE = [
  '#d68b54', '#e6a378', '#c87070', '#d4a056', '#a98ec4',
  '#5fb68f', '#7fc9a6', '#5b8c85', '#6b9bd1', '#a3a3a3',
];

export default function GridEditorPage({ project }) {
  const t = useT();
  const {
    project: p, setGrid, merge, unmerge, setPieceColor, replaceGrid,
    removeRows, removeCols,
    addBackground, updateBackground, removeBackground,
  } = project;
  const [selection, setSelection] = useState([]);
  const [showImport, setShowImport] = useState(false);
  const [openCard, setOpenCard] = useState('selection');
  // Phone layout: same accordion-card tools, but hosted in a draggable
  // BottomSheet so the canvas above stays fully usable.
  const isPhone = useMediaQuery('(max-width: 640px)');
  // Sheet snap follows selection: the moment the user picks cells we
  // expand to the working size; clearing snaps it back to a peek.
  const [sheetSnap, setSheetSnap] = useState('collapsed');
  const prevHadSelectionRef = useRef(false);

  // Bounding rect of the current selection in cell coordinates, or null.
  const selectionRect = useMemo(() => {
    if (selection.length === 0) return null;
    let rMin = Infinity, rMax = -Infinity, cMin = Infinity, cMax = -Infinity;
    for (const [r, c] of selection) {
      if (r < rMin) rMin = r; if (r > rMax) rMax = r;
      if (c < cMin) cMin = c; if (c > cMax) cMax = c;
    }
    return { rMin, rMax, cMin, cMax };
  }, [selection]);

  // Read an image file (or blob) as a data URL, then add a background covering
  // either the current selection or the whole grid as a fallback.
  const addImageFromFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const rect = selectionRect ?? {
        rMin: 0, rMax: (p?.grid.rows ?? 1) - 1,
        cMin: 0, cMax: (p?.grid.cols ?? 1) - 1,
      };
      addBackground({ src: ev.target.result, rect, fit: 'cover' });
    };
    reader.readAsDataURL(file);
  };

  // Listen for paste events globally — if an image is in the clipboard,
  // turn it into a background covering the current selection (or full grid).
  useEffect(() => {
    const handler = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) addImageFromFile(file);
          return;
        }
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionRect, p?.grid.rows, p?.grid.cols]);

  // Auto-swap to the Selection card the first time the user picks cells while
  // a non-selection-related card is open. Doesn't override an explicit user
  // pick of Color / Backgrounds — they're directly relevant to a selection.
  useEffect(() => {
    if (selection.length === 0) return;
    setOpenCard((cur) => (PASSIVE_CARDS.has(cur) ? 'selection' : cur));
  }, [selection.length]);

  // Drive the phone sheet snap from selection state. Manual drags
  // still override — we only push on the *transition* between
  // "has selection" and "no selection".
  useEffect(() => {
    if (!isPhone) return;
    const hadBefore = prevHadSelectionRef.current;
    const hasNow    = selection.length > 0;
    if (hasNow && !hadBefore) setSheetSnap('default');
    else if (!hasNow && hadBefore) setSheetSnap('collapsed');
    prevHadSelectionRef.current = hasNow;
  }, [selection.length, isPhone]);

  const handleImportText = (text, opts) => {
    try {
      const { grid, pieceContent } = importTableText(text, opts);
      replaceGrid(grid, pieceContent);
      setShowImport(false);
      setSelection([]);
    } catch (err) {
      alert(t('grid.importFailed', { detail: err.message }));
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      handleImportText(text, { autoMerge: true });
    } catch (err) {
      alert(t('grid.readFileFailed', { detail: err.message }));
    }
  };

  const csvInput = useFileInput(handleImportFile);

  if (!p) return null;

  const canMerge = selection.length >= 2 && isRectangular(selection);
  const canUnmerge = selection.length >= 1;

  // Unique groupIds for the selected cells.
  const selectedGroupIds = useMemo(() => {
    const ids = new Set();
    for (const [r, c] of selection) {
      const id = p.grid.groups[r]?.[c];
      if (id) ids.add(id);
    }
    return [...ids];
  }, [selection, p.grid.groups]);

  // Current shared color (or null if mixed/unset).
  const currentColor = useMemo(() => {
    if (selectedGroupIds.length === 0) return null;
    const first = p.pieceColors?.[selectedGroupIds[0]] ?? null;
    return selectedGroupIds.every((id) => (p.pieceColors?.[id] ?? null) === first) ? first : null;
  }, [selectedGroupIds, p.pieceColors]);

  const applyColor = (color) => {
    for (const id of selectedGroupIds) setPieceColor(id, color);
  };

  const doMerge = () => {
    if (!canMerge) return;
    merge(selection);
    setSelection([]);
  };

  const doUnmerge = () => {
    if (!canUnmerge) return;
    unmerge(selection);
    setSelection([]);
  };

  const clearSel = () => setSelection([]);

  const tools = (
    <>
      <AccordionCard
          id="selection"
          title={t('grid.cardSelection')}
          badge={selection.length > 0 ? selection.length : null}
          open={openCard === 'selection'}
          onToggle={setOpenCard}
        >
          <p className="hint">
            {selection.length === 0
              ? t('grid.selectionHintEmpty')
              : t(selection.length === 1 ? 'grid.selectionHint.one' : 'grid.selectionHint.other', { n: selection.length })}
          </p>
          <div className="action-stack">
            <Tooltip label={canMerge ? t('grid.mergeTooltipOk') : t('grid.mergeTooltipDisabled')}>
              <button
                type="button"
                className="action-btn action-btn--primary"
                disabled={!canMerge}
                onClick={doMerge}
              >
                <Icon name="merge" size={14} />
                <span>{t('grid.merge')}</span>
              </button>
            </Tooltip>
            <button
              type="button"
              className="action-btn"
              disabled={!canUnmerge}
              onClick={doUnmerge}
            >
              <Icon name="unmerge" size={14} />
              <span>{t('grid.unmerge')}</span>
            </button>
            <button
              type="button"
              className="action-btn action-btn--ghost"
              disabled={selection.length === 0}
              onClick={clearSel}
            >
              {t('grid.clearSelection')}
            </button>
          </div>
          {selection.length >= 2 && !canMerge && (
            <p className="hint hint--warn">
              {t('grid.selectionNotRect')}
            </p>
          )}
        </AccordionCard>

        <AccordionCard
          id="color"
          title={t('grid.cardColor')}
          badge={selectedGroupIds.length > 1 ? selectedGroupIds.length : null}
          open={openCard === 'color'}
          onToggle={setOpenCard}
          disabled={selectedGroupIds.length === 0}
        >
          <div className="color-grid">
            <Tooltip label={t('grid.clearColorLabel')}>
              <button
                type="button"
                className={`color-swatch color-swatch--clear ${currentColor == null ? 'color-swatch--active' : ''}`}
                onClick={() => applyColor(null)}
                aria-label={t('grid.clearColorLabel')}
              />
            </Tooltip>
            {PALETTE.map((c) => (
              <Tooltip key={c} label={c}>
                <button
                  type="button"
                  className={`color-swatch ${currentColor === c ? 'color-swatch--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => applyColor(c)}
                  aria-label={t('grid.colorAriaLabel', { c })}
                />
              </Tooltip>
            ))}
            <Tooltip label={t('grid.customColor')}>
              <label className="color-swatch color-swatch--custom">
                <input
                  type="color"
                  value={currentColor || '#888888'}
                  onChange={(e) => applyColor(e.target.value)}
                />
              </label>
            </Tooltip>
          </div>
          {selectedGroupIds.length === 0 && (
            <p className="hint">{t('grid.colorHint')}</p>
          )}
        </AccordionCard>

        <AccordionCard
          id="backgrounds"
          title={t('grid.cardBackgrounds')}
          badge={p.backgrounds?.length || null}
          open={openCard === 'backgrounds'}
          onToggle={setOpenCard}
        >
          <BackgroundsPanel
            backgrounds={p.backgrounds || []}
            selectionRect={selectionRect}
            onAddImage={addImageFromFile}
            onUpdate={updateBackground}
            onRemove={removeBackground}
          />
        </AccordionCard>

        <AccordionCard
          id="dimensions"
          title={t('grid.cardDimensions')}
          open={openCard === 'dimensions'}
          onToggle={setOpenCard}
        >
          <SliderRow
            label={t('grid.rowsLabel')} min={MIN_GRID} max={MAX_GRID}
            value={p.grid.rows}
            onChange={(v) => setGrid({ rows: v })}
          />
          <SliderRow
            label={t('grid.colsLabel')} min={MIN_GRID} max={MAX_GRID}
            value={p.grid.cols}
            onChange={(v) => setGrid({ cols: v })}
          />
          <p className="hint">{t('grid.dimensionsHint', { rows: p.grid.rows, cols: p.grid.cols, max: MAX_GRID })}</p>
        </AccordionCard>

        <AccordionCard
          id="import"
          title={t('grid.cardImport')}
          open={openCard === 'import'}
          onToggle={setOpenCard}
        >
          <p className="hint">{t('grid.importHint')}</p>
          <div className="action-stack">
            <button type="button" className="action-btn" onClick={() => setShowImport(true)}>
              <Icon name="paste" size={14} />
              <span>{t('grid.pasteData')}</span>
            </button>
            <input
              {...csvInput.inputProps}
              type="file"
              accept=".csv,.tsv,.txt,text/csv"
              hidden
            />
            <button type="button" className="action-btn action-btn--ghost" onClick={csvInput.open}>
              <Icon name="upload" size={14} />
              <span>{t('grid.importCsvTsv')}</span>
            </button>
          </div>
          <p className="hint hint--warn">{t('grid.importWarnHint')}</p>
        </AccordionCard>

        <AccordionCard
          id="tips"
          title={t('grid.cardTips')}
          open={openCard === 'tips'}
          onToggle={setOpenCard}
        >
          <ul className="tip-list">
            <li>{t('grid.tip1')}</li>
            <li>{t('grid.tip2')}</li>
            <li>{t('grid.tip3')}</li>
            <li>{t('grid.tip4')}</li>
            <li>{t('grid.tip5')}</li>
            <li>{t('grid.tip6')}</li>
            <li>{t('grid.tip7')}</li>
          </ul>
        </AccordionCard>
    </>
  );

  const canvas = (
    <ViewPanel>
      <GridCanvas
        grid={p.grid}
        selection={selection}
        onSelectionChange={setSelection}
        pieceColors={p.pieceColors}
        backgrounds={p.backgrounds}
        onDeleteRows={(idxs) => { removeRows(idxs); setSelection([]); }}
        onDeleteCols={(idxs) => { removeCols(idxs); setSelection([]); }}
      />
    </ViewPanel>
  );

  return (
    <div className={`page-grid${isPhone ? ' page-grid--phone' : ''}`}>
      {isPhone ? (
        <>
          {canvas}
          <BottomSheet
            open
            title={t('grid.sheetTitle')}
            snap={sheetSnap}
            onSnapChange={setSheetSnap}
            defaultSnap="collapsed"
          >
            <div className="page-grid__mobile-tools">{tools}</div>
          </BottomSheet>
        </>
      ) : (
        <>
          <aside className="side-tools">{tools}</aside>
          {canvas}
        </>
      )}

      {showImport && (
        <ImportDialog
          onClose={() => setShowImport(false)}
          onImport={handleImportText}
        />
      )}
    </div>
  );
}

