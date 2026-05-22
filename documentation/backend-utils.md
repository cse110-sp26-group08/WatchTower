# Backend Utilities Documentation

This document describes the utility modules located in `backend/util/`.

---

## Index
- [DowntimeNotificationEnsurer.js](#downtimenotificationensurerjs)

---

## DowntimeNotificationEnsurer.js

**Location:** `backend/util/DowntimeNotificationEnsurer.js`

Evaluates the recent downtime history of an app and sends notification emails to the app owner when a sustained outage is confirmed, and again when the site recovers. Designed to be called after every `checkDowntimeStatus` run (e.g. inside the existing 5-minute cron job in `endpoints/apps.js`).

### Behaviour

| Condition | Action |
|---|---|
| Fewer than 3 checks recorded in `downOrNot` | Do nothing — not enough data yet. |
| Latest check is `true` AND `emailSent` is `false` | Do nothing — site is up and no outstanding alert. |
| Latest check is `true` AND `emailSent` is `true` | Send a recovery email and set `emailSent = false` in the DB. |
| All 3 checks are `false` AND `emailSent` is `false` | Send a downtime email and set `emailSent = true` in the DB. |
| All 3 checks are `false` AND `emailSent` is `true` | Do nothing — prevents spamming while the outage continues. |

The 3-check window corresponds to **~15 minutes** at the default 5-minute cron cadence. The `emailSent` flag is persisted in the database so it survives server restarts.

### Exported Functions

#### `checkAndNotifyDowntime(appId)`

| Parameter | Type | Description |
|---|---|---|
| `appId` | string (UUID) | ID of the app to evaluate. |

**Returns:** `Promise<{ emailed: boolean, reason: string }>`

| Field | Type | Description |
|---|---|---|
| `emailed` | boolean | `true` if a notification email was dispatched during this call. |
| `reason` | string | Human-readable explanation of the outcome. |

### Integration

Call `checkAndNotifyDowntime` after each `checkDowntimeStatus` in the cron job:

```js
// backend/endpoints/apps.js  (existing cron block)
import { checkAndNotifyDowntime } from '../util/DowntimeNotificationEnsurer.js';

cron.schedule('*/5 * * * *', async () => {
  const allApps = await selectAllApps();
  for (const app of allApps) {
    if (app.url) {
      await checkDowntimeStatus(app.id);
      await checkAndNotifyDowntime(app.id); // ← add this line
    }
  }
});
```

### Example

```js
import { checkAndNotifyDowntime } from './DowntimeNotificationEnsurer.js';

const { emailed, reason } = await checkAndNotifyDowntime(appId);
console.log(emailed, reason);
// true  'Downtime confirmed for 3 checks; notification sent'
// false 'Email already sent for this downtime incident'
// true  'Site recovered; recovery notification sent'
// false 'Site is up; no outstanding downtime alert'
```

---