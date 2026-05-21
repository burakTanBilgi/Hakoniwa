import { useEffect, useState } from 'react';
import SliderRow from '../SliderRow.jsx';
import Icon from '../Icon.jsx';
import Tooltip from '../Tooltip.jsx';
import { useT } from '../../../i18n/index.js';
import {
  EDGE_SCOPE_LABELS,
  makeEffectEntry,
  effectKey,
} from '../../../puzzle';

// Map config-field names to their iconography. Anything missing falls back
// to a text label so we don't silently drop information for unfamiliar fields.
const FIELD_ICONS = {
  radius:    'prop-radius',
  duration:  'prop-duration',
  distance:  'prop-distance',
  intensity: 'prop-intensity',
  speed:     'prop-speed',
  amount:    'prop-amount',
  width:     'prop-width',
  size:      'prop-size',
  frequency: 'prop-freq',
  amplitude: 'prop-amp',
  opacity:   'prop-opacity',
  color:     'prop-color',
};

// Picker + editor split:
//   Left column  — every catalog effect as a small icon button.
//                  Active (effect is on this tier) shows a subtle fill.
//                  Editing (current pane shows this one's controls) is
//                  amber-gradient.
//   Right column — the selected effect's editor: trigger row, scope row
//                  (edge effects only), intensity sliders, remove button.
//
// Click behaviour:
//   Inactive icon  → add the effect to this tier AND focus the editor.
//   Active icon    → focus the editor (no removal).
//   Remove button  → take the effect off this tier (cascade falls back).
//
// Props:
//   catalogue        — CELL_EFFECTS or EDGE_EFFECTS
//   inheritedEffects — resolved-from-lower-tiers map (read-only baseline;
//                      this tier can opt-out via `null` writes)
//   ownEffects       — this tier's own effects map (the editable layer)
//   onChange(map)    — called with the new own-effects map
//   mixed            — show 'mixed' hint + suppress active state
export default function EffectsPicker({
  catalogue,
  inheritedEffects = {},
  ownEffects = {},
  onChange,
  mixed = false,
}) {
  const t = useT();
  const resolved = mergeOwnAndInherited(inheritedEffects, ownEffects);

  // One entry per id (multi-key for the same id is reserved for later).
  const entriesById = new Map();
  for (const entry of Object.values(resolved)) {
    if (entry && !entriesById.has(entry.id)) entriesById.set(entry.id, entry);
  }
  const isActive = (id) => entriesById.has(id);

  const [editingId, setEditingId] = useState(null);

  // Keep editingId valid: if the user removes the focused effect, snap to
  // the next active one (or null when nothing's active).
  useEffect(() => {
    if (editingId && entriesById.has(editingId)) return;
    if (entriesById.size === 0) {
      setEditingId(null);
    } else {
      setEditingId(entriesById.keys().next().value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved]);

  // --- Mutators ---

  const removeEffectId = (id, base = ownEffects) => {
    const next = { ...base };
    for (const key of Object.keys(next)) {
      if (next[key] && next[key].id === id) delete next[key];
    }
    for (const key of Object.keys(inheritedEffects)) {
      if (inheritedEffects[key]?.id === id) next[key] = null;
    }
    return next;
  };

  const addEffect = (id) => {
    const def = catalogue[id];
    if (!def) return;
    const newEntry = makeEffectEntry(catalogue, id);
    const newKey   = effectKey(id, newEntry.trigger, newEntry.scope);

    // Auto-swap conflicts: drop active effects sharing the same group.
    let next = { ...ownEffects };
    for (const e of entriesById.values()) {
      if (catalogue[e.id]?.group === def.group) {
        next = removeEffectId(e.id, next);
      }
    }
    next[newKey] = newEntry;
    onChange(next);
  };

  const handlePick = (id) => {
    if (!isActive(id)) addEffect(id);
    setEditingId(id);
  };

  const handleRemove = () => {
    if (!editingId) return;
    onChange(removeEffectId(editingId));
  };

  const handleChangeTrigger = (entry, newTrigger) => {
    const oldKey = effectKey(entry.id, entry.trigger, entry.scope);
    const newKey = effectKey(entry.id, newTrigger,    entry.scope);
    if (oldKey === newKey) return;
    onChange(rekey(ownEffects, inheritedEffects, oldKey, newKey, { ...entry, trigger: newTrigger }));
  };

  const handleChangeScope = (entry, newScope) => {
    const oldKey = effectKey(entry.id, entry.trigger, entry.scope);
    const newKey = effectKey(entry.id, entry.trigger, newScope);
    if (oldKey === newKey) return;
    onChange(rekey(ownEffects, inheritedEffects, oldKey, newKey, { ...entry, scope: newScope }));
  };

  const handleChangeConfig = (entry, field, value) => {
    const key = effectKey(entry.id, entry.trigger, entry.scope);
    const cfg = { ...(entry.config || {}), [field]: value };
    onChange({ ...ownEffects, [key]: { ...entry, config: cfg } });
  };

  const editingEntry = editingId ? entriesById.get(editingId) : null;
  const editingDef   = editingId ? catalogue[editingId] : null;

  return (
    <div className="picker-split">
      <div className="picker-split__list" role="tablist" aria-label={t('effects.pickerListAriaLabel')}>
        {Object.entries(catalogue).map(([id]) => {
          const active  = isActive(id) && !mixed;
          const editing = editingId === id;
          const effectLabel = t(`effects.${id}`);
          return (
            <Tooltip key={id} label={effectLabel} side="right">
              <button
                type="button"
                role="tab"
                aria-selected={editing}
                aria-pressed={active}
                aria-label={effectLabel}
                className={`chip chip--pick${active ? ' chip--on' : ''}${editing ? ' chip--editing' : ''}`}
                onClick={() => handlePick(id)}
              >
                <Icon name={`anim-${id}`} size={14} />
              </button>
            </Tooltip>
          );
        })}
      </div>

      <div className="picker-split__editor" role="tabpanel">
        {mixed && <p className="picker-split__empty hint">{t('effects.mixed')}</p>}

        {!mixed && !editingEntry && (
          <p className="picker-split__empty hint">{t('effects.pickerEmpty')}</p>
        )}

        {!mixed && editingEntry && editingDef && (
          <ActiveEffectEditor
            entry={editingEntry}
            def={editingDef}
            onChangeTrigger={handleChangeTrigger}
            onChangeScope={handleChangeScope}
            onChangeConfig={handleChangeConfig}
            onRemove={handleRemove}
          />
        )}
      </div>
    </div>
  );
}

function ActiveEffectEditor({
  entry, def,
  onChangeTrigger, onChangeScope, onChangeConfig, onRemove,
}) {
  const t = useT();
  const hasMultiTriggers = (def.triggers || []).length > 1;
  const hasMultiScopes   = (def.scopes   || []).length > 1;
  const configFields     = Object.entries(def.config || {});
  const effectLabel      = t(`effects.${entry.id}`);
  const removeLabel      = t('effects.removeEffect');

  return (
    <>
      <div className="picker-split__editor-head">
        <span className="picker-split__editor-name">{effectLabel}</span>
        <Tooltip label={removeLabel}>
          <button
            type="button"
            className="icon-action-btn icon-action-btn--danger"
            aria-label={removeLabel}
            onClick={onRemove}
          >
            <Icon name="trash" size={14} />
          </button>
        </Tooltip>
      </div>

      {hasMultiTriggers && (
        <div className="effect-chips effect-chips--icons" role="radiogroup" aria-label={t('effects.triggerGroup')}>
          {def.triggers.map((trig) => {
            const trigLabel = t(`effects.trigger.${trig}`);
            return (
              <Tooltip key={trig} label={trigLabel}>
                <button type="button"
                  className={`chip chip--icon ${entry.trigger === trig ? 'chip--active' : ''}`}
                  onClick={() => onChangeTrigger(entry, trig)}
                  aria-label={trigLabel}
                  aria-pressed={entry.trigger === trig}>
                  <Icon name={`trig-${trig}`} size={14} />
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {hasMultiScopes && (
        <div className="effect-chips effect-chips--icons" role="radiogroup" aria-label={t('effects.scopeGroup')}>
          {def.scopes.map((s) => {
            const scopeLabel = t(`effects.scope.${s}`) || EDGE_SCOPE_LABELS[s] || s;
            return (
              <Tooltip key={s} label={scopeLabel}>
                <button type="button"
                  className={`chip chip--icon ${(entry.scope || def.defaultScope) === s ? 'chip--active' : ''}`}
                  onClick={() => onChangeScope(entry, s)}
                  aria-label={scopeLabel}
                  aria-pressed={(entry.scope || def.defaultScope) === s}>
                  <Icon name={`scope-${s}`} size={14} />
                </button>
              </Tooltip>
            );
          })}
        </div>
      )}

      {configFields.map(([field, schema]) => {
        const iconName  = FIELD_ICONS[field];
        const fieldLabel = t(`effects.config.${field}`) || schema.label;
        const label = iconName
          ? (
            <Tooltip label={fieldLabel}>
              <span className="sc-label-icon" aria-label={fieldLabel}>
                <Icon name={iconName} size={14} />
              </span>
            </Tooltip>
          )
          : fieldLabel;
        return (
          <SliderRow
            key={field}
            label={label}
            min={schema.min} max={schema.max} step={schema.step}
            value={entry.config?.[field] ?? schema.default}
            format={(v) => `${v}${schema.unit || ''}`}
            onChange={(v) => onChangeConfig(entry, field, v)}
          />
        );
      })}
    </>
  );
}

function mergeOwnAndInherited(inherited, own) {
  const out = { ...inherited };
  for (const [key, entry] of Object.entries(own || {})) {
    if (entry === null) delete out[key];
    else                  out[key] = entry;
  }
  return out;
}

// Move an entry from oldKey → newKey on the own map. If oldKey was inherited
// (not present in own), write a null at oldKey so the cascade drops the
// inherited copy when the new key takes effect.
function rekey(own, inherited, oldKey, newKey, newEntry) {
  const next = { ...own };
  if (oldKey in inherited && !(oldKey in own)) next[oldKey] = null;
  else                                          delete next[oldKey];
  next[newKey] = newEntry;
  return next;
}
