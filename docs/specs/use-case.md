# TraceQuery — Kullanım Senaryosu Belgesi

**Tarih:** 2 Kasım 2026  
**Sürüm:** 1.0 — İlk prototip için önerilen kullanım senaryoları  
**Proje:** Sorgu sonuçlarını kaynak kayıtlarla ve mantıksal işlem aşamalarıyla açıklayan veritabanı görüntüleyicisi  
**Durum:** Gereksinim belgesi. İlk yerel sürümün uygulanmış kapsamı ve test kanıtları [doğrulama kaydında](../VERIFICATION.md) belirtilir; bu belge tek başına test sonucu değildir.

## 1. Amaç

SQL öğrenen öğrencilerin ve bir veritabanını inceleyen geliştiricilerin şu soruları gerçek kayıtlar üzerinden yanıtlayabilmesini sağlamak:

- Bu sonuç satırı hangi kaynak kayıtlardan oluştu?
- Aynı kaynak kayıt neden birden fazla sonuç satırına katkıda bulundu?
- Seçtiğim kaynak kayıt neden sonuçta görünmüyor?
- Hangi eşleşme veya filtre koşulu sonuç üzerinde etkili oldu?

Sistem, SQLite dosyasını açar; tablo ve verileri gösterir; desteklenen sorguyu çalıştırır; mantıksal ara sonuçlar ile kaynak kayıt bağlantılarını sunar. Veritabanını değiştirmek veya sorguyu otomatik düzeltmek ilk sürümün amacı değildir.

## 2. Sistem sınırı

### 2.1 İlk sürümde desteklenenler

- Yerel SQLite veritabanı dosyasını salt okunur açma.
- Kullanıcı tablolarını, sütunlarını ve tanımlı anahtarlarını listeleme.
- Tablo içeriğini sayfalı görüntüleme.
- Tek bir basit `SELECT` deyimi.
- Açık sütun seçimi ve tablo/sütun takma adları.
- Sütun eşitliğine dayalı `INNER JOIN ... ON` işlemleri.
- Sütun ve sabit değer arasında `=`, `!=`, `<`, `<=`, `>`, `>=` karşılaştırmaları; `IS NULL` ve `IS NOT NULL`.
- Bu basit filtrelerin `AND` ile birleştirilmesi.
- Birden çok JOIN'in mantıksal aşamalarını inceleme.
- Sonuç satırının kaynak kayıtlarını görüntüleme.
- Seçilen kaynak kaydın ilk hangi mantıksal aşamada sonuç üretme olasılığını kaybettiğini veya hangi dallarının elendiğini inceleme.

**Kayıt kimliği varsayımı:** İlk prototipte açıklanacak sorgunun her tablo kullanımı, tek sütunlu `INTEGER PRIMARY KEY` ile tanımlanabilen normal bir SQLite tablosuna dayanır. Takma adlarla aynı tablonun birden fazla kullanımı varsa bunlar ayrı kaynak rolleri olarak izlenir. Bu koşul sağlanmayan tabloların şeması/verisi görüntülenebilir; açıklama desteği yoksa gerekçesi bildirilir.

### 2.2 İlk sürüm dışında kalanlar

`LEFT/RIGHT/FULL JOIN`, `NATURAL JOIN`, `USING`, `GROUP BY`, `HAVING`, aggregate fonksiyonlar, `DISTINCT`, `ORDER BY`, sorgu içi `LIMIT/OFFSET`, alt sorgular, CTE, UNION ve pencere fonksiyonları; görünüm/virtual table açıklaması; kullanıcı tanımlı fonksiyonlar; veri yazma, şema değiştirme ve farklı veritabanı motorları.

İlk uygulamada `SELECT *`, dosyaya uygun örnek sorgu ve gerçek tarayıcı yükleme senaryosuyla doğrulanmıştır. Diğer ek sözdizimleri ancak açıkça tanımlanıp doğrulanırsa eklenir. Belge, desteklenmeyen bir sorguyu açıklayabiliyormuş gibi kabul etmez.

