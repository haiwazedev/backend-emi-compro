import type { MailMessage } from '../../shared/mail/mailer.js';

type Recipient = { name: string; email: string };

export function buildInviteMail(to: Recipient, url: string): MailMessage {
  return buildLinkMail(to, url, {
    subject: 'Aktivasi akun CMS PLN EMI',
    intro:
      'Anda telah diundang ke CMS PLN EMI. Buat kata sandi untuk mengaktifkan akun Anda.',
    action: 'Aktifkan akun',
    expiry: 'Tautan ini berlaku selama 72 jam.',
  });
}

export function buildResetMail(to: Recipient, url: string): MailMessage {
  return buildLinkMail(to, url, {
    subject: 'Atur ulang kata sandi CMS PLN EMI',
    intro: 'Kami menerima permintaan untuk mengatur ulang kata sandi Anda.',
    action: 'Atur ulang kata sandi',
    expiry:
      'Tautan ini berlaku selama 60 menit. Abaikan email ini jika Anda tidak memintanya.',
  });
}

function buildLinkMail(
  to: Recipient,
  url: string,
  copy: { subject: string; intro: string; action: string; expiry: string },
): MailMessage {
  const greeting = `Halo ${to.name},`;

  return {
    to: to.email,
    subject: copy.subject,
    text: [greeting, copy.intro, `${copy.action}: ${url}`, copy.expiry].join(
      '\n\n',
    ),
    html: [
      `<p>${escapeHtml(greeting)}</p>`,
      `<p>${copy.intro}</p>`,
      `<p><a href="${escapeHtml(url)}">${copy.action}</a></p>`,
      `<p>${copy.expiry}</p>`,
    ].join(''),
  };
}

// The name is admin-entered text, so it must not become markup.
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
