# TraceQuery doğrulama durumu

**Tarih:** 3 Kasım 2026. **Sonuç:** Backend/parser/HTTP ve üretim derlemesi doğrulandı; gerçek tarayıcı akışı henüz kanıtlanmadı.

## Güncel koşular

| Kontrol | Sonuç |
|---|---|
| Gerçek SQLite çekirdek unittest suite | 28 başarılı |
| Gerçek SQLite ile asenkron bağlantı-kopması suite | 2 başarılı |
| Projenin .venv ortamında tüm backend testleri | 54 başarılı, atlama yok; 1 bağımlılık deprecation uyarısı |
| Python compileall | Başarılı |
| git diff --check | Başarılı |
| scripts/verify.sh | 54 backend testi ve build geçti; Playwright sunucusu TCP dinleme engelinde durdu; hata kodu/log korundu |
| npm run build | TypeScript kontrolü ve Vite üretim derlemesi başarılı |
| Playwright | 6 senaryo listelendi/derlendi; gerçek tarayıcıda çalıştırılmadı |

Önceki paket engeli kullanıcı terminalinde kurulumla kalktı. SQLGlot 29.0.1 ve FastAPI 0.162.0 ile gerçek ayrıştırıcı/HTTP testleri artık çalışıyor. Arayüzün tip kontrolü ve derlemesi geçse de ekran görünümü ve kullanıcı etkileşimleri Chromium ile henüz doğrulanmadı. TestClient'ın httpx için verdiği deprecation uyarısı testleri başarısız kılmıyor.

