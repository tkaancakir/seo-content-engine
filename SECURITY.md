# Güvenlik

- Anahtarları yalnızca sunucu ortamında veya secret yöneticisinde tutun. `.env` dosyaları, yerel yapılandırma ve üretilen içerikler Git'e eklenmemelidir; `.env.example` içindeki gizli anahtar alanları boş olmalıdır; model adları örnek değerler içerebilir.
- Gemini anahtarını istemci koduna, URL'ye, ekran görüntüsüne veya hata kaydına koymayın. Sağlayıcı hatalarını, istek başlıklarını ve ortam değişkenlerini ham hâliyle loglamayın.
- Model çıktıları güvenilmeyen veridir. Çekirdek şema ve editoryal denetimler uygular; entegrasyonunuz HTML gösteriyorsa uygun HTML temizliği ve URL kısıtları ayrıca gerekir.
- HTTP yardımcısının süreç içi kilidi dağıtık sistem koruması değildir. Barındıran uygulama kalıcı idempotency, erişim denetimi, kota ve hız sınırlarından sorumludur.
- Taslak üretimini yayın yetkisinden ayrı tutun. Sağlayıcıya gönderilecek marka bağlamını ve geçmiş metinlerini gizli veriler açısından inceleyin.

Bir anahtar paylaşılmışsa önce ilgili sağlayıcıda iptal edin veya yenileyin. Dosyayı silmek ya da `.gitignore` eklemek eski commit'leri ve kopyaları temizlemez. Geçmiş temizliğini gerektiğinde ilgili kişilerle koordine edin. [GitHub'ın hassas veri kaldırma rehberi](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

Güvenlik açığını açık issue içinde gerçek anahtar, müşteri verisi veya kullanılabilir istismar ayrıntılarıyla paylaşmayın. Depoda özel güvenlik bildirimi etkinse o kanalı kullanın; yoksa hassas ayrıntı vermeden bakımcıdan özel iletişim kanalı isteyin. Yerel denetimler ve testler tam güvenlik garantisi değildir.
