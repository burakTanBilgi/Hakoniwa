import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { ThumbCanvas, ThumbLayers, ThumbFlat, ThumbModes } from './preview-thumbs.jsx';
import { useT } from '../../../i18n/index.js';
import './EditModePicker.css';

const MODE_DEFS = [
  { id: 'canvas', labelKey: 'editUi.modeCanvas', blurbKey: 'editUi.modeCanvasBlurb', Thumb: ThumbCanvas, soon: false },
  { id: 'layers', labelKey: 'editUi.modeLayers', blurbKey: 'editUi.modeLayersBlurb', Thumb: ThumbLayers, soon: false },
  { id: 'flat',   labelKey: 'editUi.modeFlat',   blurbKey: 'editUi.modeFlatBlurb',   Thumb: ThumbFlat,   soon: false },
  { id: 'modes',  labelKey: 'editUi.modeWorkflow',blurbKey: 'editUi.modeWorkflowBlurb',Thumb: ThumbModes, soon: false },
];

const POP_W = 304;
const POP_GAP = 8;
const VIEWPORT_PAD = 12;

// Tiny picker icon + popover. The popover is portalled to <body> and
// positioned `fixed` based on the button's screen rect, so it never gets
// clipped by an ancestor with `overflow: hidden` (e.g. the side-tools
// rail or the nav-rail). Auto-flips above the button when there's no
// room below.
export default function EditModePicker({ mode, onChangeMode, tiles, onChangeTiles }) {
  const t = useT();
  const MODES = MODE_DEFS.map((m) => ({ ...m, label: t(m.labelKey), blurb: t(m.blurbKey) }));
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, flip: false });

  // Recompute the popover's screen position whenever it opens or the
  // window resizes/scrolls. Portal + fixed = the popover escapes every
  // parent overflow clip.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const btn = btnRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const popH = popRef.current?.offsetHeight ?? 360;
      const wantTopBelow = r.bottom + POP_GAP;
      const overflowsBottom = wantTopBelow + popH > window.innerHeight - VIEWPORT_PAD;
      const flip = overflowsBottom;
      const top = flip
        ? Math.max(VIEWPORT_PAD, r.top - POP_GAP - popH)
        : wantTopBelow;
      // Prefer right-aligned to the button; clamp to viewport.
      let left = r.right - POP_W;
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      if (left + POP_W > window.innerWidth - VIEWPORT_PAD) {
        left = window.innerWidth - VIEWPORT_PAD - POP_W;
      }
      setCoords({ top, left, flip });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // Outside-click + Esc dismiss.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const activeMode = MODES.find((m) => m.id === mode) || MODES[0];

  return (
    <>
      <Tooltip label={t('editUi.modePickerTooltip', { label: activeMode.label })} side="right" disabled={open}>
        <button
          ref={btnRef}
          type="button"
          className={`mode-picker__btn${open ? ' mode-picker__btn--open' : ''}`}
          onClick={() => setOpen((v) => !v)}
          aria-label={t('editUi.switchLayoutAriaLabel', { label: activeMode.label })}
          aria-expanded={open}
          aria-haspopup="dialog"
        >
          <Icon name="mode-picker" size={14} />
        </button>
      </Tooltip>

      {open && createPortal(
        <div
          ref={popRef}
          className={`mode-picker__pop${coords.flip ? ' mode-picker__pop--up' : ''}`}
          role="dialog"
          aria-label={t('editUi.editLayoutsDialog')}
          style={{ top: coords.top, left: coords.left, width: POP_W }}
        >
          <div className="mode-picker__header">
            <p className="mode-picker__kicker">{t('editUi.modePickerKicker')}</p>
            <h3 className="mode-picker__heading">{t('editUi.modePickerHeading')}</h3>
          </div>

          <ul className="mode-picker__list">
            {MODES.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  className={`mode-picker__row${mode === m.id ? ' mode-picker__row--active' : ''}${m.soon ? ' mode-picker__row--soon' : ''}`}
                  disabled={m.soon}
                  onClick={() => { onChangeMode(m.id); setOpen(false); }}
                  aria-pressed={mode === m.id}
                >
                  <span className="mode-picker__thumb"><m.Thumb /></span>
                  <span className="mode-picker__text">
                    <span className="mode-picker__name">
                      <span>{m.label}</span>
                      {m.soon && <span className="mode-picker__soon">{t('editUi.modeSoon')}</span>}
                      {mode === m.id && !m.soon && <span className="mode-picker__current" aria-hidden="true">●</span>}
                    </span>
                    <span className="mode-picker__blurb">{m.blurb}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <label className="mode-picker__toggle">
            <input
              type="checkbox"
              checked={tiles}
              onChange={(e) => onChangeTiles(e.target.checked)}
            />
            <span className="mode-picker__toggle-label">
              <span>{t('editUi.tilesLabel')}</span>
              <span className="mode-picker__toggle-hint">{t('editUi.tilesHint')}</span>
            </span>
          </label>
        </div>,
        document.body
      )}
    </>
  );
}
