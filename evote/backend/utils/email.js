/**
 * Email Utility
 * Uses Resend for sending OTP and other emails
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Base HTML Template ───────────────────────────────
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

      <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">
        E-VOTE INDIA
      </h1>

      <p style="color:rgba(255,255,255,0.7);margin-top:8px;">
        Election Commission of India
      </p>
    </div>

    <!-- Content -->
    <div style="padding:40px 32px;">
      ${content}
    </div>

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
      <p style="color:#94a3b8;font-size:12px;">
        This is an automated email from E-Vote India.
      </p>
    </div>

  </div>
</body>
</html>
`;

// ─── Send OTP Email ───────────────────────────────────
exports.sendOTP = async (email, name, otp, purpose = 'verification') => {
  try {

    const purposeText = {
      verification: 'verify your email address',
      login: 'confirm your login',
      'password-reset': 'reset your password',
    };

    const content = `
      <h2 style="color:#1e293b;">
        Hello, ${name}! 👋
      </h2>

      <p style="color:#64748b;font-size:15px;line-height:1.6;">
        Use the OTP below to ${
          purposeText[purpose] || 'continue'
        }.
      </p>

      <div style="background:#f0f7ff;border:2px dashed #3b82f6;border-radius:12px;padding:28px;text-align:center;margin:28px 0;">
        
        <p style="color:#64748b;font-size:13px;text-transform:uppercase;letter-spacing:2px;">
          Your OTP
        </p>

        <div style="font-size:42px;font-weight:700;letter-spacing:12px;color:#1d4ed8;font-family:monospace;">
          ${otp}
        </div>

      </div>
    `;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: `[E-Vote India] Your OTP: ${otp}`,
      html: baseTemplate(content),
    });

    console.log(`✅ OTP email sent to ${email}`);

  } catch (error) {
    console.log('❌ OTP email failed:', error.message);
  }
};

// ─── Welcome Email ────────────────────────────────────
exports.sendWelcome = async (email, name, voterId) => {
  try {

    const content = `
      <h2 style="color:#1e293b;">
        Welcome to E-Vote India 🎉
      </h2>

      <p>
        Dear <strong>${name}</strong>,
        your account has been created successfully.
      </p>

      <div style="background:#f0fdf4;padding:20px;border-radius:12px;">
        <p>Your Voter ID:</p>

        <h1 style="color:#15803d;letter-spacing:4px;">
          ${voterId}
        </h1>
      </div>
    `;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '[E-Vote India] Welcome',
      html: baseTemplate(content),
    });

    console.log(`✅ Welcome email sent to ${email}`);

  } catch (error) {
    console.log('❌ Welcome email failed:', error.message);
  }
};

// ─── Vote Confirmation Email ──────────────────────────
exports.sendVoteConfirmation = async (
  email,
  name,
  electionTitle,
  candidateName,
  voteHash
) => {
  try {

    const content = `
      <h2 style="color:#1e293b;">
        Vote Cast Successfully ✅
      </h2>

      <p>
        Dear <strong>${name}</strong>,
        your vote has been recorded successfully.
      </p>

      <div style="background:#f0f7ff;border-radius:12px;padding:20px;">
        <p><strong>Election:</strong> ${electionTitle}</p>

        <p><strong>Candidate:</strong> ${candidateName}</p>

        <p><strong>Vote Reference:</strong></p>

        <p style="font-family:monospace;font-size:12px;">
          ${voteHash.substring(0, 64)}...
        </p>
      </div>
    `;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: email,
      subject: '[E-Vote India] Vote Confirmation',
      html: baseTemplate(content),
    });

    console.log(`✅ Vote confirmation sent to ${email}`);

  } catch (error) {
    console.log('❌ Vote confirmation failed:', error.message);
  }
};
