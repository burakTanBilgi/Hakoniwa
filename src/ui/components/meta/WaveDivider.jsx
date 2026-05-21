import { useMemo } from 'react';
import { waveEffect } from '../../../puzzle/effects/waveEffect.js';
import { KNOB_R } from '../../../puzzle';

// Pure-decoration SVG wave path. Used as a section divider throughout the
// app — every visible "section break" gets one, in service of the meta
// design language (every part of the site is built with our tools).
//
// Reuses the *exact* path generator from `puzzle/effects/waveEffect.js`,
// so a divider's silhouette is identical to a wave-edged piece in the
// editor. Single source of truth.
//
// Props:
//   width      — drawing width (intrinsic SVG units; CSS controls display).
//   height     — vertical room for the wave (must be ≥ 2*amplitude + a few).
//   frequency  — radians/pixel along the wave (default matches waveEffect).
//   amplitude  — wave bulge in px (default 6 — gentler than the editor's 12).
//   strokeWidth— stroke thickness in px.
//   color      — CSS colour (defaults to a theme-aware token).
//   fillTop    — CSS colour. When set, the region ABOVE the wave is filled
//                with it, so the divider reads as a solid section edge
//                (e.g. the nav bar's wavy underside) rather than a
//                detached line floating between two blocks.
//   flip       — mirror vertically.
//   className  — appended to the wrapper for layout overrides.
export default function WaveDivider({
  width = 1200,
  height = 24,
  frequency = 0.025,
  amplitude = 6,
  strokeWidth = 1.5,
  color,
  fillTop,
  flip = false,
  className = '',
}) {
  const cy = height / 2;
  const frag = useMemo(() => waveEffect.buildSide(
    0, width,        // start / end along the wave axis
    cy,              // perpendicular fixed coord (vertical centre)
    'x',             // horizontal wave
    [],              // no knobs
    0, width,        // piece span = full width (envelope tapers to 0 at ends)
    1,               // outwardSign — irrelevant for wave
    KNOB_R,          // irrelevant for wave
    { frequency, amplitude }
  ), [width, cy, frequency, amplitude]);

  const d = `M 0 ${cy} ${frag}`;
  // Closed polygon: top edge → down the left side → along the wave →
  // up the right side → close. Fills everything above the wave curve.
  const dFill = `M 0 0 L 0 ${cy} ${frag} L ${width} 0 Z`;

  return (
    <svg
      className={`wave-divider${flip ? ' wave-divider--flip' : ''}${className ? ` ${className}` : ''}`}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      role="presentation"
    >
      {fillTop && <path d={dFill} fill={fillTop} stroke="none" />}
      <path
        d={d}
        fill="none"
        stroke={color || 'var(--stroke-soft)'}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
