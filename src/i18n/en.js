// English UI strings — the canonical dictionary. Every key used anywhere in
// the app MUST exist here; tr.js may lag (missing keys fall back here).
// Keys are dotted namespaces: nav.* preview.* effects.* time.* etc.
export default {
  'time.justNow': 'just now',
  'time.minutesAgo': '{n}m ago',
  'time.hoursAgo': '{n}h ago',
  'nav.landing': 'Landing',
  'nav.docs': 'Docs',
  'nav.projects': 'Projects',
  'nav.preview': 'Preview',
  'nav.grid': 'Grid',
  'nav.edit': 'Edit',
  'nav.pages': 'Pages',
  'nav.toggleTheme': 'Toggle theme',
  'nav.themeToLight': 'Switch to light theme',
  'nav.themeToDark': 'Switch to dark theme',

  // app shell
  'app.loading': 'Loading…',
  'app.skipToContent': 'Skip to main content',

  // landing page
  'landing.heroSub': '箱庭 · built with itself',
  'landing.tagline': 'Design layouts that snap together — puzzle tabs & sockets, soft waves, or clean straight lines. Build a grid, merge cells into pieces, fill them with text or images, and export as JSON, a single React file, or a full module bundle.',
  'landing.openApp': 'Open the app',
  'landing.readDocs': 'Read the docs',
  'landing.continueToDocs': 'Continue to docs',
  'landing.feat.buildTitle': 'Build with pieces',
  'landing.feat.buildBody': 'Drag-select cells in a grid and merge them into custom pieces.',
  'landing.feat.edgesTitle': 'Style every edge',
  'landing.feat.edgesBody': 'Three connector styles — puzzle, wave, straight — with per-edge overrides for color, opacity, and width.',
  'landing.feat.exportTitle': 'Export anywhere',
  'landing.feat.exportBody': 'Ship as JSON, a single self-contained React file, or a drop-in module bundle.',

  // projects page
  'projects.yourProjects': 'Your Projects',
  'projects.importJson': '↑ Import JSON',
  'projects.newProject': 'New project',
  'projects.deleteTooltip': 'Delete project',
  'projects.deleteAriaLabel': 'Delete project',
  'projects.confirmDelete': 'Delete "{name}"?',

  // preview page
  'preview.exportButton': '↓ Export ▾',
  'preview.exportJson': 'JSON',
  'preview.exportJsonHint': 'Project file (re-importable)',
  'preview.exportSingleFile': 'Single-file React',
  'preview.exportSingleFileHint': 'One .jsx + README — drop into any React 18+ project',
  'preview.exportModuleZip': 'Module bundle (ZIP)',
  'preview.exportModuleZipHint': 'Full puzzle/ folder + project.json + README',
  'preview.editGrid': '⊞ Edit grid',
  'preview.editPieces': '✎ Edit pieces',
  'preview.grid': '{rows}×{cols} grid',
  'preview.lastEdited': 'last edited {time}',
  'preview.hint': 'Edit the grid layout, or open the Edit page to style edges and fill cells with text/images.',

  // common
  'common.untitled': 'Untitled',

  // errors
  'errors.importFailed': 'Could not import: {detail}',
};
