# TraceQuery doğrulama durumu

**Tarih:** 3 Kasım 2026. **Sonuç:** SQLite çekirdeği doğrulandı; uygulamanın uçtan uca tamamlandığı henüz kanıtlanmadı.

## Güncel koşular

| Kontrol | Sonuç |
|---|---|
| Gerçek SQLite çekirdek unittest suite | 25 başarılı |
| Gerçek SQLite ile asenkron bağlantı-kopması suite | 2 başarılı |
| Yerelde mevcut sağlam pytest ile tüm test keşfi | 27 başarılı, 2 modül atlandı |
| Python compileall | Başarılı |
| git diff --check | Başarılı |
| scripts/verify.sh | Başarısız: FastAPI kurulu değil |
| npm run build | Başarısız: tsc kurulu değil |
| Playwright | 4 senaryo hazır; çalıştırılmadı |

Atlananlar iki test vakası değil, SQLGlot ve FastAPI gerektiren iki test modülüdür. Dolayısıyla 27 başarılı test, parser veya HTTP katmanı hakkında başarı kanıtı sayılmaz. TypeScript/Vite derlemesi ve React ekranları da doğrulanmadı.

Standart kütüphane kontrolleri:

```bash
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_core.py -v
PYTHONPATH=backend python -m unittest discover -s backend/tests -p test_execution.py -v
python -m compileall -q backend
```

## Kabul ölçütleri denetimi

Test adları `backend/tests/test_core.py` içinde; iptal orkestrasyonu `backend/tests/test_execution.py` içinde bulunur. “Çekirdek kanıtı” API/parser/arayüzün aynı davranışı gösterdiği anlamına gelmez.

| Ölçüt | Mevcut doğrudan kanıt | Kalan doğrulama |
|---|---|---|
| AC-01 Salt okunur veri | Kaynak dosyanın açıklama ve önceden iptal sonrası byte karşılaştırması | HTTP yüklenen kopyanın akışı |
| AC-02 Olmayan dosya yaratılmaz | `test_missing_file_does_not_get_created` | Çekirdek davranış kanıtlandı |
| AC-03 Kapsam dışı SQL reddi | AST izin listesi ve parser testleri yazılı | SQLGlot ile koşu eksik |
| AC-04 Örnek sonuç | `test_demo_matches_the_reference_result_and_exact_source_combinations`: Ali/Matematik/80 ve Ali/Fizik/75 | SQL metninden parser + API uçtan uca |
| AC-05 JOIN/WHERE ayrımı | Aynı örnekte 3/4/4/2 aşama sayıları; Mehmet JOIN, Ayşe WHERE | Ekranda gerçek akış |
| AC-06 Doğru kaynak izi | Sonuç kaynakları 1/101/10 ve 1/102/20; kaynak kartı gerçek değerleri | HTTP ve tarayıcı |
| AC-07 Aynı değerli satırlar | Ayrı kaynak kimlikli iki Ali; 80/75 filtre operandları korunur | Tarayıcı satır seçimi |
| AC-08 NULL ayrımı | Notu NULL kaydında UNKNOWN, 45 kaydında FALSE | Parser ve arayüz |
| AC-09 Sonraki JOIN kaybı | `test_later_join_keeps_a_surviving_branch_and_explains_the_lost_one`: 102 kaydı JOIN 2'de kaybolur | API/tarayıcı |
| AC-10 Kısmi katılım | Aynı testte Ali'nin bir sonucu kalır; kayıp dal ayrı saklanır | Tarayıcı yolculuk görünümü |
| AC-11 Boş sonuç | Parser/API/browser testleri yazılı | Bu katmanlar çalıştırılmadı |
| AC-12 Kimlik uydurulmaz | Nullable/tekrarlı veya JS güvenli aralığı dışı anahtar reddi; generated sütun testi | Eksik anahtar parser/API testi ve UI uyarısı |
| AC-13 İptal/sınır başarısızlığı | Kaynak/ara satır sınırı, önceden iptal, çalışan SQLite iptali, çalışan sorguda süre sınırı, gerçek worker temizliği | Tarayıcıdan HTTP kopmasıyla bütün hat |
| AC-14 Mantıksal açıklama | Motor uyarısı ve UI metni mevcut | Gerçek ekran kontrolü |

## Ek çekirdek kanıtları

- Her başarılı açıklama farklı oturum kimliği, `status: complete` ve kullanılan SQL'i taşır. Aynı sorgunun kaynak sonuçları değişmez.
- AND koşullarının operandları ve ayrı TRUE/FALSE/UNKNOWN değerleri SQLite tarafından hesaplanır; Python SQL karşılaştırma semantiğini taklit etmez.
- Sonuç ve WHERE aşamasında geçen satırın filtre değerleri gösterim için taşınır. Önceki aşamalara sonraki filtre sonucu eklenmez.
- Self-JOIN rolleri ayrı tutulur; 10 alias için aşama sayımları ve katkılar kontrol edilir.
- BLOB JSON için hex'e, JS aralığı dışı normal hücre tamsayıları metne çevrilir; kaynak kimlikleri için aynı değerler açıklamayı reddettirir.
- Asenkron test ortamında çıplak `asyncio.to_thread` ile de kapanış beklemesi yeniden üretildi. Yalnız test temizliğinde küçük bir loop zamanlayıcısı kullanılır; gerçek SQLite çalışması taklit edilmez.

## Engel ve izleyen adım

PyPI ve npm alan adları bu çalışma ortamında çözülemiyor: `Could not resolve host: pypi.org` ve `Could not resolve host: registry.npmjs.org`. Paket kurulumu yapılamadığı için SQLGlot/FastAPI/httpx ve frontend araçlarıyla tam doğrulama mümkün değil. Başarı iddiası uğruna gereksinimler veya doğrulama komutu azaltılmadı.

Ağ erişimi sağlandığında README kurulumunu tamamlayın; ardından `./scripts/verify.sh` ile atlama olmadan backend testleri, TypeScript/Vite derlemesi ve gerçek API kullanan dört Playwright senaryosunu çalıştırın. Test/derleme çıktısına göre düzeltmeler ve gerçek dosya yükleme/iptal denemesi gerekir. Tamamlanma ancak bu kanıtlarla değerlendirilebilir.

Kullanıcı araştırması yapılmadı. UC-08 karşılaştırma ve UC-09 dışa aktarma, belgeye göre isteğe bağlıdır ve çekirdek doğrulanmadan eklenmedi. Doğal dil desteği sonraki aşamadır.
