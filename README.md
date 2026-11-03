# TraceQuery

**Veriye sor, sonucun izini sür.** SQLite sorgularının mantıksal aşamalarını, kaynak kayıtlarını ve filtrede elenmeyi gösteren yerel prototip.

## Başlatma

Gereksinimler: Python 3.11+ (SQLite 3.37+), Node.js 22.12+ ve npm. İlk kurulum paket indirmek için internet gerektirir.

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt
cd frontend
npm ci
cd ..
./scripts/start.sh
```

`start.sh` arayüzü derleyip yerel sunucuyu açar; kapatmak için Ctrl+C kullanın. Sonraki başlatmalar için yalnız `./scripts/start.sh` yeterlidir.

Tarayıcıda **http://127.0.0.1:8000** açılır. “Örnek veritabanıyla başla” → “Çalıştır ve açıkla” → bir sonuç satırının numarası → kaynaklar. Kayıtların yolculuğundan JOIN'de kaybolan Mehmet ve WHERE'de elenen Ayşe incelenebilir. NULL filtre sonucu UNKNOWN olarak ayrılır.

Geliştirmede backend'i aynı komutla `--reload` ile çalıştırın; ikinci terminalde `cd frontend && npm run dev`. Vite API isteklerini yerel backend'e yönlendirir.

## İlk sürüm kapsamı

- Demo veritabanı veya en fazla 10 MB SQLite yükleme; yüklenen **kopya** geçici yerel dizinde tutulur ve sunucu kapanınca silinir.
- Şema, 100 satırlık sayfalı tablo görünümü.
- Sütun seçimi, tablo/sütun takma adları, eşitlik INNER JOIN, basit karşılaştırma/IS NULL/AND filtreleri.
- Her aşamada kaynak kimlikleri; aynı görünen satırlar korunur; self-JOIN rolleri ayrılır.
- İlk sürümde kaynak tablolar tek sütunlu INTEGER PRIMARY KEY taşımalı. Bir aşama veya kaynak tablo 1000 satırı aşarsa açıklama eksik sonuç üretmek yerine durur. SQLite sorguları yaklaşık 5 saniyelik hesaplama bütçesine tabidir.
- Kaynak kimlikleri NULL olmayan, benzersiz ve JavaScript güvenli tamsayı aralığında olmalıdır. BLOB değerleri hex olarak gösterilir. Kaynak dosyası salt okunur açılır. Sorgu AST izin listesiyle doğrulanır. GROUP BY, DISTINCT, alt sorgu, ORDER BY, LIMIT, işlevler ve veri yazma ilk kapsamda yok.
- Aşamalar **mantıksal açıklamadır**, SQLite'ın fiziksel yürütme sırası değildir. Kayıt sayıları bağımsız varlık sayısı değil, aşamadaki kaynak birleşimi sayısıdır.
- Doğal dil → SQL henüz yok. İleride aynı `/api/explain` doğrulama/çalıştırma yolunun önüne eklenebilir.

## Doğrulama

```bash
.venv/bin/python -m pytest -c backend/pytest.ini
cd frontend && npm run build
```

Bağımlılık kurulamayan ortamda yalnız SQLite çekirdeği için:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_core.py -v
```

Çekirdek testleri AST ayrıştırıcısını ve HTTP katmanını test etmez. Tam doğrulama için pytest ve frontend derlemesi gereklidir.

## Yapı

- `backend/tracequery/engine.py`: SQLite erişimi, kapsam doğrulama, kaynak ve aşama motoru.
- `backend/tracequery/app.py`: FastAPI uçları ve geçici dosya yaşam döngüsü.
- `backend/tracequery/demo.py`: eğitim verisi ve örnek sorgu.
- `frontend/src/`: React/TypeScript arayüzü.
- `docs/specs/`: kullanım senaryosu ve proje özeti.
- `docs/superpowers/plans/`: başlangıç planı ve doğrulama kaydı.

Bu yerel uygulamayı genel internete açmayın: kimlik doğrulama, çok kullanıcılı oturum sınırları ve üretim izolasyonu geliştirilmedi. İşlem başlatma ve veritabanı yükleme yalnız localhost kullanımı içindir.

## Bu ortamda yapılan kontroller

