# Git Repository Bağlantı Rehberi

Projeyi GitHub repository'ye bağlamak için aşağıdaki komutları terminal'de sırayla çalıştırın:

## 1. Git Initialize (Eğer henüz yapılmadıysa)

```bash
cd /Users/ebubekirozgur/Desktop/mesaidefteri
git init
```

## 2. Remote Repository Ekle

```bash
git remote add origin https://github.com/OZGURWOLT/mesaidefteri.git
```

## 3. Tüm Dosyaları Stage'e Al

```bash
git add .
```

## 4. İlk Commit

```bash
git commit -m "Initial commit: Mesaidefteri production-ready system"
```

## 5. Branch Adını Main Yap (GitHub default)

```bash
git branch -M main
```

## 6. GitHub'a Push

```bash
git push -u origin main
```

## Alternatif: Eğer Repository'de zaten dosyalar varsa

Eğer GitHub repository'sinde zaten dosyalar varsa (örn: README), önce pull yapın:

```bash
git pull origin main --allow-unrelated-histories
```

Sonra push yapın:

```bash
git push -u origin main
```

## Sorun Giderme

### Authentication Hatası
GitHub'da Personal Access Token kullanmanız gerekebilir:

```bash
git remote set-url origin https://YOUR_TOKEN@github.com/OZGURWOLT/mesaidefteri.git
```

### Large Files
Eğer büyük dosyalar varsa, `.gitignore`'a ekleyin veya Git LFS kullanın.

### Connection Timeout
Eğer bağlantı zaman aşımına uğrarsa:

```bash
# Timeout süresini artır
git config --global http.postBuffer 524288000
git config --global http.lowSpeedLimit 0
git config --global http.lowSpeedTime 999999
```

## Hızlı Komutlar (Tek Seferde)

```bash
cd /Users/ebubekirozgur/Desktop/mesaidefteri
git init
git remote add origin https://github.com/OZGURWOLT/mesaidefteri.git
git add .
git commit -m "Initial commit: Mesaidefteri production-ready system"
git branch -M main
git push -u origin main
```
