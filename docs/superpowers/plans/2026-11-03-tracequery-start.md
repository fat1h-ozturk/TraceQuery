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
- [x] Gerçek SQLite fixture ile kaynak kimliği, JOIN, filtre, NULL, tekrar, sınır ve yazma reddi testlerini yaz; RED çalıştır.
- [x] Motor ve API'yi uygula; pytest tamamını çalıştır.

## Task 2: Arayüz
Files: frontend/src/App.tsx, style.css, main.tsx; package.json, vite.config.ts.
- [x] Demo/açma, tablo gezinme, SQL çalıştırma, aşamalar, kaynak vurgulama ve hata durumlarını bağla.
- [x] TypeScript kontrolü ve üretim derlemesi; gerçek API ile demo akışını doğrula.

## Task 3: Teslim
Files: README.md, .gitignore, scripts/start.sh, scripts/verify.sh.
- [x] Çalıştırma yönergesi ve destek sınırlarını yaz.
- [x] Bağımsız kod incelemesi ve gerekli düzeltmeler; son pytest/build.

## Decisions / Progress
- Kullanıcının doğrudan başlama isteğiyle mevcut repoda ayrı geliştirme dalı kullanıldı; başka worktree oluşturulmadı.
- Bu başlangıç tüm altı haftalık ürünü tamamladığı iddiası taşımaz; kapsam dışı SQL açıkça reddedilir.

## Güncel sonuç (3 Kasım 2026)
- İlk yerel sürümün bütün plan görevleri doğrulandı. `./scripts/verify.sh`: 58 backend testi + üretim derlemesi + 8 gerçek Chromium senaryosu başarılı, çıkış kodu 0.
- `scripts/start.sh` ile açılan canlı sunucuda ana HTML, iki asset ve demo/explain akışı HTTP üzerinden kontrol edildi.
- Kod mevcut `feat/tracequery-start` dalında commitlenir. Kullanıcının gereksiz onay istememe talebi doğrultusunda ek merge/PR kararı istenmez ve dal yerinde tutulur.
- Aşağıdaki kayıtlar gelişimin tarihçesidir; eski ağ/izin engelleri güncel engel değildir. Güncel kabul kanıtları docs/VERIFICATION.md içindedir.

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

### Geçen WHERE koşulları
- UC-06 adım 5 tamamlandı: geçen sonuç birleşimleri gerçek operand değerlerini taşır; arayüz seçilen sonuç ve WHERE satırında gösterir.
- Aynı görünen iki Ali satırının 80/75 notlarının karışmaması testi RED→GREEN. Toplam 23 test başarılı, parser/API bağımlılık modülleri 2 skip. Arayüz beklentileri eklendi; gerçek tarayıcı kontrolü hâlâ bekliyor.

### Çoklu JOIN'de dal kaybı
- UC-07 zorunlu kısmi katılım örneğinde eksik kalan JOIN dalı açıkça kaydedilip gösteriliyor. Yeni açıklama, kaynak kişinin diğer dalının sonuç katkısını silmez.
- Gerçek SQLite testi RED→GREEN: Ali 1 sonuçta kalıyor, 102 kaydı JOIN 2'de eleniyor, Mehmet JOIN 1'de eşleşmiyor. Son koşu 24 başarılı, 2 bağımlılık modülü skip.
- PyPI/npm DNS erişimi hâlâ yok; tam doğrulama bekliyor.

### Açıklama kimliği ve kullanılan SQL
- UC-03 başarılı oturuma benzersiz kimlik ve tamamlanma durumu eklendi; UI son başarılı sorguyu ayrıca gösterir. Test RED→GREEN. 25 test başarılı, 2 bağımlılık modülü skip.
- Düzenlenmiş SQL ile eski sonucun karıştırılmaması için gerçek API kullanan ek browser senaryosu hazırlandı; henüz çalıştırılmadı.

### Güncel kabul denetimi
- Tam demo kaynak birleşimleri ve çalışan SQLite sorgusunun süre aşımı için iki ek doğrudan test geçti. Toplam 25 çekirdek + 2 orkestrasyon testi başarılı, parser/API modülleri 2 skip.
- `scripts/verify.sh` FastAPI eksikliğinde, `npm run build` tsc eksikliğinde duruyor. İki paket sunucusunun DNS çözümlemesi başarısız.
- AC-01..AC-14 için eldeki doğrudan kanıt ve kalan entegrasyon doğrulaması docs/VERIFICATION.md içinde güncellendi. Proje tamamlandı sayılmadı; ek kapsam yerine paket/ağ engelinin kalkması ve tam doğrulama gerekiyor.

- Kabul denetiminde kalan doğrudan çekirdek sınamaları eklendi: tamamlanan boş sonuçta kayıt izleri, anahtarsız tablonun okunup açıklanmasının reddi ve kaynaklar sığarken JOIN ara sonucunun sınırı aşması. Son koşu 28 çekirdek + 2 orkestrasyon = 30 başarılı, 2 bağımlılık modülü skip.