Standart kütüphane kontrolleri:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_core.py -v
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_execution.py -v
python -m compileall -q backend
```

## Kabul ölçütleri denetimi

Test adları `backend/tests/test_core.py` içinde; iptal orkestrasyonu `backend/tests/test_execution.py` içinde bulunur. Çekirdek ve HTTP kanıtları aşağıda ayrılır; arayüz sütunundaki bekleyen işler henüz tamamlandı sayılmaz.

| Ölçüt | Mevcut doğrudan kanıt | Kalan doğrulama |
|---|---|---|
| AC-01 Salt okunur veri | Çekirdek byte kontrolü + gerçek HTTP yüklemesinde orijinal/kopya byte karşılaştırması ve kapanış temizliği | Gerçek tarayıcı dosya yükleme |
| AC-02 Olmayan dosya yaratılmaz | `test_missing_file_does_not_get_created` | Çekirdek davranış kanıtlandı |
| AC-03 Kapsam dışı SQL reddi | Gerçek SQLGlot testleri ve HTTP DELETE reddi geçti | Tarayıcı hata görünümü |
| AC-04 Örnek sonuç | Gerçek SQLite çekirdeği, parser ve HTTP demo testleri geçti | Tarayıcı sonuç tablosu |
| AC-05 JOIN/WHERE ayrımı | Aynı örnekte 3/4/4/2 aşama sayıları; Mehmet JOIN, Ayşe WHERE | Ekranda gerçek akış |
| AC-06 Doğru kaynak izi | Çekirdek/parser ve HTTP demo 1/101/10 kaynağı; yüklenen dosyada products:7 | Tarayıcı kaynak kartı |
| AC-07 Aynı değerli satırlar | Ayrı kaynak kimlikli iki Ali; 80/75 filtre operandları korunur | Tarayıcı satır seçimi |
| AC-08 NULL ayrımı | Gerçek parser ve çekirdekte NULL not UNKNOWN, 45 not FALSE | Arayüz |
| AC-09 Sonraki JOIN kaybı | `test_later_join_keeps_a_surviving_branch_and_explains_the_lost_one`: 102 kaydı JOIN 2'de kaybolur | API/tarayıcı |
| AC-10 Kısmi katılım | Aynı testte Ali'nin bir sonucu kalır; kayıp dal ayrı saklanır | Tarayıcı yolculuk görünümü |
| AC-11 Boş sonuç | Çekirdek ve gerçek parser sıfır sonuç testleri geçti; kayıt izleri korunuyor | API/tarayıcı sıfır sonuç görünümü |
| AC-12 Kimlik uydurulmaz | Anahtarsız/nullable/tekrarlı/büyük anahtar çekirdek testleri; gerçek parser reddi; register geçersiz örnek sunmaz | UI uyarısı |
| AC-13 İptal/sınır başarısızlığı | Kaynak sınırı ve küçük kaynaklardan 9 birleşime büyüyen JOIN sınırı, önceden iptal, çalışan SQLite iptali, çalışan sorguda süre sınırı, gerçek worker temizliği | Tarayıcıdan HTTP kopmasıyla bütün hat |
| AC-14 Mantıksal açıklama | Motor uyarısı ve UI metni mevcut | Gerçek ekran kontrolü |

## Ek çekirdek kanıtları

- Her başarılı açıklama farklı oturum kimliği, `status: complete` ve kullanılan SQL'i taşır. Aynı sorgunun kaynak sonuçları değişmez.
- AND koşullarının operandları ve ayrı TRUE/FALSE/UNKNOWN değerleri SQLite tarafından hesaplanır; Python SQL karşılaştırma semantiğini taklit etmez.
- Sonuç ve WHERE aşamasında geçen satırın filtre değerleri gösterim için taşınır. Önceki aşamalara sonraki filtre sonucu eklenmez.
- Self-JOIN rolleri ayrı tutulur; 10 alias için aşama sayımları ve katkılar kontrol edilir.
- BLOB JSON için hex'e, JS aralığı dışı normal hücre tamsayıları metne çevrilir; kaynak kimlikleri için aynı değerler açıklamayı reddettirir.
- Asenkron test ortamında çıplak `asyncio.to_thread` ile de kapanış beklemesi yeniden üretildi. Yalnız test temizliğinde küçük bir loop zamanlayıcısı kullanılır; gerçek SQLite çalışması taklit edilmez.

## Kurulum ve gerçek ekran doğrulaması

Paketler kuruldu. Kalan ortam kısıtı, bu oturumda TCP soketi oluşturmanın `Operation not permitted` ile engellenmesi: gerçek Uvicorn yaşam döngüsü başlıyor, 127.0.0.1:8000 dinleme aşaması başarısız oluyor. Ayrıca Computer Use tarayıcı erişim sunucusu mevcut değil. Paket/ürün kodunu değiştirerek bu kısıt aşılmaya çalışılmadı.

TestClient portalının aynı ortamdaki thread uyanma sorunu, küçük bir gerçek Starlette uygulamasında üretildi. Asenkron testlerdeki gibi test loop'una periyodik uyanma eklenince gerçek TestClient + HTTP + SQLite akışı tamamlandı. Ürün koduna sahte istek veya sonuç eklenmedi; testler atlanmadı.

Kullanıcının normal terminalinde Chromium kurulumu tamamlanınca proje kökünde `./scripts/verify.sh` çalıştırılmalı. Bu komut tüm backend testlerini, üretim derlemesini ve bu derlemeyi sunan gerçek API üzerinden altı Playwright senaryosunu koşar; çıktıyı `.artifacts/verification/latest.log` dosyasına yazar. Testler demo, kaynaklar, JOIN/WHERE kaybı, yazma reddi, şema, boş sonuç, eski SQL bağlamı ve gerçek SQLite dosya yüklemesini kapsar. Başarılı/başarısız ekran örnekleri `frontend/test-results/` içinde incelenebilir.

Uygulama `./scripts/start.sh` ile tek yerel portta açılır. Script bağımlılıkları kontrol eder, arayüzü derler ve Uvicorn'a geçer. Bu ortamda bash sözdizimi, eksik bağımlılık mesajı, derleme ve Uvicorn startup doğrulandı; başarılı TCP dinlemesi burada kanıtlanmadı.

Yeni kayıt regresyonları önce başarısız oldu: yüklenen dosyada yanlış öğrenci tablosu örneği ve anahtarsız tabloda geçersiz örnek önerisi. Düzeltme sonrası kendi dosyasından seçilen sorgu gerçek SQLGlot/SQLite ile geçti. Gerçek HTTP yükleme/kopya/temizlik ve 10 MB sınırı testleri de başarılı.

Kullanıcı araştırması yapılmadı. UC-08 karşılaştırma ve UC-09 dışa aktarma, belgeye göre isteğe bağlıdır ve çekirdek tarayıcıda doğrulanmadan eklenmedi. Doğal dil desteği sonraki aşamadır.

## İsteklerin çakışmasını önleme

Arayüzde bütün ağ işlemleri aynı anda yalnız bir işlem kabul eden ref ile korunur. Sorgu sırasında kaynak tablo sekmesi de pasiftir. AbortController yalnız kabul edilen sorguya aittir; ikinci bir çağrı mevcut iptal bağlantısını silemez. Bu, eski veritabanının açıklamasının yeni bağlamla karışmasını önler.

Ek tarayıcı senaryosu, ikinci açıklama isteğini gönderilmeden tutup iptal eder; eski sonuç/SQL'in korunmasını ve tablo gezintisinin engellenmesini kontrol eder. Bu test frontend iptalini sınar; çalışan SQLite worker'ının kesilmesi ayrı gerçek backend testleriyle doğrulanır. Altı tarayıcı senaryosu henüz çalıştırılmadı. Son arayüz build'i ve test keşfi başarılı.
