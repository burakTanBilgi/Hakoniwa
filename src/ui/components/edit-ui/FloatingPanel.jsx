import Icon from '../Icon.jsx';
import { useT } from '../../../i18n/index.js';

// Shared shell for the Canvas-mode popovers (PiecePopover / EdgePopover /
// DefaultsDrawer). A small floating card with a title row, a close
// button, and a scrollable body.
//
// Positioning is the parent's responsibility via the `placement` prop:
//   'top-right'  — pinned top-right of the canvas (default for popovers)
//   'left-sheet' — slides in from the left edge (the Defaults drawer)
//
// Body content is whatever you pass as children — every existing
// inspector component is reusable here.
export default function FloatingPanel({
  title,
  placement = 'top-right',
  onClose,
  children,
}) {
  const t = useT();
  return (
    <div
      className={`floating-panel floating-panel--${placement}`}
      role="dialog"
      aria-label={typeof title === 'string' ? title : undefined}
    >
      <header className="floating-panel__head">
        <span className="floating-panel__title">{title}</span>
        {onClose && (
          <button
            type="button"
            className="floating-panel__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <Icon name="close" size={12} />
          </button>
        )}
      </header>
      <div className="floating-panel__body">{children}</div>
    </div>
  );
}
