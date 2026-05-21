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
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.import': 'Import',
  'common.delete': 'Delete',

  // errors
  'errors.importFailed': 'Could not import: {detail}',

  // grid page
  'grid.cardSelection': 'Selection',
  'grid.cardColor': 'Color',
  'grid.cardBackgrounds': 'Backgrounds',
  'grid.cardDimensions': 'Dimensions',
  'grid.cardImport': 'Import',
  'grid.cardTips': 'Tips',
  'grid.sheetTitle': 'Grid tools',
  'grid.selectionHintEmpty': 'Drag across cells, or click + Shift to add cells.',
  'grid.selectionHint.one': '{n} cell selected.',
  'grid.selectionHint.other': '{n} cells selected.',
  'grid.mergeTooltipOk': 'Merge selected cells',
  'grid.mergeTooltipDisabled': 'Selection must form a complete rectangle',
  'grid.merge': 'Merge',
  'grid.unmerge': 'Unmerge',
  'grid.clearSelection': 'Clear selection',
  'grid.selectionNotRect': "Selection isn't rectangular — merge requires every cell in a complete rectangle.",
  'grid.clearColorLabel': 'Clear color',
  'grid.colorAriaLabel': 'Color {c}',
  'grid.customColor': 'Custom color',
  'grid.colorHint': 'Select cells to colour them.',
  'grid.rowsLabel': 'Rows',
  'grid.colsLabel': 'Cols',
  'grid.dimensionsHint': '{rows} × {cols} cells (max {max}×{max}).',
  'grid.importHint': 'Paste a spreadsheet, or import a CSV file.',
  'grid.pasteData': 'Paste data',
  'grid.importCsvTsv': 'Import CSV/TSV file',
  'grid.importWarnHint': 'Importing replaces the current grid.',
  'grid.importFailed': 'Import failed: {detail}',
  'grid.readFileFailed': 'Could not read file: {detail}',
  'grid.tip1': 'Drag from any cell to box-select.',
  'grid.tip2': 'Shift-click to add or remove individual cells.',
  'grid.tip4': 'Merged groups show their dimensions.',
  'grid.tip5': 'Click any number value to type it directly.',

  // grid canvas
  'grid.deleteColumn': 'Click to delete column {n}',
  'grid.deleteRow': 'Click to delete row {n}',

  // backgrounds panel
  'grid.bgHintSelection': 'Image will fill {cols}×{rows} selected cells, sliced across the underlying pieces.',
  'grid.bgHintNoSelection': 'Select cells to choose where to place the image (defaults to the full grid).',
  'grid.uploadImage': 'Upload image',
  'grid.pasteImageHint': 'Or paste an image (Ctrl+V) — it goes into the current selection.',
  'grid.deleteBgTooltip': 'Delete this background',
  'grid.deleteBgAriaLabel': 'Delete background',

  // import dialog
  'grid.importDialogTitle': 'Import grid data',
  'grid.importDialogHint': 'Paste tab-separated (from Excel/Google Sheets) or comma-separated data. Each non-empty cell becomes a piece.',
  'grid.autoMergeLabel': 'Auto-merge horizontal runs (extend each cell to the right over empties)',
  'grid.insertSample': 'Insert sample',
};
