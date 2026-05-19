# WatchTower Project Direction Notes

## 1. Updated Project Understanding

After talking with Professor Powell and receiving feedback from our mentor TA Audria, our project should not be a big analytics platform like PostHog.

The better direction is:

> WatchTower is a lightweight availability and performance monitoring tool that helps developers know when their app is down, slow, unstable, or broken.

The main focus should be:

- uptime / availability
- performance monitoring
- alerts / notifications
- stability
- deployment regressions
- simple dashboard summaries

The professor emphasized that we should not start by adding many features. Instead, we should first understand the user problem clearly and write specific user stories.

---

## 2. Main Problem

Developers often do not know when their application becomes unavailable, slow, unstable, or broken until users complain or damage has already happened.

Detecting a problem is not enough. WatchTower should help answer:

- Is the site up?
- Is the API responding?
- Is the app slow?
- Did the website go down?
- When did it go down?
- What might have caused it?
- Did a recent deployment cause problems?
- Who should be notified?

---

## 3. Main User Story

### User: Chad, a junior developer

Chad is responsible for keeping an application running smoothly. If something goes wrong, his boss may blame him.

Chad is busy and does not want to stare at dashboards, logs, or graphs all day.

He wants to know quickly:

- if the site is down
- if the site is slow
- if users are experiencing issues
- if a recent deployment caused problems
- how and when he will be notified
- who should fix the issue

This means WatchTower should be designed for quick awareness and fast reaction.

---

## 4. Stakeholder Feedback Summary

### Professor Powell

Key feedback:

- Do not be too feature-heavy early.
- Start with user stories.
- Get specific about the problem before deciding features.
- Focus more on availability / uptime.
- PostHog may not be the best inspiration.
- Pingdom is a better example to study.
- Alerts are important.
- False alarms are a real risk.

Important warning:

If WatchTower checks a site only once and the request fails, that does not always mean the site is truly down. It could be a temporary network issue, packet loss, DNS problem, etc.

So WatchTower should avoid immediately saying “SITE DOWN” after one failed request.

Possible solution:

- ping multiple times before declaring an outage
- confirm failures before sending critical alerts
- reduce false positives
- possibly check from multiple locations later, but not required for MVP

### Mentor TA Audria

Key feedback:

- Highest priority: performance monitoring
- Most important problem: notifying software engineers when the site is slow
- Dashboard should first show a simple health status, like a traffic light
- Simple dashboard is preferred
- More detailed information can be hidden behind “more info”
- One feature working correctly can be enough for MVP
- The wireframing process matters
- Performance monitoring may be one of the hardest options, so we should manage the risk

---

## 5. Recommended MVP Direction

Our MVP should focus on one strong feature:

> Monitor whether a target app or API is available and whether it is responding slowly, then show a clear status and alert information.

The MVP should not try to build everything.

Recommended MVP features:

1. Add a target website/API endpoint to monitor
2. Periodically check if it responds
3. Record response time
4. Mark status as healthy, slow, or down
5. Avoid false alarms by checking multiple times before declaring outage
6. Show a simple dashboard status
7. Show recent incidents and alert history
8. Link incidents to deployment/version info if available

---

## 6. Possible System Flow

Updated system flow:

```text
[WatchTower Monitor]
   |
   | sends health check requests
   v
[Target App / API]

[WatchTower Monitor]
   |
   | stores check result
   v
[WatchTower API / Backend]
   |
   v
[Database]

[Dashboard UI]
   |
   | requests status data
   v
[WatchTower API]
   |
   v
[Database]