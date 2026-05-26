/* eslint-env node */

import { getAppById } from '../controllers/appController.js';
import { getUserById } from '../controllers/userController.js';
import { updateAppEmailSent } from '../schema/appModel.js';
import * as emailService from './emailService.js';

/**
 * Evaluate whether a downtime or recovery notification email should be sent
 * for an app, and send it when appropriate.
 *
 * Downtime email — sent when ALL of these are true:
 *   1. `downOrNot` has exactly 3 entries (the cap enforced by checkDowntimeStatus).
 *   2. All 3 entries are `false` (site down for ~15 minutes).
 *   3. `emailSent` is `false` in the DB (no email already sent for this incident).
 *
 * Recovery email — sent when ALL of these are true:
 *   1. The latest check is `true` (site is back up).
 *   2. `emailSent` is `true` in the DB (meaning we previously notified of an outage).
 *
 * After sending a downtime email  → sets `emailSent = true` in the DB.
 * After sending a recovery email  → sets `emailSent = false` in the DB.
 *
 * @param {string} appId - UUID of the app to evaluate.
 * @returns {Promise<{ emailed: boolean, reason: string }>}
 *   emailed – whether an email was dispatched during this call.
 *   reason  – human-readable explanation of what happened.
 */
async function checkAndNotifyDowntime(appId) {
  // ── 1. Load the app ────────────────────────────────────────────────────────
  const app = await getAppById(appId);

  if (!app) {
    return { emailed: false, reason: 'App not found' };
  }

  const downOrNot = Array.isArray(app.downOrNot) ? app.downOrNot : [];
  const latestCheck = downOrNot[downOrNot.length - 1];

  // ── 2. Recovery path: site is back up ─────────────────────────────────────
  //    Only email if we had previously sent a downtime alert (emailSent = true).
  if (latestCheck === true) {
    if (!app.emailSent) {
      return { emailed: false, reason: 'Site is up; no outstanding downtime alert' };
    }

    const owner = await getUserById(app.ownerId);
    if (!owner || !owner.email) {
      return { emailed: false, reason: 'Owner not found or has no email address' };
    }

    await emailService.sendEmail(
        owner.email,
        `[WatchTower] ${app.name} is back up`,
        `Hello ${owner.username},\n\n` +
        `Good news — your app "${app.name}" (${app.url ?? 'no URL recorded'}) ` +
        `is responding again and appears to be back online.\n\n` +
        `— WatchTower`,
    );

    await updateAppEmailSent(appId, false);
    return { emailed: true, reason: 'Site recovered; recovery notification sent' };
  }

  // ── 3. Not enough data yet ─────────────────────────────────────────────────
  //    downOrNot is capped at 3 by checkDowntimeStatus, so < 3 means the app
  //    is newly created and hasn't accumulated a full window yet.
  if (downOrNot.length < 3) {
    return { emailed: false, reason: 'Fewer than 3 checks recorded; not enough data' };
  }

  // ── 4. Check whether all 3 checks are down ────────────────────────────────
  const allDown = downOrNot.every((v) => v === false);

  if (!allDown) {
    return { emailed: false, reason: 'Site has not been down for 3 consecutive checks' };
  }

  // ── 5. Guard against duplicate downtime emails ────────────────────────────
  if (app.emailSent) {
    return { emailed: false, reason: 'Email already sent for this downtime incident' };
  }

  // ── 6. Fetch the owner and send the downtime notification ─────────────────
  const owner = await getUserById(app.ownerId);
  if (!owner || !owner.email) {
    return { emailed: false, reason: 'Owner not found or has no email address' };
  }

  await emailService.sendEmail(
    owner.email,
    `[WatchTower] ${app.name} has been down for 15+ minutes`,
    `Hello ${owner.username},\n\n` +
    `Your app "${app.name}" (${app.url ?? 'no URL recorded'}) has failed ` +
    `3 consecutive uptime checks, meaning it has been unreachable for at ` +
    `least 15 minutes.\n\n` +
    `Please investigate as soon as possible.\n\n` +
    `— WatchTower`,
  );

  await updateAppEmailSent(appId, true);
  return { emailed: true, reason: 'Downtime confirmed for 3 checks; notification sent' };
}

export { checkAndNotifyDowntime };