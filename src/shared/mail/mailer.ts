import 'dotenv/config';

const resendApiKey = getRequiredEnvironmentVariable('RESEND_API_KEY');
const mailFrom = getRequiredEnvironmentVariable('MAIL_FROM');

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

// https://resend.com/docs/api-reference/emails/send-email
export async function sendMail(message: MailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: mailFrom, ...message }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    // Provider response bodies may contain recipient data, so keep them out of errors.
    throw new Error(`Resend responded with HTTP ${response.status}.`);
  }
}

function getRequiredEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} environment variable is required.`);
  }

  return value;
}
