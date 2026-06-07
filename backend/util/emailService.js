/* eslint-env node */

import sgMail from '@sendgrid/mail';

/**
 * Email service using SendGrid.
 *
 * Configuration via environment variables:
 * - SENDGRID_API_KEY: SendGrid API key
 * - SENDGRID_FROM: Sender email address (must be verified in SendGrid)
 *
 * @module utils/emailService
 */

// Initialize SendGrid. Pass apiKey explicitly (CF Workers) or omit to use process.env (Node dev).
function initializeEmailService(apiKey) {
  const key = apiKey ?? process.env.SENDGRID_API_KEY;
  if (!key) {
    throw new Error('SENDGRID_API_KEY is not set in environment variables');
  }
  console.log(`[emailService] Initializing with API key: ${key.substring(0, 10)}...`);
  sgMail.setApiKey(key);
  console.log('[emailService] SendGrid initialized successfully');
}

/**
 * Send an email to a recipient.
 *
 * @param {string} to      - Recipient email address.
 * @param {string} subject - Email subject line.
 * @param {string} body    - Plain-text or HTML email body.
 * @returns {Promise<void>}
 */
async function sendEmail(to, subject, body) {
  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM || 'noreply@watchtower.com',
      subject,
      html: body,
      text: body.replace(/<[^>]*>/g, ''), // Strip HTML tags for plain text fallback
    };

    const response = await sgMail.send(msg);
    console.log(`[emailService] Email sent successfully to ${to}. Status: ${response[0].statusCode}`);
  } catch (error) {
    console.error(`[emailService] Error sending email to ${to}:`, error.message);
    throw error;
  }
}

/**
 * Send a formatted website downtime alert email to a recipient.
 *
 * @param {string} email - Recipient email address.
 * @returns {Promise<void>}
 */
async function sendDownEmail(email) {
  const subject = 'Website Down Alert - WatchTower Notification';
  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 30px; text-align: center; }
          .warning-icon { font-size: 48px; margin-bottom: 10px; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px; }
          .alert-message { background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-bottom: 20px; border-radius: 4px; }
          .alert-message p { margin: 0; color: #991b1b; font-weight: 500; }
          .info-section { margin-bottom: 20px; color: #374151; }
          .info-section p { margin: 10px 0; line-height: 1.6; }
          .cta-button { display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; transition: background-color 0.3s; }
          .cta-button:hover { background-color: #1d4ed8; }
          .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="warning-icon">⚠️</div>
            <h1>Website Down Alert</h1>
          </div>
          <div class="content">
            <div class="alert-message">
              <p>One of your monitored websites is currently down.</p>
            </div>
            <div class="info-section">
              <p>Our monitoring system has detected that your website is not responding. We recommend you investigate the issue immediately.</p>
              <p><strong>What you should do:</strong></p>
              <ul>
                <li>Check your website status</li>
                <li>Review server logs and diagnostics</li>
                <li>Take corrective action if necessary</li>
              </ul>
            </div>
            <div style="text-align: center;">
              <a href="https://watchtower-monitoring.com" class="cta-button">Visit WatchTower Dashboard</a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated alert from WatchTower Monitoring System.</p>
            <p>© 2026 WatchTower. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  await sendEmail(email, subject, htmlBody);
}

export { initializeEmailService, sendEmail, sendDownEmail };