**Sayfalama ayrımı:** Arayüzün tabloyu sayfalaması, kullanıcının sorgusuna sessizce `LIMIT` eklenmesi veya görüntülenen sayfanın bütün sonuç sayılması anlamına gelmez.

### 2.3 Açıklamanın anlamı

Aşamalar, sorgunun mantıksal bir açıklamasıdır; SQLite'ın fiziksel yürütme sırasını, optimizer kararlarını veya CPU düzeyindeki yürütmeyi temsil etmez. Kaynak bağlantısı gerçek kayıt kimliklerine dayanır. Bir kaydın bir aşamada eşleşememesi SQL'in hatalı olduğunu tek başına kanıtlamaz.

## 3. Aktörler

| Aktör | Tür | Amaç |
|---|---|---|
| Kullanıcı | Birincil insan aktör | Veritabanını açmak, sorgu çalıştırmak ve kayıtların sonuçla ilişkisini anlamak |
| Araştırma katılımcısı | Kullanıcının değerlendirme rolü | Önceden hazırlanmış sorgu anlama görevlerini uygulamada tamamlamak |

Öğrenci, geliştirici ve öğretim üyesi aynı kullanıcı rolünün olası örnekleridir. SQL ayrıştırıcı, izleme motoru ve SQLite erişim katmanı sistemin iç bileşenleridir; dış kullanıcı aktörleri değildir. SQLite dosyası, sistemin okuduğu dış veri kaynağıdır.

## 4. Kullanım senaryoları özeti

| Kimlik | Kullanım senaryosu | Öncelik | İlişki / ön koşul |
|---|---|---|---|
| UC-01 | SQLite veritabanını açma | Zorunlu | Başlangıç |
| UC-02 | Şema ve kaynak kayıtları inceleme | Zorunlu | Açık veritabanı |
| UC-03 | Sorguyu çalıştırma ve açıklama oturumu oluşturma | Zorunlu | Açık veritabanı; UC-04'ü içerir |
| UC-04 | Sorgunun açıklama kapsamını doğrulama | Zorunlu | UC-03 içinde otomatik uygulanır |
| UC-05 | Mantıksal ara sonuçları inceleme | Zorunlu | Başarılı açıklama oturumu |
| UC-06 | Sonuç satırından kaynak kayıtlara gitme | Zorunlu | Başarılı açıklama oturumu |
| UC-07 | Kaynak kaydın sonucunu ve elenme nedenlerini inceleme | Zorunlu | Başarılı açıklama oturumu |
| UC-08 | Sorguyu değiştirip önceki sonuçla karşılaştırma | İsteğe bağlı | Önceki başarılı oturum |
| UC-09 | Açıklama raporunu dışa aktarma | İsteğe bağlı | Mevcut açıklama oturumu |

UC-05, UC-06 ve UC-07, UC-03 tamamlandıktan sonra kullanıcının seçebileceği bağımsız inceleme yollarıdır. Her sorgu çalıştırmasında hepsinin zorunlu olarak açılması gerekmez.

## 5. UC-01 — SQLite veritabanını açma

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı bir SQLite dosyası seçer.  
**Amaç:** Veriyi değiştirmeden incelemeye başlamak.

### Ön koşullar

- Dosya yerel olarak erişilebilirdir.
- Kullanıcının dosyayı okuma yetkisi vardır.

### Temel başarı akışı

1. Kullanıcı dosyayı seçer.
2. Sistem dosyayı salt okunur açmayı dener; bulunamayan dosya için yeni boş veritabanı oluşturmaz.
3. Sistem okunabilir SQLite yapısını ve şema bilgisini doğrular.
4. Kullanıcı tabloları, sütunlar ve tanımlı anahtarlar listelenir.
5. Açıklamaya uygun ve uygun olmayan kaynak tablolar ayırt edilir.
6. Kullanıcı bir tabloyu veya sorgu alanını açarak devam eder.

### Alternatif / hata akışları

