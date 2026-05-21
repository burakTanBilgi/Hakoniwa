import { useState } from 'react';
import Icon from './Icon.jsx';
import { useT } from '../../i18n/index.js';

const SAMPLE = `Logo\t\tTheme\tLanguage\tAbout\t\tHow It Works\t\tSign In\t\tSign Up
Build Your Custom ERP\t\t\t\t\t\t\t\tNo Coding Required\t\t
\t\t\t\t\t\t\t\t\t\t
Step 1\t\t\tStep 2\t\t\tStep 3\t\t\t\t`;

// Modal for pasting CSV/TSV data. Lets the user toggle auto-merge
// (recommended for spreadsheet pastes) before applying.
export default function ImportDialog({ onClose, onImport }) {
  const t = useT();
  const [text, setText] = useState('');
  const [autoMerge, setAutoMerge] = useState(true);

  const apply = () => {
    if (!text.trim()) return;
    onImport(text, { autoMerge });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal__head">
          <h2 className="modal__title">{t('grid.importDialogTitle')}</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="close" size={14} />
          </button>
        </header>

        <div className="modal__body">
          <p className="hint">{t('grid.importDialogHint')}</p>

          <textarea
            className="modal__textarea"
            placeholder={SAMPLE}
            value={text}
            onChange={(e) => setText(e.target.value)}
            spellCheck={false}
            autoFocus
          />

          <label className="modal__check">
            <input
              type="checkbox"
              checked={autoMerge}
              onChange={(e) => setAutoMerge(e.target.checked)}
            />
            <span>{t('grid.autoMergeLabel')}</span>
          </label>
        </div>

        <footer className="modal__foot">
          <button type="button" className="action-btn action-btn--ghost" onClick={() => setText(SAMPLE)}>
            {t('grid.insertSample')}
          </button>
          <div style={{ flex: 1 }} />
          <button type="button" className="action-btn action-btn--ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button type="button" className="action-btn action-btn--primary" disabled={!text.trim()} onClick={apply}>
            {t('common.import')}
          </button>
        </footer>
      </div>
    </div>
  );
}
