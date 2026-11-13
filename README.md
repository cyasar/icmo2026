# Kuşak-Duyarlı Yönetim Modeli (KDYM): Etkileşimli Bildiri Sunumu

**Örgüt Yönetiminde Matematiksel Modelleme Temelli Yönetim Stratejileri: Çok Kuşaklı Bir Yaklaşım**
Cumali YAŞAR · IV. Örgütlerin Yönetimi Uluslararası Kongresi · Kasım 2026

Canlı sunum: https://cyasar.github.io/icmo2026/

## İçerik
- **Sistem dinamiği:** 9 durumlu adi diferansiyel denklem sistemi (kuşak başına motivasyon ve iletişim, örgüt düzeyinde yenilik), RK4 çözümü
- **Senaryo simülasyonu:** 5 liderlik stratejisi, 36 aylık ufuk
- **ÇKKV:** AHP (özvektör, CR) ile ölçüt ağırlıkları, TOPSIS ile sıralama; ikisi de tarayıcıda düzenlenebilir
- **Optimizasyon:** simpleks üzerinde stokastik arama ve yerel iyileştirme, Pareto sınırı, kuşağa göre kişiselleştirilmiş strateji
- **Duyarlılık:** Monte Carlo sıra kabul edilebilirliği (SMAA mantığı), tornado analizi
- **Geçerlilik ve güvenilirlik:** 17 testlik canlı paket
- **Notasyon sözlüğü ve denklem açıklamaları**; tüm kısaltmalar renkli ve tıklanınca açıklanır (yapı, uç koşul, işaret, sayısal, ÇKKV, ampirik)

## Kullanım
| Tuş | İşlev |
|---|---|
| → / Boşluk / PageDown | sonraki slayt |
| ← / PageUp | önceki slayt |
| N | konuşmacı notları |
| F | tam ekran |
| sayı + Enter | ilgili slayda atla (ör. `11` Enter) |

Tüm kütüphaneler (`assets/vendor`) yereldir; sunum internetsiz çalışır. Yerelde en sağlıklı açılış için:
```
python -m http.server 8000
```
Ardından `http://localhost:8000` adresini açın. `index.html` dosyası doğrudan açıldığında da çalışır, ancak bu durumda ağır hesaplar arka plan yerine ana iş parçacığında yapılır.

## Dosyalar
- `assets/model.js`: model çekirdeği (denklemler, AHP, TOPSIS, optimizasyon, Monte Carlo, test paketi). Arayüzden bağımsızdır, Node.js ile de çalışır.
- `assets/app.js`: sunum ve grafik katmanı
- `assets/worker.js`: ağır hesaplar için Web Worker

## Şeffaflık beyanı
Varsayılan parametreler **ampirik tahmin değildir**. Yönleri kavramsal literatürle uyumlu, büyüklükleri gösterim amaçlıdır. Bulgular "varsayımsal parametreler altında model içi önermeler" olarak okunmalıdır. Ampirik kalibrasyon ve doğrulama makale aşamasında yapılacaktır.

## Güvenlik
Statik sayfadır. Veri toplamaz, hiçbir sunucuya bağlanmaz (CSP `connect-src 'none'`).
