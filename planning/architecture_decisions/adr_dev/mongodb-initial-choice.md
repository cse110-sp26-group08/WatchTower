---
title: Use MongoDB for backend storage (initial decision — superseded)
status: superseded
date: 2026-05-10
superseded-by: ../adr_deploy/neon-postgresql-drizzle.md
decision-makers: Team seven ate nine
type: backend
---

# Backend Decision: Use MongoDB for backend storage

> **Status: Superseded.** This was the initial database choice. The team later migrated to Neon PostgreSQL + Drizzle ORM. See [`../adr_deploy/neon-postgresql-drizzle.md`](../adr_deploy/neon-postgresql-drizzle.md) for the current decision.

## Context and Problem Statement

WatchTower needs a database to store login information and other project data associated with the monitored applications. The team wants a storage approach it already understands, but it also wants a fallback in case the preferred database is not allowed.

What database should the backend use for storing login and monitoring data?

## Decision Drivers

* The system needs to store login information.
* The team wants a database it is already familiar with.
* The project should remain practical for the MVP.
* The team wants a fallback option if the preferred database is not allowed.

## Considered Options

* MongoDB
* SQLite

## Decision Outcome

Chosen option: "MongoDB", because the backend team is most familiar with it from past projects and believes it is the best fit for the current backend plan.

### Consequences

* Good, because MongoDB can store login information.
* Good, because the backend team is more familiar with MongoDB from past projects than with other ways to store user information.
* Good, because the team also has experience using MongoDB from its slot machine app from Warmup 2.
* Good, because familiarity has reduced uncertainty compared to the team's earlier MongoDB experience.
* Neutral, because if MongoDB is not allowed, the team can switch to storing the information in SQLite.
* Bad, because the team had some trouble with MongoDB in its warmup.

### Confirmation

* The backend should be able to store login information in MongoDB.
* The backend team should be able to implement and use the database without major blockers.
* If MongoDB is unavailable in the deployment or class environment, SQLite should remain a documented fallback.

## Pros and Cons of the Options

### MongoDB

* Good, because the backend team was most familiar with MongoDB from past projects.
* Good, because the team had experience with MongoDB from the slot machine app from Warmup 2.
* Good, because the team's uncertainty around MongoDB has shrunk as it became more experienced with it.
* Bad, because the team had some trouble with MongoDB in the warmup.

### SQLite

* Good, because it can serve as a backup plan.
* Good, because it keeps the project viable if MongoDB cannot be used.
* Bad, because it is not the backend team's preferred or most familiar choice.

## More Information

Since our app won't be a full fledged production app, if MongoDB is not allowed we can switch to storing the info in SQLite. This decision was ultimately superseded when the team migrated to Neon PostgreSQL for serverless/edge compatibility.
