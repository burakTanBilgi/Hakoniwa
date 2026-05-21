import Tooltip from '../Tooltip.jsx';
import { useT } from '../../../i18n/index.js';

// Inline badge that shows where a single property's value comes from in the
// cascade. Clicking it asks the inspector to expand that tier so the user can
// edit it directly.
//
// Props:
//   source   — { tier, pieceId?, kind? } from resolveEdgePropSource
//   current  — whether this property is currently "owned" by the active tier
//              (purely visual cue; same behaviour either way)
//   onJump   — (tier) => void; tells the inspector which tier to expand
export default function SourcePill({ source, current = false, onJump }) {
  const t = useT();
  if (!source || source.tier === 'none') return null;

  // Resolve the tier id used for the i18n key. 'layer' tiers carry a kind
  // ('inner' | 'outer') that maps directly to the tier namespace.
  const tierId = source.tier === 'layer' ? source.kind : source.tier;
  const label = t(`inspector.tier.${tierId}`);

  return (
    <Tooltip label={t('inspector.sourcePill.editAt', { label })}>
      <button
        type="button"
        className={`source-pill ${current ? 'source-pill--current' : ''}`}
        onClick={() => onJump?.(source.tier === 'layer' ? source.kind : source.tier)}
      >
        {t('inspector.sourcePill.from', { label })}
      </button>
    </Tooltip>
  );
}
