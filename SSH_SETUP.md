# Remote-SSH Kurulum Rehberi

## VS Code / Cursor için Remote-SSH Extension Kurulumu

### 1. Extension'ı Yükleme

**VS Code için:**
1. VS Code'u açın
2. Extensions panelini açın (Cmd+Shift+X / Ctrl+Shift+X)
3. "Remote - SSH" arayın
4. Microsoft'un "Remote - SSH" extension'ını yükleyin
5. "Remote - SSH: Editing Configuration Files" extension'ını da yükleyin (opsiyonel ama önerilir)

**Cursor için:**
1. Cursor'u açın
2. Extensions panelini açın
3. "Remote - SSH" arayın ve yükleyin

### 2. SSH Yapılandırması

#### SSH Config Dosyası Oluşturma

SSH config dosyasını oluşturun veya düzenleyin:

**macOS/Linux:**
```bash
mkdir -p ~/.ssh
nano ~/.ssh/config
```

**Windows:**
```
C:\Users\YourUsername\.ssh\config
```

#### Örnek SSH Config

```ssh-config
# Mesaidefteri Production Server
Host mesaidefteri-prod
    HostName your-server-ip-or-domain.com
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/mesaidefteri_key
    ForwardAgent yes
    ServerAliveInterval 60
    ServerAliveCountMax 3

# Mesaidefteri Staging Server (opsiyonel)
Host mesaidefteri-staging
    HostName staging.your-domain.com
    User ubuntu
    Port 22
    IdentityFile ~/.ssh/mesaidefteri_key
```

### 3. SSH Key Oluşturma (Eğer yoksa)

```bash
# SSH key oluştur
ssh-keygen -t ed25519 -C "mesaidefteri-deployment" -f ~/.ssh/mesaidefteri_key

# Public key'i server'a kopyala
ssh-copy-id -i ~/.ssh/mesaidefteri_key.pub ubuntu@your-server-ip
```

### 4. VS Code/Cursor'da Bağlanma

1. **Command Palette** açın (Cmd+Shift+P / Ctrl+Shift+P)
2. "Remote-SSH: Connect to Host" yazın
3. Yapılandırdığınız host'u seçin (örn: `mesaidefteri-prod`)
4. Yeni bir pencere açılacak ve server'a bağlanacak
5. Server'da proje klasörünü açın

### 5. Server'da Proje Klasörü Açma

Bağlandıktan sonra:
1. File → Open Folder
2. Server'daki proje klasörünü seçin (örn: `/opt/mesaidefteri`)

## Deployment için SSH Script

### deploy-ssh.sh

```bash
#!/bin/bash

# SSH Deployment Script
# Usage: ./deploy-ssh.sh [environment]

ENVIRONMENT=${1:-production}
SSH_HOST="mesaidefteri-prod"
REMOTE_PATH="/opt/mesaidefteri"

echo "🚀 Deploying to $ENVIRONMENT..."

# Build locally
echo "📦 Building Docker image..."
docker build -t mesaidefteri:latest .

# Save image to tar
echo "💾 Saving image..."
docker save mesaidefteri:latest | gzip > mesaidefteri-latest.tar.gz

# Copy to server
echo "📤 Uploading to server..."
scp mesaidefteri-latest.tar.gz $SSH_HOST:/tmp/

# Deploy on server
echo "🚀 Deploying on server..."
ssh $SSH_HOST << EOF
  cd $REMOTE_PATH
  docker load < /tmp/mesaidefteri-latest.tar.gz
  docker-compose down
  docker-compose up -d
  docker system prune -f
  rm /tmp/mesaidefteri-latest.tar.gz
EOF

# Cleanup
rm mesaidefteri-latest.tar.gz

echo "✅ Deployment completed!"
```

## Güvenlik İpuçları

1. **SSH Key Permissions:**
   ```bash
   chmod 600 ~/.ssh/config
   chmod 600 ~/.ssh/mesaidefteri_key
   chmod 644 ~/.ssh/mesaidefteri_key.pub
   ```

2. **Password Authentication'ı Kapat:**
   Server'da `/etc/ssh/sshd_config`:
   ```
   PasswordAuthentication no
   PubkeyAuthentication yes
   ```

3. **SSH Key Passphrase:**
   SSH key oluştururken güçlü bir passphrase kullanın

## Troubleshooting

### Connection Timeout
```bash
# SSH config'e ekleyin:
ServerAliveInterval 60
ServerAliveCountMax 3
```

### Permission Denied
```bash
# Key permissions'ı kontrol edin
chmod 600 ~/.ssh/mesaidefteri_key
```

### Host Key Verification
```bash
# İlk bağlantıda host key'i kabul edin
ssh-keyscan -H your-server-ip >> ~/.ssh/known_hosts
```

## Hızlı Bağlantı Komutları

```bash
# SSH ile bağlan
ssh mesaidefteri-prod

# Docker compose komutlarını çalıştır
ssh mesaidefteri-prod "cd /opt/mesaidefteri && docker-compose ps"

# Logları görüntüle
ssh mesaidefteri-prod "cd /opt/mesaidefteri && docker-compose logs -f app"

# Servisleri yeniden başlat
ssh mesaidefteri-prod "cd /opt/mesaidefteri && docker-compose restart"
```

## VS Code Remote-SSH Özellikleri

- **Remote File Editing**: Server'daki dosyaları doğrudan düzenleyin
- **Remote Terminal**: Server'da terminal açın
- **Port Forwarding**: Local port'ları remote'a forward edin
- **Extension Sync**: Extension'lar server'da da çalışır

## Önerilen Extension'lar (Remote'da)

- Docker
- Remote - Containers
- GitLens
- ESLint
- Prettier
