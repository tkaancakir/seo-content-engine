# Kullanım Kılavuzu

[English](USAGE.md)

Bu kılavuz, SEO Content Engine'i bilgisayarınızda ilk kez çalıştırmak ve kendi projeniz için taslak üretmek içindir. Önce anahtar gerektirmeyen demoyu deneyin; ardından isterseniz kendi Gemini hesabınızı bağlayın.

## 1. Araç ne yapar?

Verdiğiniz marka bağlamından ve konu alanlarından bir hedef sorgu seçer; başlık, meta açıklaması, gövde ve sık sorulan soruları yapılandırılmış bir taslakta toplar. Önceki taslaklarla benzerliği kontrol eder.

Sonuç bir JSON dosyasıdır. Her başarılı sonuç `status: "draft"` ve `reviewRequired: true` taşır. Web sitesi, yönetim paneli veya otomatik yayın sistemi kurulmaz. İçeriği inceleyip sitenize aktarma kararı sizdedir.

## 2. Gerekenler ve indirme

- **Node.js 22.12 veya üzeri ve npm:** [Resmî Node.js indirme sayfasından](https://nodejs.org/en/download) işletim sisteminize uygun kurulumu yapın. npm içeren kurulumu seçin.
- **Terminal:** macOS'ta Terminal, Windows'ta PowerShell veya Komut İstemi, Linux'ta terminal uygulaması.
- **İnternet:** bağımlılık kurulumu ve gerçek Gemini çağrıları için gerekir. Kurulumdan sonra demo çevrimdışı çalışır.
- **Gemini API anahtarı:** yalnızca gerçek üretim için gerekir. Demo ve yerel testler anahtar kullanmaz.

Terminalde sürümleri kontrol edin:

```sh
node --version
npm --version
```

`node` bulunamazsa kurulumdan sonra terminali kapatıp yeniden açın. Node sürümü `v22.12.0` veya üzeri olmalıdır.

Git kullanıyorsanız projeyi indirin:

```sh
git clone https://github.com/tkaancakir/seo-content-engine.git
cd seo-content-engine
```

Git kullanmıyorsanız [GitHub deposunda](https://github.com/tkaancakir/seo-content-engine) **Code → Download ZIP** seçeneğine basın. ZIP'i çıkarın ve terminali çıkarılan klasörde açın. Klasörün içinde `package.json`, `src` ve `examples` görünmelidir.

**Aşağıdaki bütün komutları `package.json` dosyasının bulunduğu proje klasöründe çalıştırın.** Web tarayıcısına veya bir JavaScript dosyasına yapıştırmayın.

## 3. Kurulum ve ücretsiz demo

Bağımlılıkları kurun:

```sh
npm ci
```

Bu komut kilit dosyasında belirtilen paket sürümlerini kurar. Ardından:

```sh
npm run demo
```

Terminalde `Offline demo — synthetic content, no API call.` mesajı ve örnek bir Markdown taslağı görmelisiniz. Başlangıç bilgilerinde `status: "draft"` ve `reviewRequired: true` bulunur.

**Demo dosya oluşturmaz, geçmişi değiştirmez ve Gemini'ye bağlanmaz.** Görünen metin hazır örnek içeriktir; gerçek üretim sonucu veya SEO performans ölçümü değildir.

Yerel tür denetimini, testleri ve derlemeyi çalıştırmak için:

```sh
npm run check
```

Başarılı işlem hata vermeden tamamlanır ve derlenmiş dosyaları `dist/` içine yazar. Bu kontrol canlı API erişiminizi, hesap kotanızı veya model kullanılabilirliğini doğrulamaz.

## 4. Projenizi tanımlayın

Dosya yöneticinizde proje içinde `config` klasörü oluşturun. `examples/config.json` dosyasını buraya **`local.json`** adıyla kopyalayın. macOS/Linux terminalinde aynı işlem:

```sh
mkdir -p config
cp examples/config.json config/local.json
```

`config/local.json` dosyasını bir metin editöründe açın. Önce `projectId`, `brand`, `pillars` ve `facets` alanlarını değiştirin. Diğer ayarları ilk denemede örnekteki gibi bırakabilirsiniz.

`pillar`, yazılacak konu alanıdır; `facet`, bu konuya hangi soru açısından yaklaşılacağını belirtir. Örneğin “malzeme seçimi” bir konu alanı, “ilk kez başlayanın sorusu” bir soru açısı olabilir. Motor geçmişte en az kullanılan birleşimi seçer.

JSON dosyasında çift tırnak kullanın. Yorum satırı veya son öğeden sonra fazladan virgül eklemeyin. Tanımlanmamış alanlar doğrulamada reddedilir.

| Alan | Anlamı ve kabul edilen değerler |
| --- | --- |
| `projectId` | Zorunlu proje kimliği; 1–80 karakter. Küçük Latin harfi, rakam ve kelimeler arasında tek tire: `ornek-proje`. Geçmiş kullanmaya başladıktan sonra değiştirmeyin. |
| `brand.name` | Marka adı; zorunlu, boşluklar kırpıldıktan sonra 1–10.000 karakter. |
| `brand.audience` | İçeriğin kime hitap ettiği; zorunlu, 1–10.000 karakter. |
| `brand.tone` | Yazım tonu; zorunlu, 1–10.000 karakter. |
| `brand.locale` | Geçerli dil/yerel ayar etiketi, örneğin `tr` veya `en`; 2–40 karakter. Yazılmazsa `en`. |
| `pillars` | 1–100 konu alanı. Her öğede benzersiz `id` ve 1–10.000 karakterlik `label` bulunur. `id`, proje kimliğiyle aynı biçim kurallarına uyar. |
| `pillars[].riskTier` | `normal` veya `high`; yazılmazsa `normal`. `high`, çıktıya ek inceleme nedeni koyar. Her iki değer de yalnızca taslak üretir. |
| `facets` | 1–30 soru açısı. Her öğede benzersiz `id` ve 1–10.000 karakterlik `description` bulunur. `id`, proje kimliğiyle aynı biçim kurallarına uyar. |
| `editorialRules` | En çok 100 yazım kuralı; her kural 1–10.000 karakter. Yazılmazsa boş liste. Model talimatıdır, tek başına doğruluk garantisi değildir. |
| `blockedPhrases` | En çok 100 ifade; her biri 1–200 karakter. Yazılmazsa boş liste. Eşleşme çıktıya inceleme nedeni ekler; içeriği otomatik yayımlamaz. |
| `requiredNotice` | İsteğe bağlı sabit not; 1–10.000 karakter. Modelin yeniden yazmasına bırakılmaz, sonuçta ayrı taşınır ve Markdown dışa aktarımına eklenir. |
| `maxAttempts` | Farklı konu/sorgu denemesi için 1–5 arası tam sayı; varsayılan `3`. Sağlayıcının biçim düzeltme denemeleri ayrıca vardır; bu sayı toplam API çağrısı sayısı değildir. |
| `duplicateThreshold` | Başlık ve özet benzerliği için `0.5`–`1`; varsayılan `0.9`. Puan eşikten büyük veya eşitse aday reddedilir. |
| `keywordThreshold` | Hedef sorgu benzerliği için `0.5`–`1`; varsayılan `0.93`. Puan eşikten büyük veya eşitse sorgu reddedilir. |

Benzerlik eşiklerini düşürmek denetimi sıkılaştırır; yükseltmek daha benzer adayların geçmesine izin verir. İlk kullanımda varsayılan değerlerle başlayın. Benzerlik karşılaştırması bütün gövdeyi değil, geçmişteki **başlık ve özetleri** kullanır.

## 5. Kendi API anahtarınızı ekleyin

[Google'ın Gemini anahtar rehberini](https://ai.google.dev/gemini-api/docs/api-key) izleyerek kendi hesabınızdan bir anahtar oluşturun. Hesabınızdaki erişim, kota ve ücretlendirme koşullarını kontrol edin.

Proje kökündeki `.env.example` dosyasını aynı yerde **`.env`** adıyla kopyalayın. Dosyanın adının `.env.txt` olmadığından emin olun. macOS/Linux'ta:

```sh
cp .env.example .env
```

`.env` dosyasını metin editöründe açın ve boş `GEMINI_API_KEY=` satırının eşittir işaretinden sonrasına anahtarınızı yazın. Anahtarı terminal komutuna, GitHub issue'suna, ekran görüntüsüne veya proje yapılandırma dosyasına koymayın.

Model ayarları aynı dosyadadır:

| Ayar | Kullanım | Başlangıç değeri |
| --- | --- | --- |
| `GEMINI_MODEL` | Makale taslağı | `gemini-2.5-flash` |
| `GEMINI_KEYWORD_MODEL` | Hedef sorgu önerisi | `gemini-2.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Benzerlik vektörleri | `gemini-embedding-001` |

Bunlar önceki motorla uyumluluk için tutulan varsayılanlardır. Güncel hesabınızda kullanılabilir oldukları varsayılmamalıdır; gerekiyorsa hesabınıza açık model adlarıyla değiştirin. CLI kullanımında `CRON_SECRET` alanını doldurmanız gerekmez.

`.env`, `config/` ve `data/` Git tarafından yok sayılır. Yine de yükleme yapmadan önce dosyaları kontrol edin; `git add -f` ile bu korumayı aşmayın. Daha fazla bilgi: [Güvenlik politikası](../SECURITY.md).

## 6. İlk gerçek taslağı üretin

**Bu adım kendi Gemini hesabınızla API çağrısı yapar; ücret veya kota tüketimi olabilir.** Marka bağlamı, kurallar, hedef sorgular ve geçmişteki ilgili metinler sağlayıcıya gönderilir. Gizli müşteri verisi eklemeyin.

Proje klasöründe çalıştırın:

```sh
node --env-file=.env --import tsx src/cli.ts --config config/local.json --history data/history.json --out data/draft-001.json
```

İlk kullanımda `data/` veya geçmiş dosyası yoksa araç bunları oluşturur. Parametrelerin anlamı:

- `--config`: Kullanılacak proje yapılandırması.
- `--history`: Önceki üretimlerin başlık, özet, slug, hedef sorgu ve konu bilgilerini tutan JSON dosyası.
- `--out`: Bu çalışmanın tam taslağını kaydedeceği **yeni** dosya yolu.

Başarılı işlem terminale `ok: true`, `status: "draft"`, `reviewRequired: true` ve üretilen `slug` alanlarını yazar. Makalenin tamamını `data/draft-001.json` dosyasından okuyun; terminalde yalnızca kısa durum bilgisi gösterilir.

İkinci üretimde aynı yapılandırma ve geçmişi kullanın, yalnızca çıktıyı `data/draft-002.json` yapın. Mevcut çıktı dosyalarının üzerine yazılmaz. Geçmişi her çalıştırmada sıfırlamak tekrar kontrolünü ortadan kaldırır.

Anahtar ortam değişkeni olarak sunucuda zaten tanımlıysa şu alternatif kullanılabilir; bu komut `.env` dosyasını kendiliğinden yüklemez:

```sh
npm run generate -- --config config/local.json --history data/history.json --out data/draft-003.json
```

Komut yardımını görmek için `npm run generate -- --help` çalıştırın.

## 7. Sonucu okuyun ve birden fazla proje kullanın

| Sonuç alanı | Nasıl yorumlanır? |
| --- | --- |
| `post` | Başlık, slug, özet, meta alanları, anahtar kelimeler, etiketler, giriş, tanım, gövde ve SSS. |
| `reviewReasons` | `editorial-review` her zaman vardır. `high-risk-topic`, seçilen konu işaretliyse; `blocked-phrase`, taranan ifadelerden biri bulunursa eklenir. |
| `targetKeyword` | Önerilen hedef arama sorgusu; ölçülmüş arama hacmi veya sıralama verisi değildir. |
| `pillarId`, `facetId` | Seçilen konu alanı ve soru açısı. |
| `maxSimilarity`, `keywordSimilarity` | O çalışmadaki benzerlik puanları; yüzde başarı veya benzersizlik garantisi değildir. Karşılaştırılacak geçmiş yoksa `0` olur. |
| `attempts` | Kullanılan konu denemesi sayısı; toplam API çağrısı veya maliyet değildir. |

Kaynakları, iddiaları, marka dilini ve bağlantı ihtiyaçlarını inceleyin. JSON'daki taslak durumunu değiştirmek herhangi bir siteyi yayımlamaz. Markdown çıktısı inceleme nedenlerinin tamamını taşımaz; `reviewReasons` için kaynak JSON'u da saklayın.

Her proje için farklı `projectId`, yapılandırma ve geçmiş dosyası kullanın. Örneğin `config/proje-a.json` ile `data/proje-a-history.json`; diğer proje için `config/proje-b.json` ile `data/proje-b-history.json`. Geçmiş dosyası proje kimliğiyle eşleşmezse araç durur.

Geçmiş, yayımlanmamış taslakları da kapsar. En fazla 10.000 kayıt kabul edilir; bu sınıra ulaşılmış geçmişle CLI yeni üretime başlamaz. Kayıtları gelişigüzel silmek yerine arşivleme ve tekrar kontrolü yaklaşımınızı planlayın.

## 8. Markdown'a aktarma ve CMS bağlantısı

Önce `npm run build` çalıştırın. Ardından proje kökünde `export-draft.mjs` adlı bir dosya oluşturup aşağıdaki kodu koyun:

```js
import { readFile, writeFile } from 'node:fs/promises';
import { toMarkdown, toPayloadDraft } from './dist/src/adapters/index.js';

const draft = JSON.parse(await readFile('data/draft-001.json', 'utf8'));
await writeFile('data/draft-001.md', toMarkdown(draft), { flag: 'wx' });
const payloadDocument = toPayloadDraft(draft);
await writeFile('data/payload-draft-001.json', JSON.stringify(payloadDocument, null, 2), { flag: 'wx' });
```

`node export-draft.mjs` komutu, mevcut JSON'dan iki yeni yerel dosya oluşturur; API çağrısı yapmaz. Dosyalar zaten varsa üzerine yazmak yerine hata verir. Markdown'da bazı noktalama işaretlerinin önündeki `\` karakterleri güvenli metin kaçışlarıdır.

`toMarkdown(draft)` Markdown metni döndürür, HTML render etmez. `toPayloadDraft(draft)` genel bir taslak nesnesi döndürür; Payload veritabanına bağlanmaz. Kendi koleksiyon şemanızdaki alanları eşlemeniz, içeriği incelemeniz ve kayıt/yayın işlemini uygulamanızda ayrıca tanımlamanız gerekir.

Kendi sunucu kodunuzda `generateContent`, `createGeminiProvider` ve türleri `./dist/src/index.js` üzerinden kullanabilirsiniz. Kitaplık çağrısı kendi başına dosya yazmaz veya geçmişi güncellemez; bu davranışı CLI sağlar.

`createCronHandler(run, secret)` yalnızca entegrasyon yardımcısıdır; sunucu veya zamanlayıcı başlatmaz. `POST`, tam `Authorization: Bearer ...` başlığı ve en az 32 karakterlik ayrı bir gizli değer ister. Koruması yalnızca aynı süreç içindedir; birden fazla işçi/sunucu için kalıcı kilit ve aynı işin iki kez işlenmesini önleyen mekanizma gerekir.

## 9. Sorun giderme

CLI hata durumunda `ok: false`, bir `error` kodu ve genel mesaj döndürür. Hata ayrıntılarını paylaşırken `.env` veya gerçek anahtarınızı eklemeyin.

| Kod veya belirti | Kontrol edilecekler |
| --- | --- |
| `npm` / `node` bulunamadı | Node kurulumu ve terminalin yeniden açılması. |
| `package.json` bulunamadı | Terminalin proje kökünde olması. |
| `MISSING_API_KEY` | `.env` içindeki anahtar alanı ve komutta `--env-file=.env` bulunması. |
| `INVALID_CONFIG` | JSON alan adları, kimlik biçimi, eksik zorunlu alanlar, yinelenen konu kimlikleri ve yukarıdaki sınırlar. Üç dosya yolu birbirinden farklı olmalı. |
| `INVALID_HISTORY` | Geçmişin bu projeye ait olması, kayıtların bozulmamış olması ve 10.000 sınırı. Dosyayı boşaltarak geçiştirmeyin. |
| `INVALID_DRAFT` | Model çıktısı gerekli biçim veya içerik alanlarına uymadı. Yapılandırmayı ve modeli inceleyin; tekrar denemek yeni API maliyeti doğurabilir. |
| `INVALID_EMBEDDING` | Benzerlik vektörleri eksik/geçersiz geldi. Model erişimini kontrol edin; denetim başarıyla tamamlanmış sayılmaz. |
| `NO_UNIQUE_TOPIC` | Deneme sınırında uygun farklı konu bulunamadı. Konu alanlarını ve açılarını genişletin; geçmişi silmek yerine kapsamı gözden geçirin. |
| `PROVIDER_ERROR` | Anahtar erişimi, kota, ağ bağlantısı ve seçilen modeller. Anahtar içerebilecek ham sağlayıcı yanıtları bilinçli olarak gösterilmez. |
| `IO_ERROR` | Dosya yolu, JSON sözdizimi, yazma izni, mevcut çıktı veya geçmiş kilidi. Alt düzey `EEXIST` hatası CLI'da bu genel kodla görünebilir. |

`data/draft-001.json` zaten varsa yeni bir `--out` adı seçin. Aynı geçmişi kullanan başka çalışma açıksa onun bitmesini bekleyin. Kilit adı, geçmiş yoluna `.lock` eklenmesidir; örneğin `data/history.json.lock`.

**İşlem kesildiyse:** önce ilgili terminal/sunucu işinin gerçekten durduğunu doğrulayın. Taslak dosyası yazılmış, geçmiş henüz güncellenmemiş olabilir. Taslağı ve geçmişi yedekleyip karşılaştırın; tam taslak mevcutsa ilgili kaydın geçmişe güvenli biçimde eklenmesini sağlayın. Eksik/boş çıktıyı başarılı üretim saymayın. Yalnızca etkin bir çalışma kalmadığı ve verilerin durumu anlaşıldığı zaman o çalışmaya ait eski kilidi kaldırın. Bütün `.lock` veya `data/` dosyalarını topluca silmeyin.

## 10. Yayına geçmeden önce

Taslağı okuyun; doğrulanmamış iddiaları ve kaynakları kontrol edin. Bu araç araştırma verisi, arama sıralaması veya içerik doğruluğu garantisi sunmaz. Otomatik yayın, zamanlama ve üretim ortamı kurulumu kapsam dışındadır.

Kendi yapılandırmanızı veya bir hata raporunu paylaşmadan önce dosyalarda anahtar ve özel veri olmadığını kontrol edin. Bir anahtar açığa çıktıysa dosyayı silmekle yetinmeyin; sağlayıcıda iptal edin veya yenileyin. [Güvenlik politikası](../SECURITY.md) ve [katkı rehberi](../CONTRIBUTING.md) sonraki adımları açıklar.
