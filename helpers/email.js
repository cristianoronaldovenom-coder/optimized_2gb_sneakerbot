import nodemailer from 'nodemailer';
import logger from './logger.js';

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || ''
    }
  });
};

export const sendSuccessEmail = async ({ to, taskId, productUrl, size }) => {
  if (!to) return;
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'SneakerBot - Checkout Successful!',
      html: `
        <h2>Checkout Successful!</h2>
        <p><strong>Task ID:</strong> ${taskId}</p>
        <p><strong>Product:</strong> <a href="${productUrl}">${productUrl}</a></p>
        ${size ? `<p><strong>Size:</strong> ${size}</p>` : ''}
        <p>Your order has been placed successfully.</p>
      `
    });
    logger.info(`Success email sent to ${to} for task ${taskId}`);
  } catch (err) {
    logger.error(`Failed to send email to ${to}: ${err.message}`);
  }
};
