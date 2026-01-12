# Cursor'da Remote-SSH Kullanımı

## ⚠️ Önemli Not

Cursor, VS Code tabanlı bir editor olsa da, bazı VS Code extension'ları (özellikle Remote-SSH) Cursor'da **doğrudan çalışmayabilir**. Cursor'un kendi extension marketplace'i ve sınırlamaları olabilir.

## 🔍 Cursor'da Remote-SSH Kontrolü

### 1. Extension'ı Kontrol Edin

1. Cursor'u açın
2. **Cmd+Shift+X** (Mac) veya **Ctrl+Shift+X** (Windows/Linux) ile Extensions panelini açın
3. "Remote - SSH" arayın
4. Eğer extension görünmüyorsa veya yüklenemiyorsa, Cursor bu extension'ı desteklemiyor olabilir

### 2. Alternatif Çözümler

#### ✅ Çözüm 1: Terminal Üzerinden SSH (Önerilen)

Cursor'da terminal açıp SSH ile bağlanabilirsiniz:

1. **Terminal** açın (`` Ctrl+` `` veya View → Terminal)
2. SSH ile bağlanın:
   ```bash
   ssh mesaidefteri-prod
   ```
3. Server'da proje klasörüne gidin:
   ```bash
   cd /opt/mesaidefteri
   ```
4. Cursor'da **File → Open Folder** ile server'daki klasörü açabilirsiniz (SSH mount gerekebilir)

#### ✅ Çözüm 2: SSHFS ile Mount (macOS/Linux)

Server'daki klasörü local'e mount edin:

```bash
# SSHFS kurulumu (macOS)
brew install macfuse sshfs

# Mount
mkdir ~/mesaidefteri-remote
sshfs ubuntu@your-server-ip:/opt/mesaidefteri ~/mesaidefteri-remote

# Cursor'da açın
# File → Open Folder → ~/mesaidefteri-remote
```

#### ✅ Çözüm 3: VS Code Kullanın (Geçici)

Remote-SSH için VS Code kullanabilirsiniz:

1. VS Code'u yükleyin
2. Remote-SSH extension'ını yükleyin
3. Server'a bağlanın
4. Gerekirse Cursor'a geri dönün

#### ✅ Çözüm 4: Git + Local Development

En pratik çözüm:

1. **Local'de geliştirme yapın** (Cursor'da)
2. **Git ile commit/push yapın**
3. **Server'da pull yapın**:
   ```bash
   ssh mesaidefteri-prod
   cd /opt/mesaidefteri
   git pull origin main
   docker-compose restart
   ```

## 🚀 Önerilen Workflow

### Development Workflow

```bash
# 1. Local'de geliştirme (Cursor'da)
# 2. Değişiklikleri commit et
git add .
git commit -m "Feature: ..."
git push origin main

# 3. Server'da güncelle
ssh mesaidefteri-prod << EOF
  cd /opt/mesaidefteri
  git pull origin main
  docker-compose build
  docker-compose up -d
EOF
```

### Otomatik Deployment Script

`deploy.sh` script'ini kullanın:

```bash
# Local'de
./deploy.sh
```

Bu script:
- Git push yapar
- Server'a bağlanır
- Pull yapar
- Docker'ı yeniden build eder
- Container'ları restart eder

## 📝 Cursor'da SSH Terminal Kullanımı

Cursor'da terminal açıp SSH ile bağlanabilirsiniz:

1. **Terminal** açın (`` Ctrl+` ``)
2. SSH config kullanarak bağlanın:
   ```bash
   ssh mesaidefteri-prod
   ```
3. Server'da çalışın

### SSH Config Örneği

`~/.ssh/config` dosyasına ekleyin:

```ssh-config
Host mesaidefteri-prod
    HostName your-server-ip
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/mesaidefteri_key
    ForwardAgent yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

## 🔧 Cursor Extension Alternatifleri

Cursor'da çalışabilecek extension'lar:

1. **GitLens** - Git yönetimi
2. **Docker** - Container yönetimi
3. **Remote - Containers** - Container'lara bağlanma (eğer destekleniyorsa)

## 💡 En İyi Pratik

1. **Local Development**: Cursor'da local'de geliştirme yapın
2. **Git Workflow**: Değişiklikleri Git ile yönetin
3. **Automated Deployment**: Script'lerle otomatik deploy yapın
4. **SSH Terminal**: Gerekirse terminal'den SSH ile bağlanın

## 🆘 Sorun Giderme

### Extension Bulunamıyor
- Cursor'un extension marketplace'ini kontrol edin
- VS Code extension'ları Cursor'da çalışmayabilir

### SSH Bağlantı Hatası
```bash
# SSH config'i test edin
ssh -v mesaidefteri-prod

# Key permissions kontrol edin
chmod 600 ~/.ssh/mesaidefteri_key
```

### Permission Denied
```bash
# Public key'i server'a ekleyin
ssh-copy-id -i ~/.ssh/mesaidefteri_key.pub ubuntu@your-server-ip
```

## 📚 Kaynaklar

- [Cursor Documentation](https://cursor.sh/docs)
- [SSH Documentation](https://www.ssh.com/academy/ssh)
- [Git Workflow Best Practices](https://www.atlassian.com/git/tutorials/comparing-workflows)
