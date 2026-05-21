import { FIT_OPTIONS } from '../utils/fitOptions.js';
import { useFileInput } from '../hooks/useFileInput.js';
import Icon from './Icon.jsx';
import Tooltip from './Tooltip.jsx';
import { useT } from '../../i18n/index.js';

// Side-panel UI for project-wide background images. Each background covers a
// rectangular range of cells and renders sliced across whatever pieces happen
// to live underneath — pieces stay separate (no merging needed).
export default function BackgroundsPanel({
  backgrounds,
  selectionRect,
  onAddImage,
  onUpdate,
  onRemove,
}) {
  const t = useT();
  const { inputProps, open } = useFileInput(onAddImage);

  return (
    <>
      <p className="hint">
        {selectionRect
          ? t('grid.bgHintSelection', { cols: selectionRect.cMax - selectionRect.cMin + 1, rows: selectionRect.rMax - selectionRect.rMin + 1 })
          : t('grid.bgHintNoSelection')}
      </p>

      <input {...inputProps} type="file" accept="image/*" hidden />
      <div className="action-stack">
        <button
          type="button"
          className="action-btn"
          onClick={open}
        >
          <Icon name="upload" size={14} />
          <span>{t('grid.uploadImage')}</span>
        </button>
        <p className="hint">{t('grid.pasteImageHint')}</p>
      </div>

      {backgrounds.length > 0 && (
        <div className="bg-list">
          {backgrounds.map((bg, i) => {
            const cells = `${bg.rect.cMax - bg.rect.cMin + 1}×${bg.rect.rMax - bg.rect.rMin + 1}`;
            return (
              <div key={bg.id} className="bg-item">
                <img src={bg.src} alt="" className="bg-item__thumb" />
                <div className="bg-item__body">
                  <div className="bg-item__head">
                    <span className="bg-item__label">#{i + 1} · {cells}</span>
                    <Tooltip label={t('grid.deleteBgTooltip')}>
                      <button
                        type="button"
                        className="bg-item__del"
                        onClick={() => onRemove(bg.id)}
                        aria-label={t('grid.deleteBgAriaLabel')}
                      >
                        <Icon name="trash" size={13} />
                      </button>
                    </Tooltip>
                  </div>
                  <div className="effect-chips">
                    {FIT_OPTIONS.map((f) => (
                      <Tooltip key={f.value} label={f.hint}>
                        <button
                          type="button"
                          className={`chip chip--sm ${(bg.fit || 'cover') === f.value ? 'chip--active' : ''}`}
                          onClick={() => onUpdate(bg.id, { fit: f.value })}
                        >
                          {f.label}
                        </button>
                      </Tooltip>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
