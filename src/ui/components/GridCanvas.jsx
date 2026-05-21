import { useEffect, useRef, useState } from 'react';
import { groupBoundsMap, rectFill } from '../../grid/grid.js';
import { useT } from '../../i18n/index.js';

const CELL_PX = 64;
const HEADER_PX = 22;     // size of row/column number gutter
const PADDING = 16;

// Grid editor canvas: renders the grid as a set of rounded rectangles plus a
// header strip (row numbers on the left, column numbers on top) where each
// header is a hit target for "delete this row/column".
//
// Cell selection:
//   - Click + drag: rectangular box-select
//   - Shift / Ctrl: toggle individual cells
//
// Header drag-to-mark:
//   - Click a header → marks that row/col for deletion
//   - Drag across headers → marks each one passed over
//   - Pointer release → calls onDeleteRows / onDeleteCols with the marks
export default function GridCanvas({
  grid,
  selection,
  onSelectionChange,
  pieceColors,
  backgrounds,
  onDeleteRows,
  onDeleteCols,
}) {
  const t = useT();
  const svgRef = useRef(null);
  const [drag, setDrag] = useState(null);          // cell drag-select state
  const [hdrDrag, setHdrDrag] = useState(null);    // { axis: 'row'|'col', marks: Set<number> }
  const [hdrHover, setHdrHover] = useState(null);  // { axis: 'row'|'col', idx: number }

  const gridW = grid.cols * CELL_PX;
  const gridH = grid.rows * CELL_PX;
  const w = gridW + HEADER_PX + PADDING * 2;
  const h = gridH + HEADER_PX + PADDING * 2;
  const gx = PADDING + HEADER_PX;
  const gy = PADDING + HEADER_PX;

  const bounds = groupBoundsMap(grid);
  const selSet = new Set(selection.map(([r, c]) => `${r},${c}`));

  const cellAt = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = (clientX - rect.left) - gx;
    const y = (clientY - rect.top) - gy;
    const c = Math.floor(x / CELL_PX);
    const r = Math.floor(y / CELL_PX);
    if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) return null;
    return [r, c];
  };

  // --- Cell drag-select ----
  const onCellPointerDown = (e, r, c) => {
    if (e.button !== 0) return;
    e.preventDefault();
    // Don't let ViewPanel see this — cells own the gesture (box-select,
    // shift/ctrl toggle). Without this, single-finger drag on a cell
    // would also fire ViewPanel's touch-pan and the user would scroll
    // the canvas while box-selecting. Pinch-zoom still works when started
    // from the gutter / padding outside the grid.
    e.stopPropagation();
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      const key = `${r},${c}`;
      const next = new Set(selSet);
      if (next.has(key)) next.delete(key); else next.add(key);
      onSelectionChange([...next].map((s) => s.split(',').map(Number)));
      return;
    }
    setDrag({ startCell: [r, c], curCell: [r, c] });
    onSelectionChange([[r, c]]);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e) => {
      const cell = cellAt(e.clientX, e.clientY);
      if (!cell) return;
      if (cell[0] === drag.curCell[0] && cell[1] === drag.curCell[1]) return;
      setDrag((d) => (d ? { ...d, curCell: cell } : d));
      onSelectionChange(rectFill([drag.startCell, cell]));
    };
    const up = () => setDrag(null);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.startCell?.[0], drag?.startCell?.[1], drag?.curCell?.[0], drag?.curCell?.[1]]);

  // --- Header drag-to-mark + delete ----
  const headerAt = (clientX, clientY) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    // Row header strip (left of grid, vertically aligned with rows)
    if (x >= PADDING && x < PADDING + HEADER_PX && y >= gy && y < gy + gridH) {
      return { axis: 'row', idx: Math.floor((y - gy) / CELL_PX) };
    }
    // Column header strip (above grid, horizontally aligned with cols)
    if (y >= PADDING && y < PADDING + HEADER_PX && x >= gx && x < gx + gridW) {
      return { axis: 'col', idx: Math.floor((x - gx) / CELL_PX) };
    }
    return null;
  };

  const onHeaderPointerDown = (e, axis, idx) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();   // keep header drag-delete from leaking to ViewPanel
    setHdrDrag({ axis, marks: new Set([idx]) });
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  useEffect(() => {
    if (!hdrDrag) return;
    const move = (e) => {
      const hit = headerAt(e.clientX, e.clientY);
      if (!hit || hit.axis !== hdrDrag.axis) return;
      setHdrDrag((d) => {
        if (!d) return d;
        if (d.marks.has(hit.idx)) return d;
        const marks = new Set(d.marks); marks.add(hit.idx);
        return { ...d, marks };
      });
    };
    const up = () => {
      setHdrDrag((d) => {
        if (!d) return null;
        const idxs = [...d.marks].sort((a, b) => a - b);
        if (d.axis === 'row') onDeleteRows?.(idxs);
        else onDeleteCols?.(idxs);
        return null;
      });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hdrDrag?.axis]);

  // --- Build render data ----
  const groupRects = [];
  for (const [id, b] of bounds) {
    groupRects.push({
      id,
      x: gx + b.cMin * CELL_PX,
      y: gy + b.rMin * CELL_PX,
      w: (b.cMax - b.cMin + 1) * CELL_PX,
      h: (b.rMax - b.rMin + 1) * CELL_PX,
      isMerged: (b.cMax > b.cMin) || (b.rMax > b.rMin),
      fill: pieceColors?.[id],
      label: b.cMax > b.cMin || b.rMax > b.rMin
        ? `${b.cMax - b.cMin + 1}×${b.rMax - b.rMin + 1}` : '',
    });
  }

  const selRects = selection.map(([r, c]) => ({
    key: `${r},${c}`,
    x: gx + c * CELL_PX,
    y: gy + r * CELL_PX,
  }));

  const rowHeaders = Array.from({ length: grid.rows }, (_, r) => r);
  const colHeaders = Array.from({ length: grid.cols }, (_, c) => c);
  const isMarked = (axis, idx) =>
    hdrDrag && hdrDrag.axis === axis && hdrDrag.marks.has(idx);
  const isHover = (axis, idx) =>
    !hdrDrag && hdrHover && hdrHover.axis === axis && hdrHover.idx === idx;
  const isDestructive = (axis, idx) => isMarked(axis, idx) || isHover(axis, idx);

  // Rows/cols highlighted for deletion (union of hover + drag marks). Drives
  // the red overlay drawn over the affected cells so the user sees, at a
  // glance, what clicking will delete.
  const doomedRows = new Set();
  const doomedCols = new Set();
  if (hdrDrag) {
    if (hdrDrag.axis === 'row') hdrDrag.marks.forEach((i) => doomedRows.add(i));
    else hdrDrag.marks.forEach((i) => doomedCols.add(i));
  } else if (hdrHover) {
    if (hdrHover.axis === 'row') doomedRows.add(hdrHover.idx);
    else doomedCols.add(hdrHover.idx);
  }

  return (
    <div className="grid-canvas-wrap">
      <svg ref={svgRef} className="grid-canvas" width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        {/* Column-number headers — hover/marked = "click to delete this column" */}
        {colHeaders.map((c) => {
          const x = gx + c * CELL_PX;
          const marked = isMarked('col', c);
          const hover  = isHover('col', c);
          const danger = marked || hover;
          return (
            <g key={`ch-${c}`}>
              <rect
                x={x} y={PADDING} width={CELL_PX} height={HEADER_PX}
                className={`grid-canvas__header-hit ${marked ? 'is-marked' : ''} ${hover ? 'is-hovered' : ''}`}
                onPointerDown={(e) => onHeaderPointerDown(e, 'col', c)}
                onPointerEnter={() => !hdrDrag && setHdrHover({ axis: 'col', idx: c })}
                onPointerLeave={() => !hdrDrag && setHdrHover(null)}
              >
                <title>{t('grid.deleteColumn', { n: c + 1 })}</title>
              </rect>
              {danger ? (
                <text x={x + CELL_PX / 2} y={PADDING + HEADER_PX / 2}
                  className="grid-canvas__header-x" pointerEvents="none">×</text>
              ) : (
                <text x={x + CELL_PX / 2} y={PADDING + HEADER_PX / 2}
                  className="grid-canvas__header" pointerEvents="none">{c + 1}</text>
              )}
            </g>
          );
        })}

        {/* Row-number headers — hover/marked = "click to delete this row" */}
        {rowHeaders.map((r) => {
          const y = gy + r * CELL_PX;
          const marked = isMarked('row', r);
          const hover  = isHover('row', r);
          const danger = marked || hover;
          return (
            <g key={`rh-${r}`}>
              <rect
                x={PADDING} y={y} width={HEADER_PX} height={CELL_PX}
                className={`grid-canvas__header-hit ${marked ? 'is-marked' : ''} ${hover ? 'is-hovered' : ''}`}
                onPointerDown={(e) => onHeaderPointerDown(e, 'row', r)}
                onPointerEnter={() => !hdrDrag && setHdrHover({ axis: 'row', idx: r })}
                onPointerLeave={() => !hdrDrag && setHdrHover(null)}
              >
                <title>{t('grid.deleteRow', { n: r + 1 })}</title>
              </rect>
              {danger ? (
                <text x={PADDING + HEADER_PX / 2} y={y + CELL_PX / 2}
                  className="grid-canvas__header-x" pointerEvents="none">×</text>
              ) : (
                <text x={PADDING + HEADER_PX / 2} y={y + CELL_PX / 2}
                  className="grid-canvas__header" pointerEvents="none">{r + 1}</text>
              )}
            </g>
          );
        })}

        {/* Group fills */}
        {groupRects.map((g) => (
          <rect
            key={g.id}
            x={g.x} y={g.y} width={g.w} height={g.h}
            className={`grid-canvas__group ${g.isMerged ? 'grid-canvas__group--merged' : ''}`}
            style={g.fill ? { fill: g.fill } : undefined}
            rx="6" ry="6"
          />
        ))}

        {/* Background images (rendered above group fills, dimmed so the
            user can still see the grid lines underneath while editing). */}
        {(backgrounds || []).map((bg) => {
          const r = bg.rect;
          if (!r) return null;
          const bx = gx + r.cMin * CELL_PX;
          const by = gy + r.rMin * CELL_PX;
          const bw = (r.cMax - r.cMin + 1) * CELL_PX;
          const bh = (r.rMax - r.rMin + 1) * CELL_PX;
          const par =
            bg.fit === 'cover'   ? 'xMidYMid slice' :
            bg.fit === 'contain' ? 'xMidYMid meet'  :
            bg.fit === 'fill'    ? 'none'           :
                                   'xMidYMid slice';
          return (
            <g key={bg.id} className="grid-canvas__bg" pointerEvents="none">
              <image
                href={bg.src}
                x={bx} y={by} width={bw} height={bh}
                preserveAspectRatio={par}
              />
              <rect
                x={bx} y={by} width={bw} height={bh}
                className="grid-canvas__bg-frame"
                rx="4" ry="4"
              />
            </g>
          );
        })}

        {/* Selection overlay */}
        {selRects.map((s) => (
          <rect
            key={s.key}
            x={s.x + 2} y={s.y + 2} width={CELL_PX - 4} height={CELL_PX - 4}
            className="grid-canvas__selected"
            rx="4" ry="4"
            pointerEvents="none"
          />
        ))}

        {/* Group labels */}
        {groupRects.filter((g) => g.label).map((g) => (
          <text
            key={`l-${g.id}`}
            x={g.x + g.w / 2} y={g.y + g.h / 2}
            className="grid-canvas__label"
            textAnchor="middle"
            dominantBaseline="central"
            pointerEvents="none"
          >
            {g.label}
          </text>
        ))}

        {/* Destructive overlays — red tint over rows/cols the user is about
            to delete (either hovering a header, or actively dragging marks).
            Drawn above content so it's unmissable; transparent to events. */}
        {[...doomedRows].map((r) => (
          <rect
            key={`doom-r-${r}`}
            x={gx} y={gy + r * CELL_PX} width={gridW} height={CELL_PX}
            className={`grid-canvas__doom ${hdrDrag ? 'grid-canvas__doom--marked' : ''}`}
            pointerEvents="none"
          />
        ))}
        {[...doomedCols].map((c) => (
          <rect
            key={`doom-c-${c}`}
            x={gx + c * CELL_PX} y={gy} width={CELL_PX} height={gridH}
            className={`grid-canvas__doom ${hdrDrag ? 'grid-canvas__doom--marked' : ''}`}
            pointerEvents="none"
          />
        ))}

        {/* Cell hit area — one overlay rect for the whole grid; the pointer
            handler maps screen coords to a cell. Saves rows×cols rect
            elements (up to 50×50 = 2500) compared to per-cell hit rects. */}
        <rect
          x={gx} y={gy} width={gridW} height={gridH}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onPointerDown={(e) => {
            const cell = cellAt(e.clientX, e.clientY);
            if (cell) onCellPointerDown(e, cell[0], cell[1]);
          }}
        />
      </svg>
    </div>
  );
}