- **A1 — Dosya bulunamadı veya yetki yok:** Dosya açılmaz; kullanıcıya nedeni gösterilir.
- **A2 — SQLite olmayan, bozuk veya desteklenmeyen dosya:** Açılış başarısızlığı bildirilir; dosya onarılmaya çalışılmaz.
- **A3 — Veritabanı kilitli:** Oturum açılmaz veya bilgi alınamayan aşama belirtilir; yeniden deneme sunulur.
- **A4 — Şifreli dosya:** İlk prototip desteklemiyorsa bu açıkça bildirilir.
- **A5 — Önceki veritabanından başka dosyaya geçiş:** Eski sorgu ve açıklamalar yeni veritabanıyla karıştırılmaz; önceki oturum kapatılır veya açıkça arşivlenmiş görünür.

### Son koşullar

Başarıda veritabanı açıktır ve şema görüntülenebilir. Başarısızlıkta kaynak dosyanın içeriği değişmez; boş dosya oluşturulmaz.

## 6. UC-02 — Şema ve kaynak kayıtları inceleme

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı bir tablo seçer.  
**Amaç:** Sorgu yazmadan önce verinin yapısını ve örnek kayıtlarını anlamak.

### Ön koşul

UC-01 başarıyla tamamlanmıştır.

### Temel başarı akışı

1. Kullanıcı bir tablo seçer.
2. Sistem sütun adlarını, veri türlerini ve tanımlı birincil/yabancı anahtarları gösterir.
3. Kayıtlar sayfalı gösterilir; görünen sayfanın kapsamı belirtilir.
4. Kullanıcı sütun ve hücre değerlerini inceler.
5. Kaynak kimliği destekleniyorsa kullanıcı bir kaydı sonraki sorgu incelemesinde odak olarak seçebilir.

### Alternatif akışlar

- Boş tablo, okunabilir ama kayıtsız olarak gösterilir.
- Açıklama kimliği olmayan tabloda normal veri inceleme devam eder; kaynak izleme sınırlaması belirtilir.
- Tanımlı foreign key yoksa ilişki varmış gibi çizilmez. Açık JOIN koşuluyla sorgu kurulabilmesi ayrı bir durumdur.
- Büyük veri doğrudan bütünüyle arayüze yüklenmez. Kayıt sayısı hesaplanmadıysa kesin sayı gösterilmez.

### Son koşul

Kullanıcı tablo yapısını ve görünen kayıtları incelemiştir. Kaynak dosyada değişiklik yapılmamıştır.

## 7. UC-03 — Sorguyu çalıştırma ve açıklama oturumu oluşturma

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı SQL yazıp çalıştırmayı seçer.  
**Amaç:** Sonuç ve onunla tutarlı inceleme verisi üretmek.

### Ön koşullar

- Bir veritabanı açıktır.
- Kullanıcının sorgusu girilmiştir.

### Temel başarı akışı

1. Kullanıcı SQL metnini girer.
2. Sistem UC-04 ile sözdizimini, kapsamı ve kaynak kimliklerini doğrular.
3. Sistem yeni bir açıklama oturumu kimliği oluşturur.
4. Sonuç, mantıksal ara sonuçlar ve kaynak bağlantıları aynı tutarlı veritabanı görünümünden hesaplanır.
5. Kullanıcı sorgu sonucu ve mevcut inceleme aşamalarını görür.
6. Oturumda kullanılan SQL, kaynak bağlamı ve tamamlanma durumu saklanır.
7. Kullanıcı UC-05, UC-06 veya UC-07 ile devam edebilir.

### Alternatif / hata akışları

- **A1 — Sözdizimi veya kapsam hatası:** UC-04 gerekçesi gösterilir; tam açıklama üretilmez.
- **A2 — Var olmayan tablo/sütun veya belirsiz sütun adı:** İlgili hata gösterilir; yanlış tablo/sütun tahmin edilmez.
- **A3 — Boş sonuç:** Başarılı ama sıfır satırlı sonuç gösterilir; kaynak kayıttan neden inceleme yolu erişilebilir kalır.
- **A4 — Kaynak/süre sınırı aşıldı:** Oturum tamamlanmamış olarak işaretlenir. Kısmi veriye dayalı kesin satır sayısı veya genel elenme hükmü verilmez.
- **A5 — Kullanıcı iptal etti:** İşlem durdurulur; önceki başarılı oturum geçerli kalır, yeni oturum iptal edilmiş görünür.
- **A6 — Veri başka uygulamada değişiyor:** Tek oturumda farklı anlardan alınmış sonuçlar karıştırılmaz. Tutarlı okuma sağlanamıyorsa inceleme başarısızlığı bildirilir.

