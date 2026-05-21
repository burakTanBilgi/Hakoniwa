import { useState } from 'react';
import PreviewSvg from '../components/PreviewSvg.jsx';
import { exportSingleFileJSX, exportModuleZip } from '../../grid/export.js';
import { formatTime } from '../utils/formatTime.js';
import WaveBrandMark from '../components/meta/WaveBrandMark.jsx';
import WaveDivider from '../components/meta/WaveDivider.jsx';
import { useT, useLang } from '../../i18n/index.js';

// Large preview of the current project. Big board, easy navigation to editors,
// and export options (per-project, so they live with the project view).
export default function PreviewPage({ project, onNav }) {
  const { project: p, setName, exportCurrent } = project;
  const t = useT();
  const { lang } = useLang();
  const [editingName, setEditingName] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  if (!p) return null;

  return (
    <div className="page-preview">
      <div className="preview-stage">
        <div className="preview-stage__svg">
          <PreviewSvg project={p} maxSize={620} />
        </div>
      </div>

      <aside className="preview-info">
        <div className="preview-info__brand">
          <WaveBrandMark size="sm" />
        </div>

        <div className="preview-info__export">
          <div className="export-menu">
            <button
              type="button"
              className="action-btn"
              onClick={() => setExportOpen((v) => !v)}
            >
              ↓ Export ▾
            </button>
            {exportOpen && (
              <>
                <div className="export-menu__backdrop" onClick={() => setExportOpen(false)} />
                <div className="export-menu__panel">
                  <button type="button" className="export-menu__item"
                    onClick={() => { exportCurrent(); setExportOpen(false); }}>
                    <strong>JSON</strong>
                    <span>Project file (re-importable)</span>
                  </button>
                  <button type="button" className="export-menu__item"
                    onClick={() => { exportSingleFileJSX(p); setExportOpen(false); }}>
                    <strong>Single-file React</strong>
                    <span>One .jsx + README — drop into any React 18+ project</span>
                  </button>
                  <button type="button" className="export-menu__item"
                    onClick={() => { exportModuleZip(p); setExportOpen(false); }}>
                    <strong>Module bundle (ZIP)</strong>
                    <span>Full puzzle/ folder + project.json + README</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <WaveDivider amplitude={4} height={14} />

        {editingName ? (
          <input
            className="preview-info__name-input"
            autoFocus
            value={p.name ?? ''}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setEditingName(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingName(false); }}
          />
        ) : (
          <h1
            className="preview-info__name"
            onClick={() => setEditingName(true)}
          >
            {p.name || 'Untitled'}
          </h1>
        )}

        <p className="preview-info__meta">
          <span>{p.grid.rows}×{p.grid.cols} grid</span>
          <span aria-hidden> · </span>
          <span>last edited {formatTime(p.updatedAt, t, lang)}</span>
        </p>

        <WaveDivider amplitude={4} height={14} />

        <div className="preview-info__actions">
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => onNav('grid')}
          >
            ⊞ Edit grid
          </button>
          <button
            type="button"
            className="action-btn action-btn--primary"
            onClick={() => onNav('edit')}
          >
            ✎ Edit pieces
          </button>
        </div>

        <p className="hint">
          Edit the grid layout, or open the Edit page to style edges and fill cells with text/images.
        </p>
      </aside>
    </div>
  );
}
