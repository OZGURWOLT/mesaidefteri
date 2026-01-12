# Cursor Extension Kurulum Rehberi

## Remote-SSH Extension Kurulumu

### Adım 1: Extension Marketplace

1. Cursor'u açın
2. Sol menüden **Extensions** ikonuna tıklayın (veya `Cmd+Shift+X`)
3. Arama kutusuna **"Remote SSH"** yazın
4. **Microsoft** tarafından geliştirilen **"Remote - SSH"** extension'ını bulun
5. **Install** butonuna tıklayın

### Adım 2: Extension ID (Alternatif)

Eğer marketplace'de bulamazsanız, Command Palette'de:

1. `Cmd+Shift+P` (Mac) veya `Ctrl+Shift+P` (Windows)
2. `Extensions: Install Extensions` yazın
3. `ms-vscode-remote.remote-ssh` yazın ve Enter

### Adım 3: İlgili Extension'lar

Ayrıca şunları da yükleyin:
- **Remote - SSH: Editing Configuration Files** (`ms-vscode-remote.remote-ssh-edit`)

## Extension Yüklendikten Sonra

### SSH Config Oluşturma

**Mac:**
```bash
mkdir -p ~/.ssh
nano ~/.ssh/config
```

**Windows:**
```
C:\Users\YourUsername\.ssh\config
```

**İçerik:**
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

### Cursor'da Bağlanma

1. **Command Palette**: `Cmd+Shift+P` / `Ctrl+Shift+P`
2. **"Remote-SSH: Connect to Host"** yazın
3. **Host seçin**: `mesaidefteri-prod`
4. Yeni Cursor penceresi açılacak ve server'a bağlanacak

## Cursor'da Extension Bulunamıyorsa

Cursor bazen VS Code extension'larını desteklemeyebilir. Bu durumda:

### Alternatif 1: Terminal'den SSH

Cursor'da terminal açın (`Ctrl+``) ve:

```bash
ssh mesaidefteri-prod
cd /opt/mesaidefteri
```

### Alternatif 2: VS Code Kullanın

Remote-SSH için VS Code kullanabilirsiniz:

1. VS Code'u yükleyin
2. Remote-SSH extension'ını yükleyin
3. Server'a bağlanın
4. Gerekirse Cursor'a geri dönün

### Alternatif 3: SSHFS Mount (macOS/Linux)

```bash
# SSHFS kurulumu
brew install macfuse sshfs  # macOS
# veya
sudo apt install sshfs      # Linux

# Mount
mkdir ~/mesaidefteri-remote
sshfs root@YOUR_SERVER_IP:/opt/mesaidefteri ~/mesaidefteri-remote

# Cursor'da aç
# File → Open Folder → ~/mesaidefteri-remote
```

## Önerilen Cursor Extension'ları

1. **Remote - SSH** (`ms-vscode-remote.remote-ssh`)
2. **Docker** (`ms-azuretools.vscode-docker`)
3. **GitLens** (`eamodio.gitlens`)
4. **ESLint** (`dbaeumer.vscode-eslint`)
5. **Prettier** (`esbenp.prettier-vscode`)
6. **Prisma** (`Prisma.prisma`)

## Extension Yükleme Kontrolü

```bash
# Cursor extension klasörünü kontrol et (Mac)
ls ~/.cursor/extensions/

# Veya Cursor'da
# Command Palette → "Extensions: Show Installed Extensions"
```

## Sorun Giderme

### Extension Yüklenmiyor
- Cursor'u tamamen kapatıp açın
- Cursor'u güncelleyin
- Manuel olarak extension ID ile yüklemeyi deneyin

### Remote-SSH Komutu Görünmüyor
- Extension'ın yüklendiğinden emin olun
- Cursor'u yeniden başlatın
- VS Code kullanmayı deneyin

### Bağlantı Hatası
- SSH config'i kontrol edin
- Key permissions kontrol edin (`chmod 600 ~/.ssh/mesaidefteri_key`)
- Terminal'den SSH bağlantısını test edin