### Son koşullar

Başarıda sonuç ve açıklamalar aynı oturuma aittir. SQL çalıştırma başarısız veya eksikse başarılı açıklama gibi gösterilmez. Kaynak veri değiştirilmez.

## 8. UC-04 — Sorgunun açıklama kapsamını doğrulama

**Birincil aktör:** UC-03'ü başlatan kullanıcı; kontrol otomatik uygulanır.  
**Amaç:** Yanlış açıklama üretmeden önce destek koşullarını doğrulamak.

### Temel akış

1. Sistem SQL'i yapısal olarak ayrıştırır.
2. Tek desteklenen SELECT deyimi olduğunu doğrular.
3. Kaynak tablolar ve takma adlar çözümlenir.
4. Açıklama için gereken kayıt kimliklerinin bulunduğu doğrulanır.
5. JOIN ve WHERE ifadelerinin desteklenen alt kümeye uygunluğu kontrol edilir.
6. Başarılıysa UC-03 devam eder.

### Alternatif akışlar

- `UPDATE`, `DELETE`, `INSERT`, DDL, ek deyimler ve açıklama dışı işlemler reddedilir.
- `GROUP BY` gibi kapsam dışı yapılar adlandırılarak bildirilir; sessizce kaldırılıp farklı sorgu çalıştırılmaz.
- Aynı tablonun birden çok kullanımında roller ayrıştırılamıyorsa açıklama reddedilir.
- Kaynak anahtarı eksikse şema değiştirme veya otomatik kimlik ekleme yapılmaz.
- İşlev veya ifade desteklenmiyorsa yalnız SELECT ile başlaması güvenilir kabul edilmez.

### Son koşul

Sorgu ya kapsam açısından kabul edilmiştir ya da kullanıcı hangi sınır nedeniyle devam edemediğini bilir. Kapsam onayı, sorgunun anlamsal olarak kullanıcının istediği soruyu yanıtladığını garanti etmez.

## 9. UC-05 — Mantıksal ara sonuçları inceleme

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı bir açıklama aşamasını seçer.  
**Amaç:** JOIN ve filtrelerin sonuç üzerindeki etkisini görmek.

### Ön koşul

Başarılı bir açıklama oturumu vardır.

### Temel başarı akışı

1. Sistem kaynaklar → JOIN aşamaları → WHERE → sütun seçimi biçiminde mantıksal açıklamayı sunar.
2. Kullanıcı bir aşamayı seçer.
3. İlgili SQL bölümü ve o aşamadaki ara kayıtlar gösterilir.
4. Kullanıcı önceki/sonraki aşamayla kayıt bağlantılarını takip eder.
5. WHERE aşamasında geçen ve elenen kayıtlar ayırt edilir; ilgili değer ve koşul gösterilir.

### Özel durumlar

- JOIN satır sayısını artırabilir, azaltabilir veya değiştirmeyebilir; her JOIN'in sayıyı artırdığı varsayılmaz.
- WHERE'de bir karşılaştırma NULL nedeniyle UNKNOWN üretiyorsa bu, FALSE ile aynı ifade sonucu gibi açıklanmaz. İkisi de filtreyi geçmez; nedenleri ayrı gösterilir.
- Birden fazla AND koşulu varsa açıklama, mantıksal koşulların sonuçlarını gösterir; motorun fiziksel kısa devre sırasını iddia etmez.
- Önceki aşamaya gidilmesi, veritabanının eski durumuna dönmek değil aynı açıklama oturumunu incelemektir.

### Son koşul

Kullanıcı bir işlemin hangi kayıtları eşleştirdiğini veya elediğini görebilir. Görüntülenen sayfa ile bütün ara sonuç ayrımı korunur.

