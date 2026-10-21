# SEO Content Engine

Gemini ile yapılandırılmış SEO içerik taslakları üreten, TypeScript tabanlı sunucu aracı. Konu seçimi, editoryal kontroller ve benzerlik denetimini CMS'den ayrı çalıştırır. Her sonuç `status: "draft"` ve `reviewRequired: true` taşır; araç içerik yayımlamaz.

**English:** A server-side TypeScript engine for structured SEO drafts, topic rotation, editorial checks and duplicate detection. Drafts require human review. Includes an offline demo, a Gemini provider and integration helpers.

## Hızlı başlangıç

Node.js 22.12 veya üzeri gerekir. Depo klasöründe:

```sh
npm ci
npm run demo
npm run check
```

Demo sahte sağlayıcıyla çevrimdışı çalışır; API anahtarı veya ücretli çağrı gerektirmez. `check`, tür denetimini, testleri ve derlemeyi çalıştırır. Canlı Gemini çağrıları bu doğrulamanın parçası değildir.

## Kendi yapılandırmanızla üretim

Örnek yapılandırmayı kopyalayıp marka bağlamını, konu alanlarını, soru açılarını ve editoryal kuralları düzenleyin:

```sh
mkdir -p config
cp examples/config.json config/local.json
cp .env.example .env
```

Kendi anahtarınızı yalnızca yerel `.env` veya sunucunun secret deposunda tutun.

```sh
node --env-file=.env --import tsx src/cli.ts --config config/local.json --history data/history.json --out data/draft.json
```

Ortam değişkeni zaten sunucuda tanımlıysa:

```sh
npm run generate -- --config config/local.json --history data/history.json --out data/draft.json
```

`GEMINI_API_KEY` zorunludur. Anahtarı tarayıcıya, istemci paketine veya Git'e eklemeyin; [Google'ın anahtar güvenliği rehberini](https://ai.google.dev/gemini-api/docs/api-key) izleyin. Üretim çağrıları sağlayıcının ücret ve kota koşullarına tabidir. Marka bağlamı, editoryal kurallar ve önceki içeriklerin ilgili metinleri Gemini'ye gönderilir; gizli müşteri verileri kullanmayın.

| Ortam değişkeni | Amaç | Uyumluluk varsayılanı |
| --- | --- | --- |
| `GEMINI_MODEL` | Makale taslağı | `gemini-2.5-flash` |
| `GEMINI_KEYWORD_MODEL` | Hedef sorgu önerisi | `gemini-2.5-flash-lite` |
| `GEMINI_EMBEDDING_MODEL` | Benzerlik vektörleri | `gemini-embedding-001` |

Bu model adları başlangıç varsayılanlarıdır; güncel hesap erişimi ve canlı model kullanılabilirliği doğrulanmış değildir. Gerektiğinde ortam değişkenleriyle değiştirin. Gemini JSON şeması kullanır; motor ayrıca yanıtları çalışma anında denetler. Yapılandırılmış çıktı, metnin doğruluğunu kanıtlamaz. [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)

## Akış ve çıktı

- Geçmişte en az kullanılan konu alanı × soru açısı seçilir.
- Hedef sorgu önerilir; önce sorgu, sonra taslak için tekrar denetimi uygulanır.
- Başlık, özet, meta alanları, anahtar kelimeler, giriş, tanım, gövde ve SSS doğrulanır.
- Denemeler sınırlandırılır; tekrar sorunu giderilemezse üretim hata verir. Editoryal bulgular ve yüksek riskli konular `reviewReasons` alanında belirtilir. Her sonuç editör incelemesi gerektiren taslaktır.

CLI aynı geçmiş dosyasını kullanan yerel çalışmaları kilitler. Önce taslak dosyasını yazar, ardından `projectId` ile ilişkilendirilmiş üretim geçmişini günceller. Bu geçmiş yayınlanmış içerik listesi değildir; yeni taslakların tekrar kontrolünü de kapsar. Her proje için ayrı geçmiş dosyası kullanın. Mevcut çıktı dosyası üzerine yazılmaz; her taslak için yeni bir `--out` yolu seçin. Geçmiş 10.000 kayda ulaştığında yeni ücretli çağrıdan önce işlem durur.

İşlem taslak yazıldıktan sonra kesilirse geçmiş güncellenmemiş olabilir. Yeniden denemeden önce taslak ile geçmişi karşılaştırıp uzlaştırın. Kalıcı `.lock` dosyasını yalnızca ilgili çalışmanın artık etkin olmadığını doğruladıktan sonra kaldırın.

## Entegrasyon

Derlemeden sonra çekirdek giriş noktası `./dist/src/index.js`, Gemini sağlayıcısı `./dist/src/providers/gemini.js`, adaptörler `./dist/src/adapters/index.js` altındadır. `ContentProvider` arayüzünü uygulayarak başka bir sağlayıcı bağlayabilirsiniz.

```ts
import { createGeminiProvider, generateContent } from './dist/src/index.js';
import { toMarkdown } from './dist/src/adapters/index.js';
// config: EngineConfig, history: ExistingPost[]
const provider = createGeminiProvider(); // GEMINI_API_KEY sunucu ortamından okunur.
const draft = await generateContent({ config, history, provider });
const markdown = toMarkdown(draft);
```

Markdown dışa aktarımı metin üretir; HTML render etmez. Payload yardımcısı taslak belge şekli döndürür; kendi koleksiyonlarınıza açık alan eşlemesi gerekir. Motor veritabanı kimlik bilgisi istemez ve adaptörler içerik yayımlamaz.

`createCronHandler(run, secret)` HTTP yardımcısı yalnızca `POST` kabul eder; en az 32 karakterlik gizli değer ve tam `Authorization: Bearer ...` biçimi ister. İstemciye genel hata kodu verir. Eşzamanlılık koruması yalnızca aynı süreç içindedir. Birden fazla sunucu/işçi için uygulamanız kalıcı kilit, idempotency ve istek sınırları sağlamalıdır. Zamanlayıcı kurulmaz.

## Sınırlar ve lisans

Benzerlik puanı benzersizlik kanıtı, önerilen sorgu arama hacmi verisi değildir. Araç sıralama, trafik, tıbbi doğruluk veya hukuki uygunluk garantisi vermez. Kaynaklar, iddialar, marka dili ve yayın kararı insan tarafından incelenmelidir.

Kod [MIT lisanslıdır](LICENSE). `package.json` içindeki `private: true` yanlışlıkla npm yayını yapılmasını önler; GitHub'da açık kaynak paylaşımını engellemez. Bu bağımsız depo örnek yapılandırma ve kod içerir; kaynak projelerin Git geçmişi taşınmaz. Güvenlik için [SECURITY.md](SECURITY.md), katkılar için [CONTRIBUTING.md](CONTRIBUTING.md).
