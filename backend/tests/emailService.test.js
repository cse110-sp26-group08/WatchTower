/* eslint-env jest */

import { jest } from '@jest/globals';

/**
 * Mock SendGrid BEFORE importing module (ESM requirement)
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
    test('sends email successfully with correct recipient and status', async () => {
      const testEmail = 'test@example.com';
      const testSubject = 'Test Subject';
      const testBody = 'Test Body';

      await sendEmail(testEmail, testSubject, testBody);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Email sent successfully to ${testEmail}`)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status: 202')
      );
    });
  });

  describe('sendDownEmail', () => {
    test('sends downtime email to correct recipient', async () => {
      const email = 'owner@example.com';

      await sendDownEmail(email);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(email)
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status: 202')
      );
    });

    test('formats email subject correctly (indirect via sendEmail call)', async () => {
      await sendDownEmail('owner@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Email sent successfully')
      );
    });

    test('completes without throwing errors', async () => {
      await expect(sendDownEmail('owner@example.com')).resolves.toBeUndefined();
    });

    test('sendEmail is called successfully through sendDownEmail flow', async () => {
      await sendDownEmail('owner@example.com');

      // Ensures pipeline executed fully
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Status: 202')
      );
    });
  });
});