## 10. UC-06 — Sonuç satırından kaynak kayıtlara gitme

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı sonuçtan bir satır seçer.  
**Amaç:** Sonuç satırının oluşumunu kaynak kayıtlarla açıklamak.

### Temel başarı akışı

1. Kullanıcı sonuç satırını seçer.
2. Sistem o satırın kaynak kayıt kimliklerini ve tablo rollerini bulur.
3. İlgili kaynak kayıtlar gösterilir veya vurgulanır.
4. JOIN koşullarında eşleşen sütun değerleri gösterilir.
5. WHERE varsa bu kayıt birleşiminin koşulu neden geçtiği açıklanır.
6. Kullanıcı başka sonuç satırını seçerek kaynak farkını inceleyebilir.

### Alternatif / özel durumlar

- Sonuçta görünen değerleri aynı olan iki satır, ayrı kaynak birleşimlerinden geliyorsa tek satır gibi birleştirilmez.
- Aynı kaynak kayıt birden fazla satıra katkıda bulunabilir; bu tek başına veri tekrarı veya SQL hatası sayılmaz.
- Satırın kaynak kimlikleri doğrulanamıyorsa tahmin üretilmez; inceleme tutarsızlığı gösterilir.

### Son koşul

Kullanıcı seçilen sonuç satırının hangi kaynak kayıt birleşiminden üretildiğini görür.

## 11. UC-07 — Kaynak kaydın sonucunu ve elenme nedenlerini inceleme

**Birincil aktör:** Kullanıcı  
**Tetikleyici:** Kullanıcı sorgudaki bir kaynak tablodan kayıt seçip sonucunu incelemek ister.  
**Amaç:** Bir kaydın neden görünmediğini veya kaç farklı sonuç satırına katkıda bulunduğunu anlamak.

### Ön koşullar

- Başarılı ve tamamlanmış bir açıklama oturumu vardır.
- Kaynak tablo rolü ve kayıt kimliği bilinmektedir.

### Temel başarı akışı

1. Kullanıcı tablo rolünü ve kaydı seçer.
2. Sistem kaydın ilk ilgili JOIN'deki eşleşmelerini bulur.
3. Bu kaydı taşıyan ara kayıt birleşimleri sonraki aşamalarda izlenir.
4. Nihai sonuç üreten dallar varsa bunlar ve katkıda bulunulan satır sayısı gösterilir.
5. Elenen dallar varsa eşleşme bulunmayan JOIN veya geçilemeyen WHERE koşulu gösterilir.
6. Kaydın bütün dalları elenmişse sistem bunun tek veya birden fazla nedenini açıklar.

### Örnek sonuçlar

- **Hiç ilk eşleşme yok:** “Mehmet'in `kayitlar` tablosunda `ogrenciler.id = kayitlar.ogrenci_id` koşulunu sağlayan kaydı yok.”
- **İlk eşleşme var, sonraki JOIN'de yok:** Öğrenci ders kaydına bağlanmış ama ilgili ders bulunamamıştır; açıklama ilk JOIN'de hata varmış gibi sunulmaz.
- **Filtrede elenme:** “Ayşe'nin bu ders kaydında not 45; `notu >= 60` FALSE.”
- **NULL nedeniyle elenme:** “Not NULL olduğu için `notu >= 60` TRUE olmadı.”
- **Kısmi katılım:** Ali'nin bir ders kaydı geçerken diğeri elenebilir. “Ali tamamen elendi” denmez; dallar ayrı gösterilir.
- **Birden çok sonuç:** Ali iki farklı ders kaydıyla eşleşmiştir; iki kaynak birleşimi görünür.

### Sınırlar

Sistem her kayıp sonuç için veritabanında olması gereken yeni kaydı veya doğru sorguyu otomatik bulmaz. Kullanıcı kaynakta bulunmayan bir kişi adı yazarsa bu, mevcut bir kaydın izlenmesiyle aynı problem değildir. Eksik bir değeri kimin eklemesi gerektiği veya JOIN'in kullanıcının niyetine uygunluğu hakkında hüküm verilmez.

### Son koşul

