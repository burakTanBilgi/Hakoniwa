import Icon from '../Icon.jsx';
import { useT } from '../../../i18n/index.js';

// Vertical list of layer rows. Each row's selection state comes from
// the parent: `activeRowId` is the row currently shown in the property
// pane. Section rows are non-interactive headings.
export default function LayersPanel({ rows, activeRowId, onPickRow }) {
  const t = useT();
  return (
    <nav className="layers-panel" aria-label={t('editUi.layersPanelAriaLabel')}>
      <ul className="layers-panel__list">
        {rows.map((r) => {
          if (r.kind === 'section') {
            return (
              <li key={r.id} className="layers-panel__section">
                {r.label}
              </li>
            );
          }
          const active = activeRowId === r.id;
          return (
            <li key={`${r.kind}-${r.id}`}>
              <button
                type="button"
                className={`layers-panel__row layers-panel__row--${r.kind}${active ? ' is-active' : ''}`}
                onClick={() => onPickRow(r)}
                aria-pressed={active}
                aria-label={r.label}
              >
                <span className="layers-panel__row-label">{r.label}</span>
                <span className="layers-panel__row-status" aria-hidden="true">
                  {r.overridden
                    ? <span className="layers-panel__dot" />
                    : <Icon name="chevron-right" size={10} className="layers-panel__chain" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
