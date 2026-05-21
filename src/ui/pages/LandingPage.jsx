import WaveBrandMark from '../components/meta/WaveBrandMark.jsx';
import WaveDivider   from '../components/meta/WaveDivider.jsx';
import MetaCardRow   from '../components/meta/MetaCardRow.jsx';
import { useT } from '../../i18n/index.js';

// Decorative SVG background — soft floating puzzle silhouettes that drift
// behind the hero. Pure CSS animation on each `<path>` so the rest of the
// page stays scroll-jank free.
function LandingBackdrop() {
  return (
    <svg
      className="landing-backdrop"
      aria-hidden="true"
      viewBox="0 0 1200 800"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="lb-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="var(--primary-2)" stopOpacity="0.12" />
          <stop offset="100%" stopColor="var(--primary-2)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lb-glow-2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="#7fc9a6" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#7fc9a6" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Soft ambient glows */}
      <circle className="lb-orb lb-orb--1" cx="260" cy="180" r="260" fill="url(#lb-glow)" />
      <circle className="lb-orb lb-orb--2" cx="980" cy="620" r="320" fill="url(#lb-glow-2)" />
      <circle className="lb-orb lb-orb--3" cx="900" cy="120" r="180" fill="url(#lb-glow)" />

      {/* Drifting connector ribbons — abstract wave/puzzle silhouettes */}
      <path
        className="lb-ribbon lb-ribbon--1"
        d="M -40 320 C 160 220, 360 420, 560 320 S 960 220, 1240 320"
        fill="none"
        stroke="var(--primary-2)"
        strokeOpacity="0.18"
        strokeWidth="1.4"
      />
      <path
        className="lb-ribbon lb-ribbon--2"
        d="M -40 480 C 200 380, 400 580, 600 480 S 1000 380, 1240 480"
        fill="none"
        stroke="#7fc9a6"
        strokeOpacity="0.14"
        strokeWidth="1.2"
      />
      <path
        className="lb-ribbon lb-ribbon--3"
        d="M -40 640 C 240 540, 460 740, 680 640 S 1060 540, 1240 640"
        fill="none"
        stroke="var(--primary-1)"
        strokeOpacity="0.10"
        strokeWidth="1.0"
      />
    </svg>
  );
}

export default function LandingPage({ onNav }) {
  const t = useT();

  const featureCards = [
    {
      id: 'feat-build',
      icon: '⚏',
      title: t('landing.feat.buildTitle'),
      body: t('landing.feat.buildBody'),
    },
    {
      id: 'feat-edges',
      icon: '✎',
      title: t('landing.feat.edgesTitle'),
      body: t('landing.feat.edgesBody'),
    },
    {
      id: 'feat-export',
      icon: '⤓',
      title: t('landing.feat.exportTitle'),
      body: t('landing.feat.exportBody'),
    },
  ];

  return (
    <div className="page-landing">
      <LandingBackdrop />

      <section className="landing-hero">
        <div className="landing-hero__mark"><WaveBrandMark size="lg" /></div>
        <p className="landing-hero__sub">{t('landing.heroSub')}</p>
        <h1 className="landing-hero__name">Hakoniwa</h1>
        <p className="landing-hero__tagline">
          {t('landing.tagline')}
        </p>
        <div className="landing-hero__ctas">
          <button
            type="button"
            className="action-btn action-btn--primary landing-cta"
            onClick={() => onNav('projects')}
          >
            <span>{t('landing.openApp')}</span>
            <span className="landing-cta__arrow" aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="action-btn action-btn--ghost"
            onClick={() => onNav('docs')}
          >
            {t('landing.readDocs')}
          </button>
        </div>
      </section>

      <WaveDivider amplitude={8} />

      <section className="landing-features">
        <MetaCardRow cards={featureCards} />
      </section>

      <WaveDivider amplitude={8} flip />

      <section className="landing-foot">
        <button
          type="button"
          className="landing-foot__cta"
          onClick={() => onNav('docs')}
        >
          <span>{t('landing.continueToDocs')}</span>
          <span className="landing-foot__arrow" aria-hidden="true">↓</span>
        </button>
      </section>
    </div>
  );
}
