# Sunucuda SSH Kurulum ve Yapılandırma

## SSH Server Kurulumu (Eğer yoksa)

```bash
# SSH server kurulumu
sudo apt update
sudo apt install openssh-server -y

# SSH servisini başlat
sudo systemctl start ssh
sudo systemctl enable ssh

# Durum kontrolü
sudo systemctl status ssh
```

## SSH Yapılandırması

### 1. SSH Config Dosyasını Düzenle

```bash
sudo nano /etc/ssh/sshd_config
```

**Önemli ayarlar:**
```
Port 22
PermitRootLogin yes  # veya no (güvenlik için)
PasswordAuthentication yes  # veya no (key-based için)
PubkeyAuthentication yes
```

**Değişikliklerden sonra:**
```bash
sudo systemctl restart ssh
```

### 2. Firewall Ayarları

```bash
# UFW firewall
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

## SSH Key Yapılandırması (Önerilen)

### 1. Local'de (Mac'inizde) SSH Key Oluştur

```bash
# SSH key oluştur
ssh-keygen -t ed25519 -C "mesaidefteri-server" -f ~/.ssh/mesaidefteri_key

# Public key'i görüntüle
cat ~/.ssh/mesaidefteri_key.pub
```

### 2. Public Key'i Sunucuya Kopyala

**Yöntem 1: ssh-copy-id (en kolay)**
```bash
ssh-copy-id -i ~/.ssh/mesaidefteri_key.pub root@YOUR_SERVER_IP
```

**Yöntem 2: Manuel**
```bash
# Public key'i kopyala
cat ~/.ssh/mesaidefteri_key.pub

# Sunucuda:
mkdir -p ~/.ssh
echo "PASTE_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

### 3. Local'de SSH Config Ekle

`~/.ssh/config` dosyasına ekleyin:

```ssh-config
Host mesaidefteri-prod
    HostName YOUR_SERVER_IP
    User root
    Port 22
    IdentityFile ~/.ssh/mesaidefteri_key
    ForwardAgent yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

### 4. Bağlantı Testi

```bash
ssh mesaidefteri-prod
```

## Güvenlik İyileştirmeleri

### 1. Root Login'i Kapat (Önerilen)

```bash
# Yeni bir kullanıcı oluştur
sudo adduser ubuntu
sudo usermod -aG sudo ubuntu

# SSH config'de
sudo nano /etc/ssh/sshd_config
# PermitRootLogin no

sudo systemctl restart ssh
```

### 2. Password Authentication'ı Kapat (Key-based kullanıyorsanız)

```bash
sudo nano /etc/ssh/sshd_config
# PasswordAuthentication no
# PubkeyAuthentication yes

sudo systemctl restart ssh
```

### 3. SSH Port Değiştirme (Opsiyonel)

```bash
sudo nano /etc/ssh/sshd_config
# Port 2222  # Varsayılan 22 yerine

sudo systemctl restart ssh
sudo ufw allow 2222/tcp
```

## SSH Bağlantı Sorunları

### Connection Refused
```bash
# SSH servisini kontrol et
sudo systemctl status ssh

# Port'u kontrol et
sudo netstat -tulpn | grep :22
```

### Permission Denied
```bash
# Key permissions kontrol et
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Timeout
```bash
# Firewall kontrolü
sudo ufw status
sudo ufw allow 22/tcp
```

## Hızlı Kontrol Komutları

```bash
# SSH durumu
sudo systemctl status ssh

# SSH port kontrolü
sudo ss -tlnp | grep :22

# Aktif bağlantılar
who
w

# SSH logları
sudo tail -f /var/log/auth.log
```
