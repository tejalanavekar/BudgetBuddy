import nodemailer from 'nodemailer';

// Gmail SMTP via an App Password (not the real account password) — fine for a
// personal/dev project; swap EMAIL_USER/EMAIL_APP_PASSWORD (or the transport
// entirely) later without touching any calling code.
//
// Built lazily (not at module load) because ES module imports are hoisted and
// resolved before the importing file's own top-level code runs — server.js's
// dotenv.config() call executes AFTER this file's import chain, so EMAIL_USER/
// EMAIL_APP_PASSWORD would still be undefined if the transporter were created here.
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD
      }
    });
  }
  return transporter;
};

export const sendPasswordResetEmail = async (toEmail, resetLink) => {
  await getTransporter().sendMail({
    from: `"Budget Buddy" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Reset your Budget Buddy password',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #03363D;">Reset your password</h2>
        <p>We got a request to reset your Budget Buddy password. Click the button below to choose a new one — this link expires in 1 hour.</p>
        <p style="text-align: center; margin: 32px 0;">
          <a href="${resetLink}" style="background: #2dd4bf; color: #03363D; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 700;">
            Reset Password
          </a>
        </p>
        <p style="color: #666; font-size: 13px;">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      </div>
    `
  });
};
