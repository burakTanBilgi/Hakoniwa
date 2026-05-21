import { useT } from '../../i18n/index.js';
import './SyncPill.css';

// Compact status pill that lives next to the brand/project name. Four
// states:
//   offline → Supabase not configured or no user signed in → "Local"
//   syncing → upload/download in flight                   → "Syncing…"
//   synced  → idle, last reconcile succeeded              → "Synced"
//   error   → last sync failed                            → "Sync error"

export default function SyncPill({ status = 'offline' }) {
  const t = useT();
  const LABELS = {
    offline: t('sync.statusLocal'),
    syncing: t('sync.statusSyncing'),
    synced:  t('sync.statusSynced'),
    error:   t('sync.statusError'),
  };
  const label = LABELS[status] || LABELS.offline;
  return (
    <span
      className={`sync-pill sync-pill--${status}`}
      role="status"
      aria-live="polite"
      title={label}
    >
      <span className="sync-pill__dot" aria-hidden="true" />
      <span className="sync-pill__label">{label}</span>
    </span>
  );
}
