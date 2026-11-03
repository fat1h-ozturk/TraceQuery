# TraceQuery doğrulama durumu

**Tarih:** 3 Kasım 2026. **Sonuç:** İlk yerel SQLite sürümü uçtan uca doğrulandı. Son `./scripts/verify.sh` koşusu çıkış kodu 0 ile tamamlandı.

## Son koşu

| Kontrol | Sonuç |
|---|---|
| Backend: SQLite motoru, SQLGlot, FastAPI, iptal orkestrasyonu | 58 başarılı, atlama yok |
| TypeScript kontrolü ve Vite üretim derlemesi | Başarılı |
| Gerçek Chromium + üretim HTTP sunucusu | 8 başarılı |
| Python compileall, bash sözdizimi, git diff --check | Başarılı |
| scripts/start.sh | Üretim arayüzünü derledi, 127.0.0.1:8000 üzerinde sunucu açtı |
| Canlı sunucu kontrolü | Ana HTML ve iki derleme asset'i HTTP 200; demo/explain HTTP 200, tamamlanmış 2 sonuç |

Tam koşunun çıktısı `.artifacts/verification/latest.log` içindedir. Chromium sonuçları ve dört ekran görüntüsü `frontend/test-results/` altında oluşur. Bu geçici çıktılar Git'e eklenmez ve sonraki test koşusunda yenilenebilir. Kaynak testler ve bu doğrulama kaydı sürüm kontrolündedir.

## Gerçek tarayıcı senaryoları

`frontend/e2e/tracequery.spec.ts`, aynı üretim derlemesini gerçek FastAPI sunucusundan açar. API sonuçları taklit edilmez. Üç dosya fixture'ı gerçek sqlite3 ile üretilir.

1. Öğrenci demosu: gerçek kaynak hücreleri, Mehmet'in JOIN 1 kaybı, Ayşe'nin FALSE ve UNKNOWN dalları.
2. DELETE girişimi: anlaşılır ret ve kaynak öğrencilerin korunması.
3. Şema: gerçek foreign key hedefleri ve başarılı sıfır sonuç.
4. SQL düzenleme: son başarılı sonuçların bağlı olduğu SQL'in korunması ve yeni koşuda güncellenmesi.
5. SQLite yükleme: boşluk/slash içeren tablo, geçerli örnek sorgu, kaynak kartı, tablo gezintisi ve orijinal dosya byte karşılaştırması.
6. İptal: bekleyen isteğin iptali, önceki sonuç/SQL'in korunması ve eşzamanlı tablo işleminin engellenmesi.
7. Tekrarlı sonuç/kısmi kayıp: aynı görünen iki Ali satırının 101/80 ve 102/75 kaynaklarının korunması; JOIN ara sonucu; sonraki JOIN'de yalnız 102 dalının kaybı ve Ali'nin kalan katkısı.
8. Anahtarsız tablo: veri okunur, uygun olmayan açıklama işlemi devre dışı kalır ve şema sınırlaması görünür.

Demo FALSE/UNKNOWN ve kısmi JOIN ekran görüntüleri görsel olarak incelendi; kayıt değerleri, aşama sayıları ve elenme açıklamaları test beklentileriyle tutarlı.

## Kabul ölçütleri

