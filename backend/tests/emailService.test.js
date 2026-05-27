/* eslint-env jest */

import { jest } from '@jest/globals';
import { sendEmail, sendDownEmail } from '../util/emailService.js';

describe('emailService', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockClear();
    consoleSpy.mockRestore();
  });

  describe('sendEmail', () => {
    test('sends email with correct parameters', async () => {
      const testEmail = 'test@example.com';
      const testSubject = 'Test Subject';
      const testBody = 'Test Body';

      await sendEmail(testEmail, testSubject, testBody);

      expect(consoleSpy).toHaveBeenCalledWith(
        `[emailService] Sending email to ${testEmail}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `[emailService] Subject : ${testSubject}`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `[emailService] Body    : ${testBody}`
      );
    });
  });

  describe('sendDownEmail', () => {
    test('sends downtime alert email with formatted subject', async () => {
      await sendDownEmail('owner@example.com');

      const subjectCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes('[emailService] Subject')
      );

      expect(subjectCall).toBeDefined();
      expect(subjectCall[0]).toContain('⚠️ Website Down Alert');
    });

    test('sends email to correct recipient', async () => {
      const testEmail = 'owner@example.com';

      await sendDownEmail(testEmail);

      const recipientCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes('[emailService] Sending email to')
      );

      expect(recipientCall).toBeDefined();
      expect(recipientCall[0]).toContain(testEmail);
    });

    test('includes HTML formatted body with WatchTower link', async () => {
      await sendDownEmail('owner@example.com');

      const bodyCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes('[emailService] Body')
      );

      expect(bodyCall).toBeDefined();
      const body = bodyCall[0];

      // Verify HTML structure
      expect(body).toContain('<!DOCTYPE html>');
      expect(body).toContain('<html>');

      // Verify warning elements
      expect(body).toContain('⚠️');
      expect(body).toContain('Website Down Alert');
      expect(body).toContain('One of your monitored websites is currently down');

      // Verify WatchTower link
      expect(body).toContain('https://watchtower-monitoring.com');
      expect(body).toContain('Visit WatchTower Dashboard');

      // Verify styling
      expect(body).toContain('<style>');
      expect(body).toContain('background-color');
    });

    test('email body contains call-to-action button', async () => {
      await sendDownEmail('owner@example.com');

      const bodyCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes('[emailService] Body')
      );

      expect(bodyCall).toBeDefined();
      const body = bodyCall[0];

      expect(body).toContain('cta-button');
      expect(body).toContain('<a href=');
    });

    test('email body contains professional formatting and footer', async () => {
      await sendDownEmail('owner@example.com');

      const bodyCall = consoleSpy.mock.calls.find((call) =>
        call[0].includes('[emailService] Body')
      );

      expect(bodyCall).toBeDefined();
      const body = bodyCall[0];

      // Verify footer
      expect(body).toContain('WatchTower Monitoring System');
      expect(body).toContain('© 2026 WatchTower');

      // Verify content sections
      expect(body).toContain('What you should do');
      expect(body).toContain('Check your website status');
    });
  });
});
