// Image-fit modes shared by ContentPanel (per-piece images) and
// BackgroundsPanel (multi-piece backgrounds). Single source of truth — pure
// data, no React or i18n imports. Consuming components resolve labels and
// hints via t('common.fitCover'), t('common.fitHintCover'), etc.
export const FIT_OPTIONS = [
  { value: 'cover'   },
  { value: 'contain' },
  { value: 'fill'    },
];
