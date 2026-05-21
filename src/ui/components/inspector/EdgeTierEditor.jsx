import SliderRow from '../SliderRow.jsx';
import StyleControls from '../edges/StyleControls.jsx';
import EffectsPicker from '../interactions/EffectsPicker.jsx';
import InspectorSubcard from './InspectorSubcard.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { useT } from '../../../i18n/index.js';

const ResetButton = ({ onClick, label }) => (
  <Tooltip label={label}>
    <button type="button" className="icon-action-btn" aria-label={label} onClick={onClick}>
      <Icon name="reset" size={13} />
    </button>
  </Tooltip>
);
import { EFFECT_NAMES, EDGE_EFFECTS } from '../../../puzzle';
import { DEFAULT_WAVE, MIXED } from '../edges/constants.js';

// Reusable editor for ANY edge cascade tier (default / inner / outer /
// piece / per-edge). Renders two visually separated sub-cards: one for the
// connector shape + stroke style, one for the animation effects picker.
// Callers wire the appropriate setters for the tier they're editing.
//
// Props:
//   title           — sub-card header (e.g. "Edges · Default")
//   accent          — emphasise both subcards (used for the active tier)
//   effect          — resolved effect name (puzzle/wave/straight), used for chip state
//   config          — resolved config { color, opacity, strokeWidth, frequency, amplitude, inverted, ... }
//   ownEffects      — this tier's own effect map
//   inheritedEffects — effects merged from lower-priority tiers (read-only baseline)
//   mixed           — show multi-edge MIXED state in the effects picker
//   onSetEffect(name)        — set the tier's shape effect
//   onPatchConfig(patch)     — merge into the tier's style/wave config
//   onChangeEffects(map)     — write the animations map (whole replace)
//   onClear (optional)       — show a "reset" link on the head of the shape card
//   onResetEffects (optional)— show a "reset" link on the head of the animations card
//   strokeHidden (default false) — hide the shape & stroke sub-card (e.g. for cells)
export default function EdgeTierEditor({
  title,
  accent = false,
  effect, config,
  ownEffects = {},
  inheritedEffects = {},
  mixed = false,
  onSetEffect, onPatchConfig, onChangeEffects,
  onClear,
  onResetEffects,
  strokeHidden = false,
}) {
  const t = useT();

  const showInvert = effect === 'puzzle' || (effect === MIXED && config?.inverted !== undefined);
  const showWave   = effect === 'wave'   || (effect === MIXED && (config?.frequency != null || config?.amplitude != null));

  return (
    <>
      {!strokeHidden && (
        <InspectorSubcard
          id="shape-stroke"
          title={t('inspector.shapeStroke')}
          accent={accent}
          actions={onClear ? <ResetButton onClick={onClear} label={t('inspector.reset')} /> : null}
        >
          <div className="picker-split">
            <div className="picker-split__list" role="tablist" aria-label={t('inspector.connectorEffect')}>
              {EFFECT_NAMES.map((name) => {
                const effectLabel = t(`inspector.effect.${name}`);
                return (
                  <Tooltip key={name} label={effectLabel} side="right">
                    <button type="button"
                      role="tab"
                      aria-selected={effect === name}
                      className={`chip chip--pick${effect === name ? ' chip--on chip--editing' : ''}`}
                      onClick={() => onSetEffect?.(name)}
                      aria-label={effectLabel}>
                      <Icon name={`eff-${name}`} size={16} />
                    </button>
                  </Tooltip>
                );
              })}
            </div>

            <div className="picker-split__editor" role="tabpanel">
              {effect === MIXED && (
                <span className="chip chip--sm chip--mixed">{t('inspector.mixed')}</span>
              )}

              {showInvert && (
                <Tooltip label={t('inspector.invertOrientation')}>
                  <button type="button"
                    className={`chip chip--icon invert-toggle ${config?.inverted === true ? 'chip--active' : ''}`}
                    onClick={() => onPatchConfig?.({ inverted: !(config?.inverted === true) })}
                    aria-label={t('inspector.invertOrientation')}
                    aria-pressed={config?.inverted === true}>
                    <Icon name="invert" size={14} />
                  </button>
                </Tooltip>
              )}

              {showWave && (
                <>
                  <SliderRow
                    label={
                      <Tooltip label={t('inspector.waveFrequency')}>
                        <span className="sc-label-icon" aria-label={t('inspector.waveFrequency')}>
                          <Icon name="prop-freq" size={14} />
                        </span>
                      </Tooltip>
                    }
                    min={0.005} max={0.1} step={0.001}
                    value={config?.frequency === MIXED
                      ? DEFAULT_WAVE.frequency
                      : (config?.frequency ?? DEFAULT_WAVE.frequency)}
                    format={(v) => config?.frequency === MIXED ? `· ${v.toFixed(3)}` : v.toFixed(3)}
                    onChange={(v) => onPatchConfig?.({ frequency: v })} />
                  <SliderRow
                    label={
                      <Tooltip label={t('inspector.waveAmplitude')}>
                        <span className="sc-label-icon" aria-label={t('inspector.waveAmplitude')}>
                          <Icon name="prop-amp" size={14} />
                        </span>
                      </Tooltip>
                    }
                    min={0} max={40} step={1}
                    value={config?.amplitude === MIXED
                      ? DEFAULT_WAVE.amplitude
                      : (config?.amplitude ?? DEFAULT_WAVE.amplitude)}
                    format={(v) => config?.amplitude === MIXED ? `· ${v}` : `${v}`}
                    onChange={(v) => onPatchConfig?.({ amplitude: v })} />
                </>
              )}

              <StyleControls config={config} onPatchConfig={onPatchConfig} />
            </div>
          </div>
        </InspectorSubcard>
      )}

      <InspectorSubcard
        id="animations"
        title={t('inspector.animations')}
        accent={accent}
        actions={onResetEffects ? <ResetButton onClick={onResetEffects} label={t('inspector.reset')} /> : null}
      >
        <EffectsPicker
          catalogue={EDGE_EFFECTS}
          ownEffects={ownEffects}
          inheritedEffects={inheritedEffects}
          mixed={mixed}
          onChange={onChangeEffects}
        />
      </InspectorSubcard>
    </>
  );
}