### Çalışabilir ürün devamı
- Kullanıcı terminalindeki kurulumla bağımlılıklar geldi: 54 backend testi atlama olmadan geçti; TypeScript/Vite build başarılı.
- Yüklenen her dosyaya öğrenci sorgusu verilmesi gerçek başarısız testle üretildi. Dosyanın kendi PK'li tablosu güvenli alıntıyla seçilir; uygun tablo yoksa geçersiz örnek verilmez. HTTP yükleme, orijinal/kopya byte kontrolü, kapanış temizliği ve 10 MB sınırı doğrulandı.
- TestClient'ın ortamda kaybolan thread uyanması küçük gerçek Starlette örneğinde doğrulandı; test loop'una zamanlayıcı eklemek gerçek HTTP/SQLite testlerinin geçmesini sağladı. Ürün yolu değiştirilmedi, test atlanmadı.
- Ruling: Planın dev.sh dosyası yerine scripts/start.sh ile tek portlu derleme+başlatma sunuldu — ilk yerel kullanımda iki terminal gereksinimini kaldırır; kaynak frontend değişikliklerinde yeniden başlatma gerekir, hot reload için README'deki Vite geliştirme yolu sürer.
- Playwright'a gerçek dosya yükleme ve orijinal dosya byte kontrolü eklendi, toplam 5 senaryo hazır. Ekran görüntüleri ve kalıcı doğrulama logu üretilir. Gerçek browser koşusu bekliyor.
- Yerel TCP ve Computer Use erişimi bu ortamda kısıtlı; kullanıcı normal terminalinde verify.sh/start.sh çalıştırabilir.

- Doğrulama komutu 54 backend testi ve build aşamasını geçti; gerçek browser sunucusunun TCP bind engelini loga kaydedip başarısız döndü. Playwright yapılandırması kullanıcıdaki start.sh ile aynı üretim derlemesini tek porttan test eder; Vite geliştirme sunucusuna ihtiyaç yok.

### UI istek çakışması
- Chromium kurulumu tamamlanmış; normal terminalde verify koşusu henüz loga yansımadı. Bu oturumda TCP dinleme ve browser host engeli sürüyor.
- Sorgu sırasında kaynak tablo sekmesinin ikinci ağ işlemi başlatabilmesi düzeltildi. Ortak ref aynı anda tek işlem kabul eder; iptal denetleyicisi yalnız kabul edilen sorguda oluşturulur.
- Bekleyen HTTP isteğinin iptalinden sonra son başarılı sonuç/SQL'in korunması ve tablo sekmesinin kilitlenmesi için altıncı Playwright senaryosu eklendi. Build ve test keşfi geçti; gerçek tarayıcı doğrulaması bekliyor.

### Gerçek Chromium ve son inceleme
- Kullanıcı terminalinde ilk tam koşu: 54 backend + build geçti, Chromium 5 başarılı/1 başarısız. Başarısız seçici dt/dd iki 60 değerini eşliyordu; definition rolüne daraltıldı, tekrar koşu bekliyor.
- Son bağımsız inceleme önemli yeni mimari sorun bulmadı. Geçerli slash içeren tablo adında 404 ve README reload komutunu bildirdi.
- Final: Ruling: Tablo adının URI yolu olarak kaybı rutin geçerli SQLite girdisini bozuyor — query parametresiyle ve eski yolu koruyarak düzeltildi; dört gerçek HTTP testinde RED→GREEN. Yanlışsa istemci API uyumluluğu riski var; eski yol testle korunuyor.
- Güncel 58 backend testi geçti; TS/Vite build ve altı browser testinin keşfi başarılı. Browser yükleme varyantı boşluk/slash içeren tabloyu açıp gezmeyi de kontrol eder.
- Sandbox dışı browser testi için resmi yetki yükseltme isteği otomatik politika tarafından reddedildi. Geniş erişim verme veya kısıtı dolanma yapılmadı. Kullanıcının gerekli olmadıkça kendisinden işlem istememe tercihi doğrultusunda istek tekrar edilmedi.

### İlk yerel sürümün tamamlanması
- İzinler kullanıcı tarafından değiştirildi; yerel sunucu ve gerçek Chromium testleri bu oturumda çalıştırılabildi.
- İkinci Chromium belirsiz seçici (tablo gezintisi ile aynı adlı kaynak rolü) sol gezintiye daraltılarak giderildi. İlk altı senaryo geçti.
- Aynı değerli iki sonuçtan farklı kaynaklara gitme, JOIN ara tablosu, sonraki JOIN'de kısmi kayıp ve anahtarsız tablo için iki ek gerçek tarayıcı senaryosu geçti. Toplam 58 backend + 8 Chromium testi başarılı; build başarılı.
- Demo FALSE/UNKNOWN ve kısmi JOIN ekranları görsel olarak incelendi. Canlı uygulama 127.0.0.1:8000 üzerinde açıldı; HTML/asset/demo/explain HTTP kontrolleri geçti.
- Sonuç: SQLite çekirdek MVP hazır. Doğal dil, karşılaştırma, dışa aktarma ve kullanıcı pilotu sonraki kapsamdır; yapılmış gibi sunulmaz.
