# 🆓 FREE Self-Hosted Email Receiving Setup

## Overview
This system automatically receives emails sent to generated team addresses like:
- `svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de`
- `svp-teamname-abc123@email.rasenturnier.sv-puschendorf.de`

And groups them into the respective team chats in the admin portal - **completely FREE!**

## 🚀 Built-in SMTP Server

Your app includes a custom SMTP server that runs alongside Next.js - no external services needed!

### 1. Automatic Startup

The SMTP server starts automatically when you run your app:

```bash
npm run dev    # Development
npm start      # Production
```

You'll see:
```
✅ SMTP Server running on port 2525
📧 Ready to receive emails for *.email.rasenturnier.sv-puschendorf.de
```

### 2. DNS Configuration

Point your domain to your server:

```dns
# Replace YOUR_SERVER_IP with your actual server IP
MX Record: email.rasenturnier.sv-puschendorf.de → YOUR_SERVER_IP (Priority: 10)
```

### 3. Port Setup Options

**Option A: Development (Port 2525)**
```bash
# Works out of the box - no root access needed
# Emails sent to your-server:2525 will be received
```

**Option B: Production (Port 25)**
```bash
# Redirect standard email port to our server
sudo iptables -t nat -A PREROUTING -p tcp --dport 25 -j REDIRECT --to-port 2525

# Make permanent
sudo iptables-save > /etc/iptables/rules.v4
```

**Option C: Direct Port 25**
```bash
# Run as root to bind to port 25
sudo SMTP_PORT=25 npm start
```

### 4. Environment Variables

```env
# .env.local
TEAM_EMAIL_DOMAIN=email.rasenturnier.sv-puschendorf.de
SMTP_PORT=2525
```

## 🧪 Testing Your Setup

### Test 1: HTTP Simulation (Quick Test)

```bash
curl -X POST http://localhost:3000/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "to": "svp-testteam-abc123@email.rasenturnier.sv-puschendorf.de",
    "from": "test@example.com", 
    "subject": "Test Email",
    "text": "This is a test message"
  }'
```

### Test 2: Real SMTP Test

```bash
# Install test dependencies
npm install nodemailer

# Run the email test script
node scripts/test-email.js
```

### Test 3: Manual Email Test

Send an email from any email client to:
`svp-testteam-abc123@email.rasenturnier.sv-puschendorf.de`

## 🔍 Monitoring & Debugging

### Check Email Reception

```bash
# View recent conversations
sqlite3 database.sqlite "SELECT * FROM email_conversations ORDER BY created_at DESC LIMIT 5;"

# View recent messages  
sqlite3 database.sqlite "SELECT * FROM email_messages ORDER BY created_at DESC LIMIT 10;"

# Check team emails
sqlite3 database.sqlite "SELECT * FROM team_emails WHERE is_active = 1;"
```

### Server Logs

Watch the console for SMTP activity:
```
📧 SMTP Connection from: 192.168.1.100
📧 Mail from: sender@example.com
📧 Mail to: svp-team-abc123@email.rasenturnier.sv-puschendorf.de
✅ Valid team email found: svp-team-abc123@email.rasenturnier.sv-puschendorf.de
📧 Processing incoming email...
✅ Email processed successfully, conversation: 123
```

## 🛠️ How It Works

1. **SMTP Server**: Receives emails on port 2525 (or 25)
2. **Email Parsing**: Extracts sender, recipient, subject, body
3. **Team Matching**: Finds team by email address
4. **Conversation Grouping**: Groups emails by subject/thread
5. **Database Storage**: Saves to SQLite database
6. **Admin Interface**: Shows in team chat with scrolling

## 🔒 Security Features

- **Recipient Validation**: Only accepts emails for valid team addresses
- **Rate Limiting**: Built-in connection limits
- **Spam Protection**: Basic header validation
- **Local Storage**: All data stays on your server

## 🚨 Troubleshooting

### SMTP Server Won't Start
```bash
# Check if port is in use
lsof -i :2525

# Try different port
SMTP_PORT=2526 npm start
```

### Emails Not Received
```bash
# Test DNS resolution
nslookup email.rasenturnier.sv-puschendorf.de

# Test port connectivity
telnet your-server-ip 2525
```

### Database Issues
```bash
# Check database permissions
ls -la database.sqlite

# Verify tables exist
sqlite3 database.sqlite ".tables"
```

## 🎯 Production Deployment

### Docker Setup
```dockerfile
# Add to your Dockerfile
EXPOSE 2525
ENV SMTP_PORT=2525
```

### Systemd Service
```ini
# /etc/systemd/system/svp-email.service
[Unit]
Description=SVP Email Server
After=network.target

[Service]
Type=simple
User=svp
WorkingDirectory=/path/to/svpapp
ExecStart=/usr/bin/npm start
Environment=SMTP_PORT=2525
Restart=always

[Install]
WantedBy=multi-user.target
```

### Firewall Rules
```bash
# Allow SMTP traffic
sudo ufw allow 2525/tcp
sudo ufw allow 25/tcp
```

## 🎉 Success!

Once set up, emails sent to any team address will automatically:
1. ✅ Be received by your SMTP server
2. ✅ Get parsed and validated
3. ✅ Be grouped into conversations
4. ✅ Appear in the admin panel
5. ✅ Be scrollable in the team chat interface

**Total cost: $0** - Everything runs on your own server!