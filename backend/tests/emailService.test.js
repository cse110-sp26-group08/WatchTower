/* eslint-env jest */

import { jest } from '@jest/globals';

/**
 * IMPORTANT:
 * Mock MUST happen BEFORE importing the module under test
 */
jest.unstable_mockModule('@sendgrid/mail', () => ({
  default: {
    setApiKey: jest.fn(),
    send: jest.fn().mockResolvedValue([{ statusCode: 202 }]),
  },
}));

const { sendEmail, sendDownEmail } = await import('../util/emailService.js');

describe('emailService', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('sendEmail', () => {
    test('sends email with correct parameters', async () => {
      const testEmail = 'test@example.com';
      const testSubject = 'Test Subject';
      const testBody = 'Test Body';

      await sendEmail(testEmail, testSubject, testBody);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[emailService] Email sent successfully to ${testEmail}. Status: 202`
      );
    });
  });

  describe('sendDownEmail', () => {
    test('sends downtime alert email with formatted subject', async () => {
      await sendDownEmail('owner@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status: 202')
      );
    });

    test('sends email to correct recipient', async () => {
      const testEmail = 'owner@example.com';

      await sendDownEmail(testEmail);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(testEmail)
      );
    });

    test('includes HTML formatted body with WatchTower link', async () => {
      await sendDownEmail('owner@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('<!DOCTYPE html>')
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('https://watchtower-monitoring.com')
      );
    });

    test('email body contains call-to-action button', async () => {
      await sendDownEmail('owner@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('cta-button')
      );
    });

    test('email body contains professional formatting and footer', async () => {
      await sendDownEmail('owner@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('WatchTower Monitoring System')
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('© 2026 WatchTower')
      );
    });
  });
});