import nodemailer, { Transporter } from "nodemailer";

let transporter: Transporter | null = null;

export async function getEmailTransporter() {
  if (transporter) {
    return transporter;
  }

  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  ) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    return transporter;
  }

  const testAccount = await nodemailer.createTestAccount();

  console.log("Ethereal account created:");
  console.log("User:", testAccount.user);

  transporter = nodemailer.createTransport({
    host: testAccount.smtp.host,
    port: testAccount.smtp.port,
    secure: testAccount.smtp.secure,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return transporter;
}

export async function sendEmail(params: {
  from: string;
  to: string;
  subject: string;
  html: string;
}) {
  const transport = await getEmailTransporter();

  const info = await transport.sendMail({
    from: params.from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  const previewUrl = nodemailer.getTestMessageUrl(info);

  if (previewUrl) {
    console.log("Ethereal preview:", previewUrl);
  }

  return {
    messageId: info.messageId,
    previewUrl: previewUrl || null,
  };
}