Kullanıcı seçilen kaynak kaydın sonuç katkısını ve gözlenen elenme noktalarını görür. Kayıt birden çok dal üretiyorsa açıklama bu dalları korur.

## 12. UC-08 — Sorguyu değiştirip önceki sonuçla karşılaştırma

**Öncelik:** İsteğe bağlı; zorunlu çekirdek tamamlandıktan sonra.  
**Birincil aktör:** Kullanıcı.

1. Kullanıcı başarılı sorguyu düzenler; örneğin not eşiğini değiştirir.
2. Sistem kapsamı yeniden doğrular ve yeni oturum oluşturur.
3. Aynı sabit veri görünümü üzerinde karşılaştırma sağlanabiliyorsa yeni gelen, kaybolan ve kalan kaynak birleşimleri gösterilir.
4. Eşik veya JOIN koşulu gibi değişen SQL bölümü vurgulanır.

**Alternatif:** Veri değişmişse veya aynı veri görünümü korunamıyorsa sonuç farkının yalnız sorgudan kaynaklandığı söylenmez. İki koşu bağımsız gösterilir veya sabit veri kopyasıyla tekrar istenir. `ORDER BY` desteği bulunmadığından fiziksel satır konumları fark ölçüsü değildir; tekrar sayıları ve kaynak birleşimleri dikkate alınır.

## 13. UC-09 — Açıklama raporunu dışa aktarma

**Öncelik:** İsteğe bağlı.  
**Birincil aktör:** Kullanıcı.

1. Kullanıcı açıklama oturumundan rapor oluşturmayı seçer.
2. SQL, destek kapsamı, aşama özetleri ve seçilmiş kaynak açıklamaları önizlenir.
3. Kullanıcı veri değerlerinin dahil olup olmayacağını seçer.
4. Rapor yerel dosyaya kaydedilir; kaynak veritabanı değiştirilmez.

Görünür sayfa veya örnekler dışa aktarılıyorsa rapor bunu belirtir. Çalışmamış veya tamamlanmamış açıklama tam sonuç olarak sunulmaz. PDF üretimi ilk sürümün zorunlu özelliği değildir.

## 14. Örnek uçtan uca senaryo

### Kaynak veriler

**ogrenciler**

| id | ad |
|---|---|
| 1 | Ali |
| 2 | Ayşe |
| 3 | Mehmet |

**dersler**

| id | ad |
|---|---|
| 10 | Matematik |
| 20 | Fizik |

**kayitlar**

| id | ogrenci_id | ders_id | notu |
|---|---|---|---|
| 101 | 1 | 10 | 80 |
| 102 | 1 | 20 | 75 |
| 103 | 2 | 10 | 45 |

### Sorgu

```sql
SELECT ogrenciler.ad, dersler.ad AS ders, kayitlar.notu
FROM ogrenciler
JOIN kayitlar ON ogrenciler.id = kayitlar.ogrenci_id
JOIN dersler ON dersler.id = kayitlar.ders_id
WHERE kayitlar.notu >= 60;
```

### Beklenen mantıksal gözlemler

- Öğrenciler ile kayıtların JOIN'i: Ali için iki, Ayşe için bir eşleşme; Mehmet için eşleşme yok.
- Dersler JOIN'i: Bu örnekte üç ara kayıt da ders tablosunda eşleşir.
- WHERE: 80 ve 75 geçer, 45 elenir.
- Sonuç: Ali–Matematik–80 ve Ali–Fizik–75. ORDER BY olmadığı için satırların fiziksel sırası kabul ölçütü değildir.
- İlk sonuç satırının kaynakları: öğrenci 1, kayıt 101 ve ders 10.
- İkinci sonuç satırının kaynakları: öğrenci 1, kayıt 102 ve ders 20.

### Kullanım senaryosu akışı

UC-01 dosyayı aç → UC-02 tabloları incele → UC-03 sorguyu çalıştır ve UC-04 doğrulamasını geç → UC-05 JOIN/WHERE aşamalarını gör → UC-06 Ali'nin bir sonuç satırının kaynaklarını gör → UC-07 Mehmet'in eşleşmediğini ve Ayşe'nin filtrede elendiğini incele.

