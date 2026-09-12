const nodemailer = require("nodemailer");

/**
 * Lazily builds a transporter from env vars. Returns null if EMAIL_USER
 * isn't set, so the app can run and be tested without SMTP configured —
 * callers fall back to logging the code to the console in that case.
 */
function buildTransporter() {
  if (!process.env.EMAIL_USER) return null;

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false, // true for port 465, false for 587 (STARTTLS)
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

/**
 * Sends the password reset code email. If SMTP isn't configured, logs
 * the code to the server console instead of throwing — lets you test
 * the full forgot-password flow locally before setting up a provider.
 */
async function sendResetCodeEmail(toEmail, code) {
  const transporter = buildTransporter();

  if (!transporter) {
    console.log(`\n📧 [DEV MODE — no SMTP configured] Password reset code for ${toEmail}: ${code}\n`);
    return { delivered: false, devMode: true };
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: toEmail,
    subject: "Your AI CareerPilot password reset code",
    text: `Your password reset code is ${code}. It expires in ${process.env.RESET_CODE_EXPIRES_MINUTES || 15} minutes. If you didn't request this, you can ignore this email.`,
    html: `
      <div style="font-family: -apple-system, Arial, sans-serif; max-width: 420px; margin: 0 auto;">
        <h2 style="color: #14203D;">Reset your password</h2>
        <p>Use this code to reset your AI CareerPilot password:</p>
        <div style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #14203D; background: #F7F8FA; padding: 16px 20px; border-radius: 12px; text-align: center;">
          ${code}
        </div>
        <p style="color: #5B6478; font-size: 13px;">
          This code expires in ${process.env.RESET_CODE_EXPIRES_MINUTES || 15} minutes.
          If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  return { delivered: true, devMode: false };
}

module.exports = { sendResetCodeEmail };
