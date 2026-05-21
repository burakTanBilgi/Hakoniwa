import Tooltip from '../Tooltip.jsx';
import { useT } from '../../../i18n/index.js';

// Sticky horizontal cascade visualization at the top of the Inspector.
// Renders one pill per tier in priority order (left → right is *low → high*
// because we read the chain bottom-up: a `Default` floor first, then layered
// overrides, then per-piece, then per-edge — each pill to the right "wins"
// when set). The active selection's tier glows; clicking another pill asks
// the inspector to expand an inline editor for that tier.
//
// Props:
//   states      — output of computeTierStates({ default, inner, outer, piece, edge })
//   currentTier — 'default' | 'inner' | 'outer' | 'piece' | 'edge' — the tier
//                 the inspector currently has focus on (for the highlight)
//   onSelectTier(tier) — user clicked a pill; parent shows that tier's editor
export default function CascadeStrip({ states, currentTier, onSelectTier }) {
  const t = useT();

  const order = [
    { id: 'default', label: t('inspector.tier.default') },
    { id: 'inner',   label: t('inspector.tier.inner')   },
    { id: 'outer',   label: t('inspector.tier.outer')   },
    { id: 'piece',   label: t('inspector.tier.piece')   },
    { id: 'edge',    label: t('inspector.tier.edge')    },
  ];

  const visible = order.filter((t) => {
    // Always show default. Hide an inapplicable Inner/Outer/Piece/Edge pill
    // so the strip stays tight, but keep at least one of inner/outer for the
    // no-selection case (computeTierStates returns both applicable then).
    if (t.id === 'default') return true;
    return states?.[t.id]?.applicable;
  });

  return (
    <nav className="cascade-strip" aria-label={t('inspector.cascadeAriaLabel')} role="tablist">
      {visible.map((tier) => {
        const st = states?.[tier.id] || { applicable: false, hasOverride: false };
        const isCurrent = currentTier === tier.id;
        const classes = [
          'cascade-strip__pill',
          st.applicable ? '' : 'cascade-strip__pill--na',
          st.hasOverride && st.applicable ? 'cascade-strip__pill--has' : '',
          isCurrent ? 'cascade-strip__pill--current' : '',
        ].filter(Boolean).join(' ');
        const tipLabel = !st.applicable
          ? t('inspector.tierStatus.notApplicable', { label: tier.label })
          : st.hasOverride
            ? t('inspector.tierStatus.overrideSet', { label: tier.label })
            : t('inspector.tierStatus.inheriting', { label: tier.label });
        return (
          <Tooltip key={tier.id} label={tipLabel}>
            <button
              type="button"
              role="tab"
              aria-selected={isCurrent}
              className={classes}
              disabled={!st.applicable}
              onClick={() => st.applicable && onSelectTier?.(tier.id)}
            >
              <span className="cascade-strip__dot" aria-hidden />
              {tier.label}
            </button>
          </Tooltip>
        );
      })}
    </nav>
  );
}
