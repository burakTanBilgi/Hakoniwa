// Turkish UI strings. Keys mirror en.js exactly (enforced by
// tests/unit/i18n/dictionaries.test.js). Missing keys fall back to English.
export default {
  'time.justNow': 'az önce',
  'time.minutesAgo': '{n} dk önce',
  'time.hoursAgo': '{n} sa önce',
  'nav.landing': 'Giriş',
  'nav.docs': 'Belgeler',
  'nav.projects': 'Projeler',
  'nav.preview': 'Önizleme',
  'nav.grid': 'Izgara',
  'nav.edit': 'Düzenle',
  'nav.pages': 'Sayfalar',
  'nav.toggleTheme': 'Temayı değiştir',
  'nav.themeToLight': 'Açık temaya geç',
  'nav.themeToDark': 'Koyu temaya geç',

  // uygulama kabuğu
  'app.loading': 'Yükleniyor…',
  'app.skipToContent': 'Ana içeriğe geç',

  // açılış sayfası
  'landing.heroSub': '箱庭 · kendisiyle oluşturuldu',
  'landing.tagline': 'Birbirine oturan düzenler tasarlayın — yapboz çıkıntıları, yumuşak dalgalar veya düz çizgiler. Bir ızgara oluşturun, hücreleri parçalara birleştirin, metin ya da resimlerle doldurun ve JSON, tek bir React dosyası veya tam modül paketi olarak dışa aktarın.',
  'landing.openApp': 'Uygulamayı aç',
  'landing.readDocs': 'Belgeleri oku',
  'landing.continueToDocs': 'Belgelere devam et',
  'landing.feat.buildTitle': 'Parçalarla oluşturun',
  'landing.feat.buildBody': 'Izgara içindeki hücreleri sürükleyerek seçin ve özel parçalar halinde birleştirin.',
  'landing.feat.edgesTitle': 'Her kenarı stilize edin',
  'landing.feat.edgesBody': 'Üç bağlayıcı stili — yapboz, dalga, düz — renk, opaklık ve genişlik için kenar bazında geçersiz kılmalarla.',
  'landing.feat.exportTitle': 'Her yere dışa aktarın',
  'landing.feat.exportBody': 'JSON, tek başına çalışan bir React dosyası veya hazır modül paketi olarak gönderin.',

  // projeler sayfası
  'projects.yourProjects': 'Projeleriniz',
  'projects.importJson': '↑ JSON İçe Aktar',
  'projects.newProject': 'Yeni proje',
  'projects.deleteTooltip': 'Projeyi sil',
  'projects.deleteAriaLabel': 'Projeyi sil',
  'projects.confirmDelete': '"{name}" silinsin mi?',

  // önizleme sayfası
  'preview.exportButton': '↓ Dışa Aktar ▾',
  'preview.exportJson': 'JSON',
  'preview.exportJsonHint': 'Proje dosyası (yeniden içe aktarılabilir)',
  'preview.exportSingleFile': 'Tek dosyalı React',
  'preview.exportSingleFileHint': 'Bir .jsx + README — herhangi bir React 18+ projesine ekleyin',
  'preview.exportModuleZip': 'Modül paketi (ZIP)',
  'preview.exportModuleZipHint': 'Tam puzzle/ klasörü + project.json + README',
  'preview.editGrid': '⊞ Izgarayı düzenle',
  'preview.editPieces': '✎ Parçaları düzenle',
  'preview.grid': '{rows}×{cols} ızgara',
  'preview.lastEdited': 'son düzenleme {time}',
  'preview.hint': 'Izgara düzenini düzenleyin ya da kenarları stillendirmek ve hücrelere metin/resim eklemek için Düzenleme sayfasını açın.',

  // genel
  'common.untitled': 'Adsız',

  // hatalar
  'errors.importFailed': 'İçe aktarılamadı: {detail}',
};
