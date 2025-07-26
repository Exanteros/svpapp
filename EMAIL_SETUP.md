# FREE Self-Hosted Email System for Team Addresses

## Overview
This system automatically receives emails sent to generated team addresses like:
- `svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de`
- `svp-teamname-abc123@email.rasenturnier.sv-puschendorf.de`

And groups them into the respective team chats in the admin portal.

**🆓 COMPLETELY FREE - NO PAID SERVICES REQUIRED!**

## Self-Hosted SMTP Server Setup

### 1. Start the SMTP Server

```bash
# Start the custom SMTP server
npm run smtp

# Or manually with custom port
SMTP_PORT=2525 npm run smtp
```

### 2. Configure DNS Records

You need to set up DNS records to receive emails:

```dns
# MX Record (Mail Exchange)
email.rasenturnier.sv-puschendorf.de.    IN    MX    10    your-server-domain.com.

# A Record for your server
your-server-domain.com.    IN    A    YOUR_SERVER_IP

# Optional: Mail subdomain
mail.rasenturnier.sv-puschendorf.de.    IN    A    YOUR_SERVER_IP
```

### 3. Environment Variables

Create/update your `.env.local`:

```env
# Email domain for team addresses
TEAM_EMAIL_DOMAIN=email.rasenturnier.sv-puschendorf.de

# SMTP server settings
SMTP_PORT=2525
SMTP_HOST=localhost

# For sending replies (optional - can use same server)
SMTP_OUT_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## Testing Email Reception

### Test with HTTP POST (Development)

```bash
curl -X POST http://localhost:3000/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "to": "svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de",
    "from": "test@example.com",
    "subject": "Test Email",
    "text": "This is a test email message",
    "messageId": "test-123"
  }'
```

### Simulate SendGrid Webhook

```bash
curl -X POST http://localhost:3000/api/email/webhooks/sendgrid \
  -H "Content-Type: multipart/form-data" \
  -F "to=svp-svmuster-fxoua8@email.rasenturnier.sv-puschendorf.de" \
  -F "from=sender@example.com" \
  -F "subject=Test Subject" \
  -F "text=Test message body"
```

## How It Works

1. **Email Reception**: Incoming emails are received via webhook
2. **Team Matching**: System finds the team based on the email address
3. **Conversation Grouping**: Emails are grouped into conversations by subject/thread
4. **Chat Integration**: Messages appear in the team's chat in the admin portal
5. **Real-time Updates**: Admin can see new messages with unread counts

## Troubleshooting

### Check Webhook Logs
```bash
# Check webhook logs in database
sqlite3 database.sqlite "SELECT * FROM email_webhook_logs ORDER BY created_at DESC LIMIT 10;"
```

### Verify Team Emails
```bash
# Check team emails
sqlite3 database.sqlite "SELECT * FROM team_emails WHERE is_active = 1;"
```

### Test API Endpoints
```bash
# Test team email creation
curl "http://localhost:3000/api/email/team-emails?teamId=1"

# Test conversations
curl "http://localhost:3000/api/email/conversations?teamId=1"
```

## Security Notes

- Webhook endpoints should be secured in production
- Consider rate limiting for webhook endpoints
- Validate webhook signatures when available
- Monitor for spam and abuse
##
# 4. Test the System

```bash
# Test the email system components
npm run email-test

# Test with a real email via HTTP
curl -X POST http://localhost:3000/api/email/receive \
  -H "Content-Type: application/json" \
  -d '{
    "to": "svp-testteam-abc123@email.rasenturnier.sv-puschendorf.de",
    "from": "sender@example.com",
    "subject": "Test Email",
    "text": "This is a test email message",
    "messageId": "test-123"
  }'
```

## Production Setup

### 1. Server Requirements

- Linux server with public IP
- Port 25 (SMTP) or custom port (2525) open
- Domain with DNS control
- Node.js and your Next.js app running

### 2. Firewall Configuration

```bash
# Allow SMTP port (if using standard port 25)
sudo ufw allow 25/tcp

# Or allow custom port (recommended)
sudo ufw allow 2525/tcp

# Allow HTTP/HTTPS for webhooks
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### 3. Process Management

Use PM2 or similar to keep both your Next.js app and SMTP server running:

```bash
# Install PM2
npm install -g pm2

# Start Next.js app
pm2 start npm --name "svp-app" -- start

# Start SMTP server
pm2 start npm --name "svp-smtp" -- run smtp

# Save PM2 configuration
pm2 save
pm2 startup
```

### 4. Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/svp-turnier
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Alternative: Email Forwarding Setup

If you can't run your own SMTP server, you can use email forwarding:

### 1. Set up email forwarding on your domain provider

Forward emails from `*@email.rasenturnier.sv-puschendorf.de` to a single inbox.

### 2. Use IMAP to read emails

```typescript
// Example IMAP integration (add to your project if needed)
import Imap from 'imap';

const imap = new Imap({
  user: 'your-email@domain.com',
  password: 'your-password',
  host: 'imap.your-provider.com',
  port: 993,
  tls: true
});
```

### 3. Poll for new emails

Set up a cron job or interval to check for new emails and process them.

## Email Flow Diagram

```
Sender → email.rasenturnier.sv-puschendorf.de → Your SMTP Server → Database → Admin Chat
   ↓                                                    ↓
External Email                                    Team Email System
   ↓                                                    ↓
svp-teamname-abc123@email...                    Conversation Grouping
```

## Troubleshooting Common Issues

### SMTP Server Won't Start
- Check if port is already in use: `lsof -i :2525`
- Verify permissions for binding to port
- Check firewall settings

### Emails Not Received
- Verify DNS MX record: `dig MX email.rasenturnier.sv-puschendorf.de`
- Test SMTP connection: `telnet your-server-ip 2525`
- Check server logs for errors

### Database Issues
- Verify email tables exist: `sqlite3 database.sqlite ".tables"`
- Check for migration errors in logs
- Run email system test: `npm run email-test`

### Team Emails Not Created
- Check admin portal for team email generation
- Verify team IDs are being passed correctly
- Check API endpoint responses in browser dev tools

## Advanced Configuration

### Custom Email Templates
Edit templates in the database:
```sql
UPDATE email_templates 
SET body_html = '<h1>Custom Welcome Message</h1><p>{{teamName}}</p>' 
WHERE name = 'team_confirmation';
```

### Spam Protection
Add basic spam filtering in `smtp-server.ts`:
```typescript
// Add to onRcptTo callback
if (this.isSpam(address.address)) {
  callback(new Error('Rejected'));
  return;
}
```

### Email Attachments
The system supports attachments - they're stored as JSON in the database and can be accessed through the API.

## Support

If you encounter issues:
1. Check the console logs for errors
2. Run `npm run email-test` to verify system components
3. Test with HTTP POST before trying real SMTP
4. Verify DNS configuration with online tools