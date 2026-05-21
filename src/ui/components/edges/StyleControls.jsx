import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HexColorPicker } from 'react-colorful';
import SliderRow from '../SliderRow.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { useT } from '../../../i18n/index.js';
import { MIXED } from './constants.js';

const POP_W = 208;            // 192px picker + 8px×2 padding
const POP_H_EST = 220;        // height estimate; refined post-mount
const POP_GAP = 6;
const VIEWPORT_PAD = 12;

// Color / opacity / thickness — apply to every effect. Lives in the same
// `config` bag so it cascades through the existing priority chain.
//
// "Default color" (no entry) is distinct from "transparent": the former
// inherits the theme stroke color; the latter sets opacity to 0 / a
// transparent stroke so the page background shows through.
//
// The colour input is `react-colorful`'s `HexColorPicker` revealed in
// a small popover — replaces the native `<input type="color">` whose
// grey OS chrome clashed with the dark amber aesthetic.
export default function StyleControls({ config, onPatchConfig }) {
  const t = useT();
  const colorMixed   = config?.color === MIXED;
  const opacityMixed = config?.opacity === MIXED;
  const widthMixed   = config?.strokeWidth === MIXED;

  const colorValue = (typeof config?.color === 'string' && config.color !== MIXED)
    ? config.color
    : '#888888';
  const colorIsSet = typeof config?.color === 'string' && config.color !== MIXED;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, flip: false });
  const popRef = useRef(null);
  const triggerRef = useRef(null);

  // Position the portalled popover relative to the swatch via viewport
  // coordinates. Auto-flip above when the swatch sits near the viewport
  // bottom, and clamp horizontally so the popover never spills off-screen.
  useLayoutEffect(() => {
    if (!pickerOpen) return;
    const place = () => {
      const trig = triggerRef.current;
      if (!trig) return;
      const r = trig.getBoundingClientRect();
      const popH = popRef.current?.offsetHeight ?? POP_H_EST;
      const wantTopBelow = r.bottom + POP_GAP;
      const overflowsBottom = wantTopBelow + popH > window.innerHeight - VIEWPORT_PAD;
      const flip = overflowsBottom;
      const top = flip
        ? Math.max(VIEWPORT_PAD, r.top - POP_GAP - popH)
        : wantTopBelow;
      // Anchor to the swatch's left edge, then clamp inside the viewport.
      let left = r.left;
      if (left + POP_W > window.innerWidth - VIEWPORT_PAD) {
        left = window.innerWidth - VIEWPORT_PAD - POP_W;
      }
      if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
      setCoords({ top, left, flip });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [pickerOpen]);

  // Outside-click + Esc dismiss for the colour popover.
  useEffect(() => {
    if (!pickerOpen) return;
    const onClick = (e) => {
      if (popRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      setPickerOpen(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setPickerOpen(false); };
    document.addEventListener('mousedown', onClick);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [pickerOpen]);

  return (
    <div className="style-controls">
      <div className="form-row sc-color-row">
        <Tooltip label={t('effects.strokeColor')}>
          <span className="form-row__icon" aria-label={t('effects.strokeColor')}>
            <Icon name="prop-color" size={14} />
          </span>
        </Tooltip>

        <button
          ref={triggerRef}
          type="button"
          className={`sc-color-swatch${colorIsSet ? '' : ' sc-color-swatch--unset'}`}
          style={colorIsSet ? { background: colorValue } : undefined}
          onClick={() => setPickerOpen((v) => !v)}
          aria-haspopup="dialog"
          aria-expanded={pickerOpen}
          aria-label={colorIsSet ? t('effects.strokeColorValue', { color: colorValue }) : t('effects.pickStrokeColor')}
        />

        {pickerOpen && createPortal(
          <div
            ref={popRef}
            className={`sc-color-pop${coords.flip ? ' sc-color-pop--up' : ''}`}
            role="dialog"
            aria-label={t('effects.pickAColor')}
            style={{ top: coords.top, left: coords.left }}
          >
            <HexColorPicker
              color={colorValue}
              onChange={(c) => onPatchConfig({ color: c })}
            />
            <div className="sc-color-pop__foot">
              <input
                type="text"
                className="sc-color-pop__hex"
                value={colorIsSet ? colorValue : ''}
                placeholder="#rrggbb"
                spellCheck={false}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#?[0-9a-fA-F]{6}$/.test(v)) {
                    onPatchConfig({ color: v.startsWith('#') ? v : `#${v}` });
                  }
                }}
              />
              {colorIsSet && (
                <Tooltip label={t('effects.resetToTheme')}>
                  <button
                    type="button"
                    className="icon-action-btn icon-action-btn--sm"
                    aria-label={t('effects.resetToTheme')}
                    onClick={() => { onPatchConfig({ color: undefined }); setPickerOpen(false); }}
                  >
                    <Icon name="reset" size={12} />
                  </button>
                </Tooltip>
              )}
            </div>
          </div>,
          document.body,
        )}

        {colorIsSet ? (
          <Tooltip label={t('effects.resetColor')}>
            <button
              type="button"
              className="icon-action-btn icon-action-btn--sm"
              aria-label={t('effects.resetColor')}
              onClick={() => onPatchConfig({ color: undefined })}
            >
              <Icon name="reset" size={12} />
            </button>
          </Tooltip>
        ) : (
          <span className="hint" style={{ marginLeft: 4 }}>{colorMixed ? t('effects.colorMixed') : t('effects.theme')}</span>
        )}
      </div>

      <SliderRow
        label={
          <Tooltip label={t('effects.opacity')}>
            <span className="sc-label-icon" aria-label={t('effects.opacity')}>
              <Icon name="prop-opacity" size={14} />
            </span>
          </Tooltip>
        }
        min={0} max={1} step={0.01}
        value={opacityMixed ? 1 : (config?.opacity ?? 1)}
        format={(v) => `${Math.round(v * 100)}%`}
        onChange={(v) => onPatchConfig({ opacity: v })}
      />

      <SliderRow
        label={
          <Tooltip label={t('effects.strokeWidth')}>
            <span className="sc-label-icon" aria-label={t('effects.strokeWidth')}>
              <Icon name="prop-width" size={14} />
            </span>
          </Tooltip>
        }
        min={0} max={10} step={0.25}
        value={widthMixed ? 1.25 : (config?.strokeWidth ?? 1.25)}
        format={(v) => `${v}px`}
        onChange={(v) => onPatchConfig({ strokeWidth: v })}
      />
    </div>
  );
}
