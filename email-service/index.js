import "dotenv/config";
import express from "express";
import { createEmailClient } from "@opencoredev/email-sdk";
import { smtp } from "@opencoredev/email-sdk/smtp";

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT = process.env.EMAIL_SERVICE_PORT || 3001;
const SMTP_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.EMAIL_PORT || "587");
const SMTP_USER = process.env.EMAIL_HOST_USER || "";
const SMTP_PASS = process.env.EMAIL_HOST_PASSWORD || "";
const EMAIL_FROM = process.env.EMAIL_FROM || process.env.EMAIL_HOST_USER || "";
const EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || "AI Legal Assistant";

// ─── Email Client ─────────────────────────────────────────────────────────────
const emailClient = createEmailClient({
  adapters: [
    smtp({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: false, // STARTTLS on port 587
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    }),
  ],
});

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json({ limit: "2mb" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ai-legal-email-service" });
});

/**
 * POST /send
 * Body: {
 *   to: string,
 *   subject: string,
 *   html: string,
 *   text?: string,
 *   from?: string,
 *   replyTo?: string,
 * }
 */
app.post("/send", async (req, res) => {
  const { to, subject, html, text, from, replyTo } = req.body;

  // Validation
  if (!to || !subject || (!html && !text)) {
    return res.status(400).json({
      success: false,
      error: "Missing required fields: to, subject, and html or text.",
    });
  }

  // Dev mode: if SMTP credentials not set, simulate success
  if (!SMTP_USER || !SMTP_PASS) {
    console.log(`[DEV MODE] Simulating email to: ${to}`);
    console.log(`[DEV MODE] Subject: ${subject}`);
    return res.json({ success: true, message: "DEV MODE: Email simulated (no SMTP credentials configured)." });
  }

  try {
    await emailClient.send({
      from: from || `${EMAIL_FROM_NAME} <${EMAIL_FROM}>`,
      to,
      subject,
      html: html || undefined,
      text: text || undefined,
      ...(replyTo ? { replyTo } : {}),
    });

    console.log(`[EMAIL] Sent to: ${to} | Subject: ${subject}`);
    return res.json({ success: true, message: `Email sent successfully to ${to}` });
  } catch (err) {
    console.error("[EMAIL ERROR]", err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Failed to send email. Please try again.",
    });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AI Legal Email Service running on http://localhost:${PORT}`);
  console.log(`   SMTP: ${SMTP_HOST}:${SMTP_PORT}`);
  console.log(`   From: ${EMAIL_FROM_NAME} <${EMAIL_FROM}>`);
  if (!SMTP_USER) console.log("   ⚠️  No SMTP credentials — running in DEV MODE (emails simulated)\n");
});
