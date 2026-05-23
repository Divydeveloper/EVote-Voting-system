/**
 * Email Utility
 * Handles sending OTP, welcome, and password-reset emails.
 * Uses Nodemailer. In production, swap transport with SES/SendGrid.
 */

const nodemailer = require('nodemailer');

// ─── Create transport ─────────────────────────────────
const createTransport = () => {
  // For development/testing, use Ethereal (fake SMTP)
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: 'test@ethereal.email', pass: 'testpass' },
    });
  }

  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // TLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// ─── Base HTML email template ─────────────────────────
const baseTemplate = (content) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>E-Vote India</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e3a8a,#1d4ed8);padding:32px;text-align:center;">
      <div style="font-size:32px;margin-bottom:8px;">🗳️</div>
      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;letter-spacing:1px;">E-VOTE INDIA</h1>
      <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px;letter-spacing:2px;">ELECTION COMMISSION OF INDIA</p>
    </div>

    <!-- Content -->
    <div style="padding:40px 32px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;margin:0;">
        This is an automated message from E-Vote India. Do not reply to this email.<br/>
        <strong>If you did not request this, please ignore this email.</strong>
      </p>
    </div>
  </div>
</body>
</html>`;

// ─── OTP Email ────────────────────────────────────────
exports.sendOTP = async (email, name, otp, purpose = 'verification') => {
  const transport = createTransport();

  const purposeText = {
    verification: 'verify your email address',
    login: 'confirm your login',
    'password-reset': 'reset your password',
  };

  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Hello, ${name}! 👋</h2>
    <p style="color:#64748b;margin:0 0 28px;font-size:15px;line-height:1.6;">
      Use the OTP below to ${purposeText[purpose] || 'proceed'}. This code expires in <strong>${process.env.OTP_EXPIRY || 10} minutes</strong>.
    </p>

    <!-- OTP Box -->
    <div style="background:#f0f7ff;border:2px dashed #3b82f6;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Your One-Time Password</p>
      <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#1d4ed8;font-family:monospace;">${otp}</div>
      <p style="color:#94a3b8;font-size:12px;margin:8px 0 0;">Valid for ${process.env.OTP_EXPIRY || 10} minutes only</p>
    </div>

    <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:14px 18px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:#92400e;font-size:13px;margin:0;">
        ⚠️ <strong>Never share this OTP</strong> with anyone. E-Vote officials will never ask for your OTP.
      </p>
    </div>`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'E-Vote India <noreply@evote.gov.in>',
    to: email,
    subject: `[E-Vote India] Your OTP: ${otp}`,
    html: baseTemplate(content),
  });
};

// ─── Welcome Email ────────────────────────────────────
exports.sendWelcome = async (email, name, voterId) => {
  const transport = createTransport();

  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Welcome to E-Vote India! 🎉</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Dear <strong>${name}</strong>, your account has been successfully created.
    </p>
    <div style="background:#f0fdf4;border:1px solid #86efac;border-radius:12px;padding:20px;margin-bottom:24px;">
      <p style="color:#166534;font-size:14px;margin:0 0 8px;font-weight:600;">Your Voter ID</p>
      <p style="font-size:28px;font-weight:700;color:#15803d;font-family:monospace;margin:0;letter-spacing:4px;">${voterId}</p>
      <p style="color:#4ade80;font-size:12px;margin:8px 0 0;">Keep this safe — you may need it for verification.</p>
    </div>
    <p style="color:#64748b;font-size:14px;line-height:1.6;">
      Please verify your email address to start participating in elections.
      Your vote matters — exercise your democratic right responsibly.
    </p>`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'E-Vote India <noreply@evote.gov.in>',
    to: email,
    subject: `[E-Vote India] Welcome! Your Voter ID: ${voterId}`,
    html: baseTemplate(content),
  });
};

// ─── Password Reset Email ────────────────────────────
exports.sendPasswordReset = async (email, name, resetUrl) => {
  const transport = createTransport();

  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Password Reset Request</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Dear <strong>${name}</strong>, we received a request to reset your password.
      Click the button below to set a new password. This link expires in <strong>1 hour</strong>.
    </p>
    <div style="text-align:center;margin:32px 0;">
      <a href="${resetUrl}" style="background:#1d4ed8;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block;">
        Reset My Password →
      </a>
    </div>
    <p style="color:#94a3b8;font-size:13px;text-align:center;">
      Or copy this link: <br/>
      <span style="color:#3b82f6;word-break:break-all;font-size:12px;">${resetUrl}</span>
    </p>
    <div style="background:#fef2f2;border-left:4px solid #ef4444;padding:14px 18px;border-radius:0 8px 8px 0;margin-top:20px;">
      <p style="color:#991b1b;font-size:13px;margin:0;">
        If you did not request a password reset, please secure your account immediately.
      </p>
    </div>`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'E-Vote India <noreply@evote.gov.in>',
    to: email,
    subject: '[E-Vote India] Password Reset Request',
    html: baseTemplate(content),
  });
};

// ─── Vote Confirmation Email ──────────────────────────
exports.sendVoteConfirmation = async (email, name, electionTitle, candidateName, voteHash) => {
  const transport = createTransport();

  const content = `
    <h2 style="color:#1e293b;margin:0 0 8px;font-size:22px;">Vote Cast Successfully! ✅</h2>
    <p style="color:#64748b;margin:0 0 24px;font-size:15px;line-height:1.6;">
      Dear <strong>${name}</strong>, your vote has been recorded successfully.
    </p>
    <div style="background:#f0f7ff;border:1px solid #93c5fd;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="margin-bottom:12px;">
        <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Election</span>
        <p style="color:#1e293b;font-weight:600;margin:4px 0 0;font-size:15px;">${electionTitle}</p>
      </div>
      <div style="margin-bottom:12px;">
        <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Voted For</span>
        <p style="color:#1d4ed8;font-weight:600;margin:4px 0 0;font-size:15px;">${candidateName}</p>
      </div>
      <div>
        <span style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Vote Reference</span>
        <p style="color:#475569;font-family:monospace;margin:4px 0 0;font-size:12px;word-break:break-all;">${voteHash.substring(0, 64)}...</p>
      </div>
    </div>
    <p style="color:#64748b;font-size:13px;">
      Your vote is anonymous and cannot be traced back to you. The reference hash is for integrity verification only.
    </p>`;

  await transport.sendMail({
    from: process.env.EMAIL_FROM || 'E-Vote India <noreply@evote.gov.in>',
    to: email,
    subject: `[E-Vote India] Vote Confirmation — ${electionTitle}`,
    html: baseTemplate(content),
  });
};
