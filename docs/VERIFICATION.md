# TraceQuery Doğrulama Kaydı

3 Kasım 2026. Kaynak: mevcut çalışma ağacı ve bu oturumdaki komut çıktıları.

## Çalıştırılanlar

- `PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_core.py -v`: 16 test başarılı.
- Yerelde sağlam bulunan pytest paketiyle aynı suite: 16 başarılı, 2 modül atlandı.
- `python -m compileall -q backend`: başarılı.
- `git diff --check`: başarılı.

## Henüz doğrulanmayanlar

- SQLGlot ayrıştırıcısı: paket kurulu değil; ilgili test modülü atlandı.
- FastAPI uçları ve dosya yükleme: bağımlılıklar yok; ilgili modül atlandı.
- TypeScript kontrolü ve Vite derlemesi: npm paketleri indirilemiyor.
- Playwright tarayıcı testleri: hazırlandı, çalıştırılmadı.

PyPI kurulumu paket bulamama/ağ erişimi hatasıyla, npm kurulumu `EAI_AGAIN registry.npmjs.org` ile başarısız oldu. Projedeki doğrulama gereksinimleri azaltılmadı: `scripts/verify.sh` bütün katmanları koşmak üzere hazırlandı.

## Kullanım senaryosu ile eşleme

| Alan | Mevcut kanıt | Açık iş |
|---|---|---|
| SQLite salt okunur erişim, dosya oluşturmama | Gerçek SQLite çekirdek testleri | HTTP yükleme testi |
| Şema, PK/FK ve sayfalama | Gerçek SQLite çekirdek testleri | Tarayıcı görünümü |
| SQL kapsam doğrulaması | Statik kod ve test tanımları | SQLGlot ile gerçek koşu |
| JOIN/WHERE kaynak bağlantıları | Tekrarlı satır, alias ve NULL testleri | AST'den uçtan uca doğrulama |
| Gerçek kaynak hücrelerinin gösterimi | API çıktı modelinin çekirdek testleri | React render testi |
| AND koşulları ve operand değerleri | FALSE/UNKNOWN ve değer testleri | Parser + UI uçtan uca |
| Elenmenin ilk aşaması | Ali/Ayşe/Mehmet çekirdek testi | Çoklu JOIN dal çeşitleri |
| BLOB, generated sütun ve büyük kimlik sınırı | Çekirdek regresyon testleri | HTTP JSON testi |
| Kaynak sınırında açıklamayı durdurma | Satır sınırı testi | Süre ve istemci iptal akışı |
| Kullanıcı araştırması | Yok | Ürün doğrulandıktan sonra pilot |

İsteğe bağlı karşılaştırma/dışa aktarma ve sonraki doğal dil modülü henüz uygulanmadı. Bu kayıt bitiş veya üretime hazır olma iddiası değildir.

Bağımsız ikinci inceleme, kaynak kayıt/filtre payloadları ve frontend tiplerini kontrol etti; çekirdek 16 test ayrıca tekrar geçti. Sayfalama offset taşması regresyonla düzeltildi; SELECT takma adının WHERE/ON içinde kullanılması destek sınırı olarak belgelendi. Tarayıcı testlerinin çalıştırılmadığı sınırı değişmedi.

## Sorgu iptal çekirdeği

- `threading.Event` ile önceden iptal edilmiş sorgu reddi ve SQLite progress handler üzerinden çalışan sorgunun kesilmesi eklendi.
- Süre bütçesi dolduğunda kısmi başarı yerine anlaşılır hata veriliyor.
- Üç yeni gerçek SQLite testiyle toplam 19 çekirdek testi geçti. HTTP kopması ve arayüz iptal düğmesi bu adımda henüz bağlı değil.

## HTTP iptal orkestrasyonu ve arayüz bağlantısı

- ASGI bağlantı kopması callback'i bounded SQLite worker'ına iptal iletir; bağlantı kapanmadan worker sonlandırılır.
- React iptal düğmesi AbortController kullanır; önceki başarılı açıklama korunur.
- Orkestrasyonda bağlı istemci sonucu ve kopan istemcide gerçek SQLite kesilmesi için iki ek test geçti. Toplam 22 test başarılı, bağımlılıklar eksik olduğu için 2 modül atlandı.
- Sandbox'ta çıplak `asyncio.to_thread` örneğinde de Python runner kapanışının beklediği yeniden üretildi. Yalnız asenkron testlerin temizliğinde küçük bir event-loop zamanlayıcısı kullanıldı; ürün koduna bu ortam için sahte çalışma yolu eklenmedi.
- Tam HTTP/browser iptal hattı, paket kurulumu engeli nedeniyle hâlâ doğrulanmadı.

## Python sayım bütçesi ve çoklu JOIN

- Tek süre bütçesi SQLite işlemlerini ve Python kaynak/aşama sayımlarını kapsıyor. Kaynak katkıları tekrar tarama yerine aşama başına sayaçlarla hesaplanıyor.
- 1.000 kaynak satırı / 10 alias yerel denemesi 0,183 saniyede tamamlandı; 1.000 sonuç ve 10.000 kaynak katkısı doğrulandı. Bu tek örnek genel performans garantisi değildir.
- Bağımsız inceleme aynı örneği 0,176 saniyede tamamladı; 10 ms sonra gönderilen iptal sinyalinin açıklamayı durdurduğunu da doğruladı.
- Son koşu: 20 çekirdek + 2 asenkron orkestrasyon testi başarılı; SQLGlot ve FastAPI modülleri bağımlılık yokluğu nedeniyle atlandı. Python compileall ve git diff --check başarılı.

## Geçen satırın filtre açıklaması

- UC-06 için nihai sonuçta ve WHERE aşamasında, seçilen kaynak birleşiminin koşul sonuçları ve operand değerleri taşınıyor. Önceki aşamalara gelecekteki filtre sonucu eklenmiyor.
- Aynı görünen iki Ali satırının ayrı kaynak notlarını (80 ve 75) koruyan test önce `KeyError: checks` ile başarısız oldu; uygulamadan sonra geçti.
- Son pytest koşusu: 23 başarılı, bağımlılık eksikliğiyle 2 modül atlandı. API ve Playwright kontrollerine yeni alanlar için beklentiler eklendi; bu iki katman henüz çalıştırılmadı.
