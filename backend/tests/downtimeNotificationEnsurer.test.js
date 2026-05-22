/* eslint-env jest */

import { jest } from '@jest/globals';
import {
  insertApp,
  updateAppDownOrNot,
  updateAppEmailSent,
  selectAppById,
} from '../schema/appModel.js';
import { insertUser } from '../schema/userModel.js';

// ── Module mock (must come before dynamic imports) ────────────────────────────

jest.unstable_mockModule('../util/emailService.js', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

const { checkAndNotifyDowntime } = await import('../util/downtimeNotificationEnsurer.js');
const emailService = await import('../util/emailService.js');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Create a user + app, then optionally set downOrNot and/or emailSent in the DB.
 */
async function setupApp({ downOrNot = [], emailSent = false } = {}) {
  const user = await insertUser({
    username: 'owner',
    email: 'owner@example.com',
    passwordHash: 'hashed-password',
  });

  const app = await insertApp({
    ownerId: user.id,
    name: 'Test App',
    url: 'https://example.com',
  });

  if (downOrNot.length > 0) {
    await updateAppDownOrNot(app.id, downOrNot);
  }

  if (emailSent) {
    await updateAppEmailSent(app.id, true);
  }

  return { user, app };
}

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  emailService.sendEmail.mockClear();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('checkAndNotifyDowntime', () => {

  // ── Unknown app ─────────────────────────────────────────────────────────────

  test('returns emailed:false for unknown app id', async () => {
    const result = await checkAndNotifyDowntime('00000000-0000-0000-0000-000000000000');

    expect(result.emailed).toBe(false);
    expect(result.reason).toBe('App not found');
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  // ── Not enough data ─────────────────────────────────────────────────────────

  test('does not email when fewer than 3 checks are recorded', async () => {
    const { app } = await setupApp({ downOrNot: [false, false] });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(false);
    expect(result.reason).toMatch(/fewer than 3/i);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  // ── Mixed window (not all down) ─────────────────────────────────────────────

  test('does not email when not all 3 checks are down', async () => {
    const { app } = await setupApp({ downOrNot: [true, false, false] });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(false);
    expect(result.reason).toMatch(/not been down for 3 consecutive/i);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  // ── Downtime notification ───────────────────────────────────────────────────

  test('sends a downtime email and sets emailSent=true in DB when all 3 checks are down', async () => {
    const { app, user } = await setupApp({ downOrNot: [false, false, false] });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(true);
    expect(result.reason).toMatch(/notification sent/i);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

    const [to, subject, body] = emailService.sendEmail.mock.calls[0];
    expect(to).toBe(user.email);
    expect(subject).toContain(app.name);
    expect(body).toContain(app.name);

    // DB flag must be persisted
    const updated = await selectAppById(app.id);
    expect(updated.emailSent).toBe(true);
  });

  test('does NOT send a second downtime email while the site remains down (no spam)', async () => {
    const { app } = await setupApp({ downOrNot: [false, false, false], emailSent: true });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(false);
    expect(result.reason).toMatch(/already sent/i);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  // ── Recovery notification ───────────────────────────────────────────────────

  test('sends a recovery email and sets emailSent=false in DB when site comes back up', async () => {
    const { app, user } = await setupApp({ downOrNot: [false, false, true], emailSent: true });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(true);
    expect(result.reason).toMatch(/recovery notification sent/i);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

    const [to, subject, body] = emailService.sendEmail.mock.calls[0];
    expect(to).toBe(user.email);
    expect(subject).toContain(app.name);
    expect(subject).toMatch(/back up/i);
    expect(body).toContain(app.name);

    // DB flag must be cleared
    const updated = await selectAppById(app.id);
    expect(updated.emailSent).toBe(false);
  });

  test('does NOT send a recovery email if site is up but no downtime alert was sent', async () => {
    const { app } = await setupApp({ downOrNot: [false, false, true], emailSent: false });

    const result = await checkAndNotifyDowntime(app.id);

    expect(result.emailed).toBe(false);
    expect(result.reason).toMatch(/no outstanding downtime alert/i);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });

  // ── Full incident cycle ─────────────────────────────────────────────────────

  test('full cycle: downtime email → no spam → recovery email → new downtime email', async () => {
    const { app } = await setupApp({ downOrNot: [false, false, false] });

    // 1. First downtime — should email
    const firstDown = await checkAndNotifyDowntime(app.id);
    expect(firstDown.emailed).toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

    // 2. Still down — should NOT email again
    const stillDown = await checkAndNotifyDowntime(app.id);
    expect(stillDown.emailed).toBe(false);
    expect(stillDown.reason).toMatch(/already sent/i);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);

    // 3. Site recovers — recovery email should be sent, flag cleared
    await updateAppDownOrNot(app.id, [false, false, true]);
    const recovered = await checkAndNotifyDowntime(app.id);
    expect(recovered.emailed).toBe(true);
    expect(recovered.reason).toMatch(/recovery/i);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);

    const afterRecovery = await selectAppById(app.id);
    expect(afterRecovery.emailSent).toBe(false);

    // 4. Second outage — flag is clear, so a new downtime email should fire
    await updateAppDownOrNot(app.id, [false, false, false]);
    const secondDown = await checkAndNotifyDowntime(app.id);
    expect(secondDown.emailed).toBe(true);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(3);
  });
});