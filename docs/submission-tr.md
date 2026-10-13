# Pactlet — Türkçe submission paketi

## İki dakikalık pitch videosu

Merhaba, ben **[isim]**, Pactlet'in kurucusuyum.

AI ajanları artık API kullanabiliyor ve ödeme yapabiliyor; fakat mevcut ödeme sistemleri çoğunlukla yalnızca cüzdanı yetkilendiriyor. Belirli bir görevin, alt ajanın, hizmetin, bütçenin ve sürenin sınırlarını ödeme anında zorunlu kılmıyor. Hatalı veya ele geçirilmiş bir ajan, ekip fark etmeden fazla harcama yapabilir.

Pactlet, bir ajan x402 ödemesi yapmaya çalıştığı anda hiyerarşik yetkiyi kontrol eden eklenebilir bir ödeme katmanıdır.

Kullanıcı Solana cüzdanını bağlar ve 10 test USDC bütçeli bir görev oluşturur. Yönetici ajan araştırma uzmanına 4, analiz uzmanına 3 USDC devreder. Her alt ajanın daha dar hizmet listesi ve bitiş süresi vardır.

Araştırma ajanı ücretli bir hizmet istediğinde Pactlet; ajan kimliğini, kalan bütçeyi, hizmet iznini, süreyi, iptali, ağı, token'ı ve alıcıyı ödeme imzalanmadan önce doğrular. Geçersiz istekler zincire işlem gönderilmeden reddedilir. Geçerli ödeme Solana devnet işlem imzasıyla gösterilir.

Pactlet bir ajan cüzdanı veya marketplace değildir. Ajan altyapısı geliştiren ekipler için ödeme anındaki kontrol katmanıdır. MVP; 71 otomatik test, x402 V2 exact entegrasyonu ve canlı delegasyon dashboard'u içerir.

> Gerçek devnet settlement imzası alınmadan videoda “ödeme tamamlandı” denmemelidir. O zamana kadar “ödeme akışı hazır ve challenge doğrulandı” ifadesi kullanılmalıdır.

## Üç dakikalık demo videosu

- **0:00–0:20 — Cüzdan kanıtı:** Solana cüzdanını bağla ve nonce mesajını imzalayarak sahipliği doğrula.
- **0:20–0:45 — Görev oluşturma:** 10 test USDC görevini aç. Payer, devnet mint, base-unit miktar, task signer ve recipient ATA alanlarını göster.
- **0:45–1:10 — Delegasyon:** Manager'ın research ajana 4, analysis ajana 3 USDC devrettiğini; çocukların ebeveyn yetkisini aşamadığını göster.
- **1:10–1:40 — İzinli satın alma:** Prompt'u çalıştır. Jev yönlendirmesini, research uzmanını ve allowlist'teki x402 V2 exact isteğini göster.
- **1:40–2:00 — Zincir kanıtı:** Settlement tamamlandıysa Solana Explorer imzasını aç. Tamamlanmadıysa challenge ve pending durumu açıkça göster.
- **2:00–2:25 — Politika reddi:** İzin verilmeyen hizmet veya limit aşımı dene. İstek reddedilirken yeni bir işlem imzası oluşmadığını göster.
- **2:25–2:45 — İptal:** Research yetkisini iptal et ve ikinci satın alma denemesinin reddedildiğini göster.
- **2:45–3:00 — Güven sınırı:** “Token transferini Solana kanıtlıyor; bütçe, hizmet, süre ve iptal kurallarını bu MVP'de trusted backend uyguluyor” diyerek bitir.

## Business ve revenue modeli — üç cümle

Pactlet, ücretli API, veri ve compute satın alan AI ajanları geliştiren şirketlere SDK ve yönetilen politika servisi olarak sunulacaktır. Gelir; aktif delege görev başına kullanım fiyatlandırması, başarılı ve politika kontrollü ödemelerden küçük platform ücreti ve self-hosting, audit log ve özel key management içeren enterprise planlardan gelecektir. İlk müşterilerimiz kontrollü machine-to-machine ödemeye ihtiyaç duyan ajan altyapısı ekipleri ve ücretli API sağlayıcılarıdır.

## Kısa slide akışı

1. **Problem:** AI ajanları ödeme yapabiliyor, fakat görev bazlı sınırlar ödeme anında uygulanmıyor.
2. **Solution:** Pactlet, x402 ödeme imzasından önce hiyerarşik bütçe ve hizmet politikasını kontrol ediyor.
3. **Flow:** Fund task → delegate authority → validate purchase → settle on Solana devnet.
4. **Difference:** Agent wallet veya marketplace değil; mevcut ajanlara eklenen payment-control boundary.
5. **Traction:** 71 test, x402 V2 exact challenge, çalışan dashboard ve devnet entegrasyonu.
6. **Team:** **[İsimler ve tek cümlelik yetkinlikler]**.

## Submission week checklist

- [ ] Founder sesiyle en fazla 2 dakikalık pitch videosu yüklendi.
- [ ] Ürünün gerçek akışını gösteren en fazla 3 dakikalık demo yüklendi.
- [ ] Repo public yapıldı; private kalırsa `hackathon@colosseum.com` erişimi verildi.
- [x] Business ve revenue modeli üç cümle halinde yazıldı.
- [ ] Colosseum portalında proje ve tüm ekip üyeleri kontrol edilerek submit edildi.
- [ ] Aynı proje ayrıca [Superteam Türkiye Earn listing](https://superteam.fun/earn/listing/submit-crypto-worlds-fair-project-for-turkish-builders/) üzerinden submit edildi.
- [ ] Son tarih **13 Ekim 09:59 Türkiye saati** olarak takvime işlendi.
