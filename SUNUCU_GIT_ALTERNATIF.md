# Git Authentication Hatası Çözümleri

## Çözüm 1: Personal Access Token ile Clone (Önerilen)

### 1. GitHub'da Token Oluşturun
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. "Generate new token" → "Generate new token (classic)"
3. Scopes: `repo` işaretleyin
4. Token'ı kopyalayın

### 2. Sunucuda Clone Edin

```bash
cd /opt/mesaidefteri

# Token ile clone
git clone https://YOUR_TOKEN@github.com/OZGURWOLT/mesaidefteri.git .
```

**Örnek:**
```bash
git clone https://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@github.com/OZGURWOLT/mesaidefteri.git .
```

## Çözüm 2: Repository'yi Public Yapın

1. GitHub'da repository'ye gidin
2. Settings → Danger Zone → Change visibility → Make public
3. Sonra normal clone:
   ```bash
   git clone https://github.com/OZGURWOLT/mesaidefteri.git .
   ```

## Çözüm 3: Manuel Dosya Oluşturma (Hızlı)

Eğer repository private ve token yoksa, gerekli dosyaları manuel oluşturabiliriz.