## 15. Temel iş kuralları

1. Kaynak veritabanında veri veya şema değişikliği yapılmaz.
2. Her başarılı açıklama oturumu SQL, sonuç, ara kayıtlar ve kaynak bağlantılarını aynı veri görünümüne bağlar.
3. Desteklenmeyen sözdizimi sessizce değiştirilmez veya kısmen açıklanmaz.
4. Aynı görünen değerler kaynak kimliği yerine kullanılamaz; ayrı satırların tekrar sayısı korunur.
5. Tablo takma adları kaynak rollerinin parçasıdır.
6. JOIN bağlantıları açık ON koşuluna dayanır; foreign key bulunması zorunlu değildir.
7. WHERE yalnız TRUE üreten birleşimleri geçirir. FALSE ile UNKNOWN aynı nedenmiş gibi açıklanmaz.
8. Bir kaydın farklı dalları farklı aşamalarda elenebilir; tek genel neden zorlanmaz.
9. Kaynak/süre sınırında tamamlanmamış sonuç açıkça işaretlenir.
10. Sayfalama, tam sonuç hakkında yanlış toplam veya eksiklik açıklaması üretmez.
11. SQL motorunun fiziksel yürütme sırası ile mantıksal açıklama ayrı tutulur.
12. İlk sürüm açıklamaları gerçek değerler ve kurallardan üretilir; dil modeli zorunlu değildir.

## 16. Ölçülebilir kabul ölçütleri

| Kimlik | Ölçüt | Doğrulama örneği |
|---|---|---|
| AC-01 | Geçerli SQLite dosyası salt okunur açılır | Aç/kapat ve sorgu işlemleri kaynak içeriğini değiştirmez |
| AC-02 | Dosya yoksa yeni dosya oluşturulmaz | Olmayan yol için hata döner |
| AC-03 | Destek kapsamı dışı sorgu anlaşılır nedenle reddedilir | GROUP BY, UPDATE veya ikinci deyim |
| AC-04 | Örnek sorgu iki doğru sonuç birleşimini üretir | Bölüm 14 verileri |
| AC-05 | JOIN eşleşmeleri ve filtre sonuçları doğru gösterilir | Ali iki eşleşme; Ayşe not filtresi; Mehmet eşleşme yok |
| AC-06 | Sonuçtan kaynak kayıtlara iz doğru kurulur | Ali–Matematik için 1/101/10 kaynakları |
| AC-07 | Aynı değerli sonuç satırları ayırt edilir | Ayrı kayıt kimlikleriyle aynı görünen çıktı |
| AC-08 | NULL filtre sonucu doğru açıklanır | `notu` NULL satırında `>= 60` UNKNOWN |
| AC-09 | Birden çok JOIN'de elenme doğru aşamaya bağlanır | Öğrenci kaydı var, ders eşleşmesi yok |
| AC-10 | Kısmi katılım korunur | Aynı öğrencinin geçen ve elenen iki ders kaydı |
| AC-11 | Boş sonuç inceleme hatası sayılmaz | Tüm kayıtları eleyen filtre |
| AC-12 | Kimlik veya yetki eksikliğinde kaynak uydurulmaz | Açıklama kimliği desteklenmeyen tablo |
| AC-13 | İptal veya sınır aşımı başarı gibi sunulmaz | Tamamlanmamış açıklama durumu |
| AC-14 | Aşama görünümü fiziksel yürütme iddiası taşımaz | Arayüz ve rapordaki açıklama |

Kabul ölçütlerinin güncel kanıtları [doğrulama kaydında](../VERIFICATION.md) listelenir. Kaynak izinin doğruluğu yalnız ekrandaki metinle değil, bağımsız beklenen kayıt kimlikleriyle denetlenmelidir.

## 17. Akademik değerlendirme senaryosu

**Araştırma sorusu:** Kaynak kayıt bağlantıları ve elenme açıklamaları, yalnız sonuç tablosu gösteren arayüze göre sorgu sonucunu anlamayı kolaylaştırıyor mu?

