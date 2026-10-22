import 'dotenv/config';
import nodemailer from 'nodemailer';

const smtpPort = Number(getRequiredEnvironmentVariable('SMTP_PORT'));
const mailFrom = getRequiredEnvironmentVariable('MAIL_FROM');

const transporter = nodemailer.createTransport({
  host: getRequiredEnvironmentVariable('SMTP_HOST'),
  port: smtpPort,
  // Port 465 is implicit TLS; other ports upgrade with STARTTLS.
  secure: smtpPort === 465,
  auth: {
    user: getRequiredEnvironmentVariable('SMTP_USER'),
    pass: getRequiredEnvironmentVariable('SMTP_PASSWORD'),
  },
});

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(message: MailMessage): Promise<void> {
  await transporter.sendMail({ from: mailFrom, ...message });
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}
