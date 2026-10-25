import 'dotenv/config';
import nodemailer from 'nodemailer';

const mailFrom = getRequiredEnvironmentVariable('MAIL_FROM');
const port = Number(getRequiredEnvironmentVariable('SMTP_PORT'));
const user = process.env.SMTP_USER;

const transporter = nodemailer.createTransport({
  host: getRequiredEnvironmentVariable('SMTP_HOST'),
  port,
  // Port 465 uses implicit TLS; other ports upgrade with STARTTLS.
  secure: port === 465,
  // Relays that allow the server by IP need no credentials.
  auth: user
    ? { user, pass: getRequiredEnvironmentVariable('SMTP_PASS') }
    : undefined,
  connectionTimeout: 10_000,
  greetingTimeout: 10_000,
  socketTimeout: 10_000,
});

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(message: MailMessage): Promise<void> {
  try {
    await transporter.sendMail({ from: mailFrom, ...message });
  } catch (error) {
    // SMTP errors may contain recipient data, so keep only the error code.
    const code = (error as { code?: string }).code ?? 'UNKNOWN';
    throw new Error(`SMTP failed with ${code}.`);
  }
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}
