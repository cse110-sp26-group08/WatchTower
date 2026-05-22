/* eslint-env node */

/**
 * Placeholder email service.
 *
 * Replace the body of `sendEmail` with a real transport (e.g. nodemailer,
 * SendGrid, AWS SES) once the email integration is ready.
 *
 * @module utils/emailService
 */

/**
 * Send an email to a recipient.
 *
 * @param {object} options
 * @param {string} options.to      - Recipient email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} options.body    - Plain-text email body.
 * @returns {Promise<void>}
 */
async function sendEmail(to, subject, body) {
  // TODO: replace with real email transport
  console.log(`[emailService] Sending email to ${to}`);
  console.log(`[emailService] Subject : ${subject}`);
  console.log(`[emailService] Body    : ${body}`);
}

export { sendEmail };