---
title: Use email and password for login information
status: accepted
date: 2026-05-10
decision-makers: Team seven ate nine
type: backend
---

# Backend Decision: Use email and password for login information

## Context and Problem Statement

WatchTower needs an account system so it can track specific apps for each user, support monitoring of multiple projects at the same time, and notify users when their app goes down.

What login information should be collected from users for the MVP?

## Decision Drivers

* The system needs to associate apps and metrics with a specific user.
* The system should support multiple projects per user.
* The team wants to notify users when their app goes down.
* The login flow should stay simple for the MVP.

## Considered Options

* Email and user-selected password
* Email, username, and password

## Decision Outcome

Chosen option: "Email and user-selected password", because it is standard information to collect from a user and it is enough for account management, project tracking, and notifications.

### Consequences

* Good, because login information allows WatchTower to track specific apps of a user.
* Good, because it enables users to track multiple projects' uptime metrics at the same time.
* Good, because having an email allows the system to notify the user if their app goes down.
* Good, because it avoids adding a username field that is not necessary for the current scope.
* Bad, because secure password handling is still required in implementation.
* Neutral, because the team could have asked for a username, but did not consider it necessary for the current scope.

### Confirmation

* A user account should be able to own multiple monitored applications or projects.
* The system should be able to send notifications to the email address attached to the account.
* The login form should only require email and password.

## Pros and Cons of the Options

### Email and user-selected password

This option collects an email address and a password chosen by the user.

* Good, because email and password is standard information to collect from a user.
* Good, because the email can be used for notifications.
* Good, because it is enough for the project's current scope.
* Bad, because password storage and authentication still require secure implementation.

### Email, username, and password

This option would add a username on top of email and password.

* Good, because it offers another user identifier.
* Bad, because the team does not see it as necessary for the scope of the project.

## More Information

The original project notes explicitly stated that this was not seen as a major risk, but rather as something unnecessary for the scope of the project.