Katılımcılara eşdeğer veri kümelerinde benzer görevler verilebilir:

- Bir kaydın neden birden çok kez göründüğünü açıklama.
- Bir kaydın JOIN mi WHERE mi nedeniyle görünmediğini bulma.
- Bir sonuç satırının kaynak kayıtlarını belirleme.
- Filtre eşiği değişince hangi kayıtların etkilenmesini beklediğini söyleme.

Doğru cevap oranı, görev süresi ve kullanıcı değerlendirmesi ölçülür. Arayüz kullanım sırası ve görev eşleştirmesi dengelenir. Küçük pilotun sonuçları geniş kullanıcı kitlesi için kesin kanıt gibi sunulmaz. Kullanıcı araştırması, uygulamanın SQL ve kaynak izleme doğruluğu testlerinin yerine geçmez.

Akademik dayanak: [SQLucid, UIST 2024 açık sürümü](https://arxiv.org/abs/2409.06178). Proje bu alanda ilk olma iddiası taşımaz; SQLite ve sınırlı SQL alt kümesinde, kayıt odaklı açıklamanın uygulanması ve değerlendirilmesi hedeflenir.

## 18. Sunum için kısa demo akışı

1. Öğrenci veritabanını aç ve tabloları göster.
2. Bölüm 14 sorgusunu çalıştır.
3. “Ali neden iki kez çıktı?” sorusunu kaynak bağlantılarıyla yanıtla.
4. “Ayşe neden yok?” sorusunu not filtresiyle açıkla.
5. “Mehmet neden yok?” sorusunu JOIN eşleşmesizliğiyle açıkla.
6. NULL not veya sonraki JOIN'de eksik ders gibi ikinci bir örnekle açıklama ayrımlarını göster.
7. Desteklenmeyen bir sorgunun yanlış açıklama üretmeden reddedildiğini göster.
8. Kullanıcı çalışması yapılmışsa sonuçlarını ve örneklem sınırlarını sun; yapılmadıysa yapılmış gibi anlatma.

## 19. Altı haftalık önceliklendirme

| Dönem | Öncelikli senaryolar | Somut çıktı |
|---|---|---|
| 1. hafta | UC-01, UC-02 ve UC-04 temeli | Açılan örnek dosya, şema/veri ve net sözdizimi sınırı |
| 2. hafta | UC-03 ve UC-06 ilk dikey akış | Tek JOIN sonucundan doğru kaynak kayıtlarına gitme |
| 3. hafta | UC-05 | JOIN ve WHERE ara sonuçları |
| 4. hafta | UC-07 | Eşleşmeyen, elenen ve kısmen kalan kayıtların açıklaması |
| 5. hafta | AC doğrulamaları ve arayüz | NULL, tekrar, çoklu JOIN, hata ve sınır durumları |
| 6. hafta | Değerlendirme ve sunum | Pilot çalışma, rapor, kurulum yönergesi ve demo |

UC-08 ve UC-09 yalnız çekirdek senaryolar doğrulandıktan sonra eklenir. İkinci hafta sonunda sonuçtan kaynağa gitme çalışmıyorsa ek SQL özellikleri ve dışa aktarma ertelenir. Ekip büyüklüğü ve çalışma saatleri bilinmediği için bu tablo kesin teslim taahhüdü değildir.

## 20. Kaynaklar ve belge sınırı

- [SQLite SELECT semantiği](https://sqlite.org/lang_select.html): JOIN, WHERE ve mantıksal açıklama ile fiziksel yürütme ayrımı.
- [SQLucid: Grounding Natural Language Database Queries with Interactive Explanations](https://arxiv.org/abs/2409.06178): Akademik bağlam.

Bu belge kullanım davranışlarını ve kabul koşullarını tanımlar. Güncel teknoloji yığını ve kurulum README içinde, gerçekleşen kabul kontrolleri doğrulama kaydında tutulur. İlk sürüm kaynak veritabanını değiştirmez. Kullanıcı değerlendirmesi ve isteğe bağlı sonraki özellikler, uygulanmış çekirdekle karıştırılmamalıdır.
