# Cursor'a Remote-SSH Extension Kurulumu

## Yöntem 1: Extension Marketplace'den (Önerilen)

### Adımlar:

1. **Cursor'u açın**

2. **Extensions panelini açın:**
   - **Mac**: `Cmd + Shift + X`
   - **Windows/Linux**: `Ctrl + Shift + X`
   - Veya: View → Extensions

3. **"Remote - SSH" arayın:**
   - Arama kutusuna "Remote SSH" yazın
   - Microsoft'un "Remote - SSH" extension'ını bulun
   - **Yükle** (Install) butonuna tıklayın

4. **İlgili extension'ları da yükleyin:**
   - "Remote - SSH: Editing Configuration Files" (opsiyonel ama önerilir)

5. **Cursor'u yeniden başlatın** (gerekirse)

## Yöntem 2: Command Palette ile

1. **Command Palette açın:**
   - **Mac**: `Cmd + Shift + P`
   - **Windows/Linux**: `Ctrl + Shift + P`

2. **"Extensions: Install Extensions" yazın**

3. **"Remote - SSH" arayın ve yükleyin**

## Yöntem 3: Manuel Extension ID ile

Command Palette'de:
```
ext install ms-vscode-remote.remote-ssh
```

## Extension Yüklendikten Sonra

### 1. SSH Config Dosyası Oluştur

**Mac/Linux:**
```bash
nano ~/.ssh/config
```

**Windows:**
```
C:\Users\YourUsername\.ssh\config
```

### 2. SSH Config İçeriği

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

### 3. Cursor'da Bağlan

1. **Command Palette** açın (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. **"Remote-SSH: Connect to Host"** yazın
3. **Host seçin** (`mesaidefteri-prod`)
4. Yeni pencere açılacak ve server'a bağlanacak

## Sorun Giderme

### Extension Bulunamıyor

Cursor bazen VS Code extension'larını desteklemeyebilir. Alternatifler:

1. **VS Code kullanın** (geçici olarak)
2. **Terminal'den SSH kullanın** (Cursor'un terminal'i)
3. **SSHFS mount kullanın** (macOS/Linux)

### Extension Yüklenmiyor

```bash
# Cursor'u tamamen kapatıp yeniden açın
# Veya
# Cursor'u güncelleyin
```

### Bağlantı Hatası

```bash
# SSH config'i test edin
ssh mesaidefteri-prod

# Key permissions kontrol edin
chmod 600 ~/.ssh/mesaidefteri_key
chmod 700 ~/.ssh
```

## Alternatif: Terminal'den SSH

Cursor'da terminal açıp (`Ctrl+``) SSH ile bağlanabilirsiniz:

```bash
ssh mesaidefteri-prod
cd /opt/mesaidefteri
# Dosyaları düzenleyebilirsiniz
```

## Önerilen Extension'lar (Cursor'da)

1. **Remote - SSH** - SSH bağlantısı
2. **Docker** - Container yönetimi
3. **GitLens** - Git yönetimi
4. **ESLint** - Code linting
5. **Prettier** - Code formatting

## Hızlı Test

Extension yüklendikten sonra:

1. `Cmd+Shift+P` (Mac) veya `Ctrl+Shift+P` (Windows)
2. "Remote-SSH" yazın
3. "Connect to Host" seçeneği görünmeli

Eğer görünmüyorsa, Cursor bu extension'ı desteklemiyor olabilir.
