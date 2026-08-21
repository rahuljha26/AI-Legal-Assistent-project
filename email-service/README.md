# AI Legal Email Service

A lightweight Node.js microservice that powers transactional email for the AI-Legal Assist project using [`@opencoredev/email-sdk`](https://email-sdk.dev) with the SMTP adapter (Gmail-compatible).

## Quick Start

```bash
# 1. Go into the email-service directory
cd email-service

# 2. Install dependencies
npm install

# 3. Copy and fill in your SMTP credentials
cp .env.example .env

# 4. Start the service
npm start
```

The service runs on `http://localhost:3001` by default.

## API

### `GET /health`
Returns service health status.

**Response:**
```json
{ "status": "ok", "service": "ai-legal-email-service" }
```

---

### `POST /send`
Sends a transactional email.

**Request body:**
```json
{
  "to": "recipient@example.com",
  "subject": "Your AI Legal Advice",
  "html": "<h1>Hello</h1><p>Your advice is ready.</p>",
  "text": "Optional plain-text fallback",
  "from": "AI Legal Assistant <your@gmail.com>",
  "replyTo": "optional@reply.com"
}
```

**Response (success):**
```json
{ "success": true, "message": "Email sent successfully to recipient@example.com" }
```

**Response (error):**
```json
{ "success": false, "error": "Reason for failure" }
```

## Environment Variables

| Variable             | Default              | Description                         |
|----------------------|----------------------|-------------------------------------|
| `EMAIL_HOST`         | `smtp.gmail.com`     | SMTP server host                    |
| `EMAIL_PORT`         | `587`                | SMTP server port                    |
| `EMAIL_HOST_USER`    | *(required)*         | Your Gmail address                  |
| `EMAIL_HOST_PASSWORD`| *(required)*         | Gmail App Password                  |
| `EMAIL_FROM_NAME`    | `AI Legal Assistant` | Sender display name                 |
| `EMAIL_SERVICE_PORT` | `3001`               | Port the service listens on         |

## Dev Mode

If `EMAIL_HOST_USER` or `EMAIL_HOST_PASSWORD` is not set, the service runs in **dev mode** — emails are simulated and logged to console without connecting to SMTP.

## Gmail Setup

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Go to **App Passwords** → Generate a password for "Mail"
4. Use that password as `EMAIL_HOST_PASSWORD`
