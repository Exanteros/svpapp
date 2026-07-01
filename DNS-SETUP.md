# DNS Konfiguration für email.rasenturnier.sv-puschendorf.de

## 🎯 MX Records (Mail Exchange)

### Für Tests mit Tunnel:
```
email.rasenturnier.sv-puschendorf.de.  MX  10  ihre-tunnel-url.ngrok.io.
```

### Für Produktion mit eigenem Server:
```
email.rasenturnier.sv-puschendorf.de.  MX  10  mail.sv-puschendorf.de.
```

## 🔧 Zusätzliche DNS Records

### A Record für Mail-Server:
```
mail.sv-puschendorf.de.  A  ihre-server-ip
```

### SPF Record (Sender Policy Framework):
```
email.rasenturnier.sv-puschendorf.de.  TXT  "v=spf1 include:mail.sv-puschendorf.de ~all"
```

### DMARC Record:
```
_dmarc.email.rasenturnier.sv-puschendorf.de.  TXT  "v=DMARC1; p=none; rua=mailto:admin@sv-puschendorf.de"
```

## 📋 Schritt-für-Schritt Setup

### 1. Test-Setup mit Tunnel:
1. Script ausführen: `./scripts/start-email-tunnel.sh`
2. Tunnel-URL notieren (z.B. https://abc123.ngrok.io)
3. MX Record setzen: `email.rasenturnier.sv-puschendorf.de. MX 10 abc123.ngrok.io.`
4. Test-E-Mail senden an: `svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de`

### 2. Produktion-Setup:
1. Eigenen Mail-Server aufsetzen (Postfix + Dovecot)
2. Webhook-Weiterleitung konfigurieren
3. DNS Records permanent setzen
4. SSL-Zertifikat installieren

## 🧪 Testing

### Test Webhook direkt:
```bash
curl -X POST https://ihre-domain.com/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "to": "svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de",
    "from": "test@example.com",
    "subject": "Test Email",
    "text": "Dies ist eine Test-E-Mail"
  }'
```

### Test mit Raw Email:
```bash
curl -X POST https://ihre-domain.com/api/email/receive \
  -H "Content-Type: text/plain" \
  -d 'From: test@example.com
To: svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de
Subject: Raw Test Email

Dies ist eine Raw-Test-E-Mail.'
```

## ⚙️ Mail-Server Setup (Optional)

### Postfix Konfiguration:
```
# /etc/postfix/main.cf
myhostname = mail.sv-puschendorf.de
mydomain = sv-puschendorf.de
virtual_alias_domains = email.rasenturnier.sv-puschendorf.de
virtual_alias_maps = hash:/etc/postfix/virtual

# Webhook Weiterleitung
transport_maps = hash:/etc/postfix/transport
```

### Virtual Aliases:
```
# /etc/postfix/virtual
@email.rasenturnier.sv-puschendorf.de webhook
```

### Transport Map:
```
# /etc/postfix/transport
webhook: webhook:
```

### Webhook Transport:
```bash
# Script für E-Mail-Weiterleitung an Webhook
#!/bin/bash
curl -X POST https://ihre-domain.com/api/email/receive \
  -H "Content-Type: text/plain" \
  --data-binary @-
```
