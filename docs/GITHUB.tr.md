# GitHub'ı bu projede nasıl kullanırım?

[English](GITHUB.md) | **Türkçe**

Projenin adresi: **[tkaancakir/seo-content-engine](https://github.com/tkaancakir/seo-content-engine)**.
GitHub burada kodun, kullanım belgelerinin ve değişikliklerin paylaşıldığı yer. Dosyaları indirmek motoru çalıştırmaz; çalıştırmak için bilgisayarınızda veya sunucunuzda kurulum yapmanız gerekir.

## Sayfada nereye bakmalıyım?

| Bölüm | Bu projede ne için kullanılır? |
| --- | --- |
| **Code** | Dosyaları incelemek, dal seçmek ve kodu indirmek. `main` ana daldır. |
| **README** | Motorun ne yaptığını, gereksinimleri ve ilk çalıştırmayı öğrenmek. Depo ana sayfasında görünür. |
| **Issues** | Tekrarlanabilir bir hatayı bildirmek veya geliştirme önerisi sunmak. |
| **Pull requests** | Kod ya da belge değişikliğini incelemeye sunmak. Kısaca **PR** denir. |
| **Actions** | Değişiklikler için çalışan otomatik kontrollerin sonucunu görmek. |
| **Releases** | Bakımcının ayrıca yayımladığı, adlandırılmış sürümleri ve sürüm notlarını görmek. |

GitHub terimlerini ayrıntılı öğrenmek için [resmî sözlüğe](https://docs.github.com/en/get-started/learning-about-github/github-glossary) bakabilirsiniz. 21 Ekim 2026'da bu rehber hazırlanırken etiketlenmiş bir Release yoktu; yeni sürümler için [Releases sayfasını](https://github.com/tkaancakir/seo-content-engine/releases) kontrol edin.

## ZIP, clone ve fork: hangisini seçmeliyim?

| Amacınız | Seçim | Sonuç |
| --- | --- | --- |
| Kodu bir kez indirip denemek | **Code → Download ZIP** | O andaki dosyaları indirirsiniz. ZIP'i açtıktan sonra kurulum yaparsınız. |
| Bilgisayarınızda değişiklikleri takip ederek çalışmak | **Clone** | Git ile yerel bir kopya oluşturursunuz; sonraki güncellemeleri de alabilirsiniz. |
| Kendi GitHub hesabınızdan katkı önermek | **Fork** | GitHub hesabınızda bağlı bir kopya oluşur. Bilgisayarda çalışmak için bu kopyayı ayrıca clone edebilirsiniz. |

Bu seçeneklerin hiçbiri otomatik yayın veya kurulum yapmaz. [GitHub'ın indirme, clone ve fork açıklaması](https://docs.github.com/en/repositories/working-with-files/using-files/downloading-files-from-github)

Git kuruluysa bu depoyu indirmek için:

```sh
git clone https://github.com/tkaancakir/seo-content-engine.git
cd seo-content-engine
```

ZIP indirdiyseniz terminalde açtığınız `seo-content-engine-main` klasörüne geçin. Ardından [README'deki ilk denemeyi](../README.md) izleyin:

```sh
npm ci
npm run demo
```

Demo çevrimdışı çalışır ve API anahtarı istemez. Kendi içeriğinizi üretmek için README'deki yapılandırma adımlarını tamamlamanız gerekir; canlı sağlayıcı kullanımı kendi hesabınızın ücret ve kota koşullarına tabidir.

## Kendi ayarlarımı nereye koyacağım?

`examples/config.json` paylaşılan örnektir. Kopyasını `config/local.json` olarak düzenleyin; kendi anahtarınızı yerel `.env` dosyasına veya sunucunuzun secret alanına yazın. `.env`, `config/` ve `data/` Git tarafından dışarıda bırakılır.

Anahtarı GitHub'daki dosya düzenleyiciye, issue'ya, PR açıklamasına veya ekran görüntüsüne yapıştırmayın. Paylaşmadan önce dosya listesini ve değişiklikleri gözden geçirin; `.gitignore` daha önce paylaşılmış bir gizli bilgiyi geçmişten kaldırmaz. Bir sızıntı durumunda [güvenlik yönergelerini](../SECURITY.md) izleyin.

## Hata bildirmek veya özellik önermek

1. [Issues](https://github.com/tkaancakir/seo-content-engine/issues) bölümünde benzer bir kayıt var mı bakın.
2. **New issue** ile hata veya özellik formunu seçin.
3. Hata için beklediğiniz sonucu, gerçekleşen sonucu, Node.js sürümünü ve sorunu tekrarlayan kısa adımları yazın. Mümkünse `examples/config.json` ve sahte sağlayıcıyla bir örnek hazırlayın.
4. Gerçek müşteri içeriği veya ham log yerine anonim örnek ve motorun genel hata kodunu paylaşın. Bir özellik için hangi işi kolaylaştıracağını anlatın.

Issue açılması bir işin kabul edildiği veya belirli tarihte tamamlanacağı anlamına gelmez. Güvenlik açıkları için form yerine [SECURITY.md](../SECURITY.md) içindeki bildirim yolunu kullanın.

## Değişiklik göndermek

Katkı akışı: **fork → ayrı dal → değişiklik → kontroller → PR**.

[CONTRIBUTING.md](../CONTRIBUTING.md) komutları ve katkı kurallarını açıklar. PR açıklamasında neyin değiştiğini ve nasıl doğruladığınızı belirtin. Bir PR açmak ana depoyu değiştirmez; bakımcı inceleyip birleştirirse değişiklik `main` dalına girer.

## Bakımcı olarak gelen katkıyı nasıl yönetirim?

1. Issue'da sorunun örnekle tekrarlanıp tekrarlanmadığını değerlendirin. Eksik bilgi varsa kısa ve somut olarak isteyin; uygun değilse gerekçeyi yazın.
2. PR'da **Files changed** bölümünden kodu ve belgeleri okuyun. API anahtarı, müşteri verisi veya gereksiz dosya eklenmediğini kontrol edin.
3. Davranış değişikliğini ve testleri inceleyin. **Checks / Actions** tamamlanmadan birleştirmeyin; gerekli kontroller geçsin.
4. Değişiklik uygunsa **Merge** ile birleştirin. Kullanıcıyı etkileyen değişikliklerde README'yi ve kullanım örneklerini güncel tutun.

Actions'ta kırmızı bir sonuç görürseniz çalışmayı açıp başarısız adıma bakın. Test hatası, bağımlılık indirme sorunu veya GitHub çalıştırma ortamındaki bir sorun farklı çözümler gerektirir. Yalnız kırmızı simgeye bakarak kodun bozuk olduğunu söylemeyin; nedeni belirleyip gerekli kontrolü yeniden çalıştırın. Yeşil kontroller de kod incelemesinin yerini almaz.