Kurulum sonrası **54 backend testi atlama olmadan geçti**: SQLite motoru, gerçek SQLGlot ayrıştırıcısı ve FastAPI TestClient akışı. TypeScript kontrolü ve Vite üretim derlemesi başarılı. Gerçek dosya yükleme, salt okunur kopya, geçersiz/büyük dosya reddi ve geçici dosyaların temizliği HTTP testlerinde kontrol edildi.

Bu ajan oturumunda yerel TCP soketi açılması engelleniyor; tarayıcı testlerinin altı senaryosu henüz çalıştırılmadı. Gerçek ekran ve Chromium akışı doğrulanmadan uçtan uca tamamlanma iddiasında bulunulmuyor. Güncel kanıtlar [docs/VERIFICATION.md](docs/VERIFICATION.md) içinde.

## Tarayıcı doğrulaması

Bağımlılıklar kurulduktan sonra (proje kökünden):

```bash
cd frontend
npx playwright install chromium
cd ..
./scripts/verify.sh
```

Playwright üretim derlemesini sunan backend sunucusunu başlatır; 8000 portu boş olmalı. Önceden `start.sh` ile açılan sunucuyu Ctrl+C ile kapatın. Testler gerçek API üzerinden demo, kaynak hücreleri, JOIN'de elenme, FALSE/UNKNOWN ayrımı, yazma reddi ve şema ilişkilerini inceler. Gerçek SQLite yükleme senaryosu, düzenlenmiş SQL ile önceki sonucun ayrımı ve bekleyen isteği iptal ederken son başarılı sonucun korunması da sınanır. Doğrulama çıktısı `.artifacts/verification/latest.log` dosyasına kaydedilir. Ekran görüntüleri ve başarısız koşu izleri `frontend/test-results/` altında oluşur. Test dosyalarının hazırlanmış olması çalıştırıldıkları anlamına gelmez.

Kaynak kartları gerçek sütun değerlerini, filtre açıklamaları karşılaştırılan değerleri gösterir. Anahtarın generated sütunların yanında bulunması da çekirdek regresyon testiyle kontrol edilir. Çalışma alanındaki kaynak numaraları kaynak birleşimleridir; kişi sayısı olarak yorumlanmamalıdır.

WHERE ve ON içinde gerçek kaynak sütunlarını kullanın; SELECT ile tanımlanmış sütun takma adını bu koşullarda kullanmak ilk sürüm kapsamında değildir.

Sorgu çalışırken **İptal et** düğmesi HTTP isteğini keser. Backend bağlantı kopmasını algılayarak iptal olayını SQLite progress handler'a iletir; önceki başarılı açıklama korunur. Çekirdek iptal ve bağlantı-kopması orkestrasyonu gerçek SQLite testleriyle doğrulandı. Tarayıcıdan backend'e bütün iptal hattı henüz çalıştırılmadı.

Sonuç veya WHERE aşamasından seçilen satırda filtre koşulları ve karşılaştırılan değerler gösterilir. Örneğin Ali'nin aynı isimli iki sonuç satırında notlar ayrı ayrı 80 ve 75 olarak izlenir; açıklama görünen değerler yerine kaynak kimlikleriyle eşleştirilir.

Bir kaydın dalları farklı sonuçlanabilir: örneğin Ali'nin bir ders kaydı sonuçta kalırken diğerinin ders eşleşmesi bulunamayabilir. Kayıt yolculuğu, eşleşmeyen birleşimi kaybolduğu JOIN ve ON koşuluyla ayrı gösterir; Ali'nin kalan katkısı korunur.

Her tamamlanan açıklama benzersiz bir oturum kimliği ve kullanılan SQL'i taşır. Düzenleyicideki metin sonradan değiştirilse bile “Son çalıştırılan sorgu” bölümünde mevcut sonuçları üreten SQL görüntülenir. Yeni koşu başarısız olursa önceki başarılı açıklama korunur.

Dosya yüklenince örnek sorgu, dosyadaki açıklanabilir bir tablodan otomatik seçilir; tablo adındaki boşluklar güvenle alıntılanır. Uygun INTEGER PRIMARY KEY yoksa dosya görüntülenebilir; açıklama sınırlaması gösterilir ve geçersiz örnek sorgu önerilmez.
