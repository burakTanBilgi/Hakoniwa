// Render a millisecond timestamp as a short relative-time string.
// `t` is the i18n translator (from useT()); `locale` drives date formatting.
export function formatTime(ts, t, locale = 'en') {
  const d = new Date(ts);
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return t('time.justNow');
  if (diff < 3600) return t('time.minutesAgo', { n: Math.floor(diff / 60) });
  if (diff < 86400) return t('time.hoursAgo', { n: Math.floor(diff / 3600) });
  return d.toLocaleDateString(locale);
}
