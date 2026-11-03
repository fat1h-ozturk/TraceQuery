# TraceQuery İlk Sürüm Uygulama Planı

> For agentic workers: Use executing-plans to implement task-by-task with tests first.

**Goal:** SQLite üzerinde SELECT/JOIN/WHERE sonuçlarını ve kaynak kayıtları gösteren yerel uygulama.
**Architecture:** FastAPI + sqlite3 + SQLGlot motoru; React/TypeScript/Vite arayüz. Kaynak dosyalar salt okunur; doğal dil modülü bu API'nin önüne sonradan eklenebilir.
**Spec:** ../../specs/use-case.md

## Global Constraints
- İlk sürüm SQLite; doğal dil üretimi yok.
- Kimlikli normal tablolar, sütun seçimi, eşitlik INNER JOIN ve basit AND filtreleri.
- SQL yapısal izin listesiyle doğrulanır; salt okunur bağlantı ve süre/satır sınırları uygulanır.
- Kaynak kimlikleri, NULL ve tekrar satırlar korunur; aşamalar fiziksel yürütme planı değildir.

## Review Focus
Yazma girişimi; NULL karşılaştırmaları; tekrar değerler; self JOIN takma adları; aşırı büyük ara sonuç.

## Task 1: Motor ve API
Files: backend/tracequery/engine.py, app.py; backend/tests/test_tracequery.py.
Interface: inspect_database(path), explain(path, sql); POST /api/demo, /api/databases, /api/explain; GET /api/schema/{id}, /api/table/{id}/{table}.
- [ ] Gerçek SQLite fixture ile kaynak kimliği, JOIN, filtre, NULL, tekrar, sınır ve yazma reddi testlerini yaz; RED çalıştır.
- [ ] Motor ve API'yi uygula; pytest tamamını çalıştır.

## Task 2: Arayüz
Files: frontend/src/App.tsx, style.css, main.tsx; package.json, vite.config.ts.
- [ ] Demo/açma, tablo gezinme, SQL çalıştırma, aşamalar, kaynak vurgulama ve hata durumlarını bağla.
- [ ] TypeScript kontrolü ve üretim derlemesi; gerçek API ile demo akışını doğrula.

## Task 3: Teslim
Files: README.md, .gitignore, scripts/dev.sh.
- [ ] Çalıştırma yönergesi ve destek sınırlarını yaz.
- [ ] Bağımsız kod incelemesi ve gerekli düzeltmeler; son pytest/build.

## Decisions / Progress
- Kullanıcının doğrudan başlama isteğiyle mevcut repoda ayrı geliştirme dalı kullanıldı; başka worktree oluşturulmadı.
- Bu başlangıç tüm altı haftalık ürünü tamamladığı iddiası taşımaz; kapsam dışı SQL açıkça reddedilir.

## Uygulama kaydı
- Backend motoru/API ve React arayüzü yazıldı; mevcut kullanım senaryoları repo içine kopyalandı.
- Ruling: Ağ paket kurulumunu engellediği için çekirdek executor SQLGlot importundan ayrıldı; parser/API kodu korunarak yalnız stdlib çekirdeği çalıştırıldı. Bedeli: AST ve HTTP entegrasyonu henüz doğrulanmış değil.
- Ruling: Kaynak kimlikleri NULL/tekrar/JS güvenli tamsayı aralığı açısından kontrol edilir. Desteklenmeyen kimliklerde yanlış kaynak göstermek yerine açıklama reddedilir.
- Bağımsız incelemede bulunan NULL anahtar, büyük kimlik ve BLOB serileştirme sorunları önce başarısız testle üretildi, sonra düzeltildi.
- Çekirdek unittest: 8 başarılı. Yerelde mevcut sağlam pytest paketiyle suite: 8 başarılı, bağımlılıklar eksik olduğu için parser ve API modülleri 2 skip. Python compileall başarılı.
- PyPI bağlantısı DNS/ağ erişimiyle başarısız; npm offline kurulumunda @types/react önbellekte yok. Yereldeki diğer projelerin paketleri bozuk olduğundan kullanılmadı. Frontend build ve browser kontrolü çalıştırılamadı.
- İzleyen doğrulama: requirements kurulumu → tam pytest (skip olmadan) → npm install/build → gerçek tarayıcı demo ve yükleme akışı.
- Depodaki file.txt silinmesi bu çalışma sırasında dışarıdan görüldü; oluşturulan kod bu dosyaya dokunmadı. Silinme geri alınmadı ve commit edilmedi.

### Devam çalışması
- Kaynak kartları gerçek hücre değerleri taşıyor; AND filtrelerinin operandları ve ayrı TRUE/FALSE/UNKNOWN sonuçları hesaplanıyor.
- İlk elenme aşaması ve PK/FK şema ayrıntıları eklendi. Generated sütunlarda kimlik eşleştirme regresyonu düzeltildi.
- Çekirdek testler 16'ya çıktı; hepsi geçti. İlgili yeni testler önce eksik davranışı gösterip ardından geçti.
- Gerçek API kullanan Playwright senaryoları ve tek doğrulama komutu eklendi; npm EAI_AGAIN nedeniyle henüz koşulamadı.
- Doğrulama kapsamı ve açık işler docs/VERIFICATION.md içinde izleniyor. Hedef tamamlandı sayılmıyor.

### İptal akışı
- `b638cc2`: SQLite iptal olayı ve süre sınırı; 19 çekirdek test başarılı.
- İstemci bağlantısı kopunca worker'ın iptal edilmesi, React AbortController ve önceki başarılı sonucun korunması bağlandı.
- Orkestrasyonun iki gerçek SQLite testi dahil 22 test geçti. HTTP/SQLGlot test modülleri bağımlılık engeliyle atlanıyor.
- Kullanıcının talebi doğrultusunda anlamlı ve doğrulanmış adımlar ayrı commit'lerle kaydediliyor; dosya silinmesi bu commit'lere dahil edilmiyor.

- Bağımsız incelemenin Python sayım döngülerinde süre bütçesi bulgusu ortak bütçe ve aşama sayaçlarıyla giderildi. 1.000 satır/10 alias denemesi 0,183 saniye; 22 test başarılı, 2 bağımlılık modülü skip. Son incelemede yeni önemli bulgu yok.
