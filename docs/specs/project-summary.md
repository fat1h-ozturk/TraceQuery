# SQL İzleyici — Kısa Proje Özeti

## Proje nedir?

SQL İzleyici, bir SQL sorgusunun sonucunun nasıl oluştuğunu gerçek kayıtlar üzerinden açıklayan bir veritabanı görüntüleyicisidir. Kullanıcı bir SQLite dosyasını açar, sorgusunu çalıştırır ve sonuç satırlarının hangi kaynak kayıtlardan geldiğini görebilir. Sorgudaki JOIN ve WHERE işlemlerinin kayıtlar üzerindeki etkisini inceleyebilir.

## Hangi problemi çözer?

SQL öğrenen veya yabancı bir veritabanını inceleyen kişi, sorgunun sonucunu görse bile neden böyle çıktığını anlamakta zorlanabilir: “Bu kişi neden iki kez görünüyor?”, “Beklediğim kayıt neden yok?” veya “Bu satır hangi tablolardan geldi?”

Proje, bu soruları kaynak kayıtları ve eşleşme/filtre koşullarını göstererek yanıtlamayı hedefler. Böylece kullanıcı sorguyu rastgele değiştirerek denemek yerine, sonucun oluşumunu takip edebilir.

## Somut örnek

Bir okul veritabanında üç öğrenci olsun:

- **Ali:** Matematik notu 80, Fizik notu 75.
- **Ayşe:** Matematik notu 45.
- **Mehmet:** Henüz ders kaydı yok.

Öğrencileri ders kayıtlarıyla birleştirip notu en az 60 olanları isteyen bir sorgunun sonucu şöyle olur:

| Öğrenci | Ders | Not |
|---|---|---|
| Ali | Matematik | 80 |
| Ali | Fizik | 75 |

SQL İzleyici bu sonucu şöyle açıklar:

- **Ali neden iki kez çıktı?** İki farklı ders kaydıyla eşleştiği için her eşleşme ayrı bir sonuç satırı oluşturdu.
- **Ayşe neden yok?** Ders kaydıyla eşleşti, fakat notu 45 olduğu için `not >= 60` filtresinde elendi.
- **Mehmet neden yok?** Ders kaydı bulunmadığından INNER JOIN aşamasında eşleşemedi.

Kullanıcı Ali'nin Matematik satırını seçtiğinde, bu satırı oluşturan öğrenci, ders kaydı ve ders tablosu kayıtları birlikte gösterilir.

## İlk sürüm ve akademik yön

İlk sürüm SQLite, basit SELECT, eşitlik koşullu INNER JOIN ve basit WHERE ifadelerine odaklanır. Veritabanını değiştirmez. Gösterilen aşamalar sorgunun mantıksal açıklamasıdır; veritabanı motorunun fiziksel çalışma sırası değildir.

Akademik araştırma sorusu: **Kaynak kayıtları ve elenme nedenlerini gösteren bir arayüz, yalnız sonuç tablosu gösteren arayüze göre SQL sonuçlarını daha doğru ve daha hızlı anlamayı sağlıyor mu?** Bu, öğrencilere verilen sorgu anlama görevlerindeki doğruluk ve süreyle değerlendirilebilir.

Bu dosya geliştirilecek projenin özetidir; özelliklerin henüz uygulanmış olduğu anlamına gelmez.
