import EffectsPicker from '../interactions/EffectsPicker.jsx';
import InspectorSubcard from './InspectorSubcard.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { CELL_EFFECTS } from '../../../puzzle';
import { useT } from '../../../i18n/index.js';

// Reusable editor for any cell-animation cascade tier (default or per-piece).
// Cell animations have no shape/stroke — only the effects map.
export default function CellTierEditor({
  title,
  accent = false,
  ownEffects = {},
  inheritedEffects = {},
  onChange,
  onReset,
}) {
  const t = useT();

  return (
    <InspectorSubcard
      id="body-animations"
      title={t('inspector.bodyAnimations')}
      accent={accent}
      actions={onReset ? (
        <Tooltip label={t('inspector.reset')}>
          <button type="button" className="icon-action-btn" aria-label={t('inspector.reset')} onClick={onReset}>
            <Icon name="reset" size={13} />
          </button>
        </Tooltip>
      ) : null}
    >
      <EffectsPicker
        catalogue={CELL_EFFECTS}
        ownEffects={ownEffects}
        inheritedEffects={inheritedEffects}
        onChange={onChange}
      />
    </InspectorSubcard>
  );
}