| Ölçüt | Doğrudan kanıt |
|---|---|
| AC-01 Salt okunur veri | Çekirdek/HTTP orijinal ve kopya byte kontrolü; Chromium yükleme testi; HTTP kapanışında geçici kopya temizliği |
| AC-02 Olmayan dosya yaratılmaz | `test_missing_file_does_not_get_created` |
| AC-03 Kapsam dışı SQL reddi | Gerçek SQLGlot kapsam testleri, HTTP DELETE reddi, Chromium ret + kaynakların korunması |
| AC-04 Örnek sonuç | Ali/Matematik/80 ve Ali/Fizik/75 için çekirdek/parser/HTTP ve Chromium demo |
| AC-05 JOIN/WHERE ayrımı | 3/4/4/2 aşama sayıları; Chromium JOIN ara tablosu ve demo elenme açıklamaları |
| AC-06 Doğru kaynak izi | 1/101/10 ve 1/102/20 çekirdek bağlantıları; Chromium kaynak hücreleri |
| AC-07 Aynı değerli satırlar | Aynı görünen iki Ali satırından ayrı 101/80 ve 102/75 kaynaklarına gerçek tarayıcı seçimi; fiziksel sıra varsayılmaz |
| AC-08 NULL ayrımı | SQLite/parser testleri; Chromium'da 45/FALSE ve NULL/UNKNOWN |
| AC-09 Sonraki JOIN kaybı | Gerçek SQLite ve Chromium: 102 kaydı JOIN 2'de elenir, JOIN 1'e yanlış bağlanmaz |
| AC-10 Kısmi katılım | Ali'nin 1 sonucu kalırken 102 dalı ayrıca gösterilir; çekirdek ve Chromium |
| AC-11 Boş sonuç | Çekirdek/parser ve Chromium sıfır sonuç; kayıt izi erişimi korunur |
| AC-12 Kimlik uydurulmaz | Anahtarsız/nullable/tekrarlı/büyük kimlik reddi; generated sütun testi; Chromium anahtarsız tablo uyarısı |
| AC-13 İptal/sınır başarı sayılmaz | Kaynak ve büyüyen JOIN sınırı; çalışan SQLite süre/iptal testleri; worker temizliği; Chromium eski sonucun korunması |
| AC-14 Mantıksal açıklama | Motor uyarısı, README ve gerçek ekranın fiziksel yürütme iddiası taşımayan açıklaması |

## İnceleme ve düzeltmeler

- Bağımsız kod incelemelerinde bulunan NULL/tekrarlı kaynak kimliği, JS aralığı dışı kimlik, BLOB ve generated sütun sorunları gerçek başarısız testlerle giderildi.
- Python kaynak sayımının süre bütçesi ve maliyeti ortak bütçe/aşama sayaçlarıyla düzeltildi; 10 alias sayımları kontrol edilir.
- Yüklenen dosyaya öğrenci sorgusu önerme hatası giderildi; dosyanın kendi PK'li tablosu seçilir. Uygun tablo yoksa geçersiz örnek sunulmaz.
- Slash/nokta/soru işareti içeren tablo adlarının gezintisi query parametresiyle düzeltilip dört gerçek HTTP testiyle doğrulandı. Eski URI yolu da korunur.
- İki Chromium seçici hatası, gerçek başarısız koşu ardından hedefi daraltılarak düzeltildi: 60 etiketinden hücre değeri ayrılır; tablo düğmesi sol gezintiyle sınırlandırılır.
- README geliştirme komutu açık Uvicorn komutuyla güncellendi. Çalışma mevcut geliştirme dalında tutulur; merge/push yapılmadı.

## Sınırlar

Bu doğrulama, README'de belirtilen yerel SQLite ve SELECT/eşitlik INNER JOIN/basit WHERE kapsamını kapsar. Sorgu açıklaması tek sütunlu güvenli INTEGER PRIMARY KEY gerektirir; kaynak/ara sonuç 1.000 satır, dosya 10 MB ve hesaplama yaklaşık 5 saniye ile sınırlıdır. Çok kullanıcılı veya genel internete açık dağıtım doğrulanmadı.

Tarayıcı iptal senaryosu isteği gönderilmeden bekletip iptal eder. Çalışan SQLite işinin gerçekten durması ayrı backend testinde gerçek sorguyla doğrulanır; tarayıcı senaryosu tek başına çalışan sorgunun TCP kopmasıyla kesildiği iddiası değildir.

TestClient'ın httpx için verdiği deprecation uyarısı kalıyor; testlerde hata veya atlama yok. Önceki kısıtlı ortamda thread uyanması kaybolduğu için test event loop'larında küçük bir zamanlayıcı kullanılır; ürün akışı ve gerçek HTTP/SQLite çalışması değiştirilmez. Kullanıcının izin değişikliği sonrası yerel sunucu ve Chromium burada çalıştırılabildi.

Kullanıcı araştırması yapılmadı ve eğitim başarısında ölçülmüş bir artış iddia edilmiyor. Doğal dil → SQL, UC-08 karşılaştırma ve UC-09 rapor dışa aktarma uygulanmadı; bunlar ilk çekirdek sürümün dışında kalan sonraki çalışmalardır.
