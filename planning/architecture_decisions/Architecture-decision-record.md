---
title: WatchTower Architecture Decision Record
status: accepted
date: 2026-05-10
decision-makers: Team seven ate nine
---

# WatchTower Architecture Decision Record

We split the architecture decisions into frontend and backend decisions. This document follows the MADR style shown in the examples at <https://adr.github.io/madr/examples.html>.

For more backend details, see [architecture_backend.pdf](./architecture_backend.pdf) and [collector.pdf](./collector.pdf).

## Frontend Decision: Use Chart.js for data visualization

### Context and Problem Statement

WatchTower needs a way to display collected metrics in graphs, tables, or charts on the dashboard. These metrics might include the number of times the app has gone down within the past 24 hours, the number of found bugs, and other monitoring data.

How should the frontend visualize monitoring data in a way that is simple enough for the team and still useful for the MVP?

### Decision Drivers

* The dashboard needs to display metrics in charts, graphs, or tables.
* The project scope is small, so the team wants to avoid unnecessary complexity.
* The team wants to avoid spending too much time on visualization customization.
* Prior team experience with a tool is valuable.

### Considered Options

* Chart.js
* ECharts

### Decision Outcome

Chosen option: "Chart.js", because it is much simpler than ECharts, it works well with JSON input, and the extra functionality of ECharts does not outweigh the added complexity for this project.

#### Consequences

* Good, because Chart.js can display metrics as graphs, tables, or charts.
* Good, because Chart.js only requires a JSON file as input, assuming the JSON follows the correct format.
* Good, because the team believes it fits the practical needs of the project without unnecessary overhead.
* Good, because Chart.js was also chosen in the CSE 135 project as noted by Ki.
* Bad, because Chart.js offers less graph variety and less customization than ECharts.
* Bad, because choosing a simpler library may limit future advanced visualizations if the project scope grows.
* Bad, because if the team starts adding many visual variations anyway, it could still lead to rabbit holing.

#### Confirmation

* The dashboard should be able to render collected metrics from JSON data into charts or tables.
* The frontend team should be able to create the planned dashboard views without needing a more advanced charting library.
* Sprint work on dashboard implementation should confirm whether Chart.js is sufficient for the graphs the project actually needs.

### Pros and Cons of the Options

#### Chart.js

Chart.js is a JavaScript charting library that can render charts using structured JSON data.

* Good, because it is much simpler than the alternatives the team researched.
* Good, because it supports the project need to display metrics in graphs, tables, or charts.
* Good, because it was also chosen in the CSE 135 project as noted by Ki.
* Good, because for practicality the team will not need that many graphs.
* Bad, because it has fewer graphs and less customization than ECharts.
* Bad, because if the project later wants more advanced visualizations, the team may need to revisit the decision.

#### ECharts

ECharts is a more customizable charting library that supports more chart types.

* Good, because it allows for more graphs and more customization.
* Bad, because it adds complexity.
* Bad, because given the current scope, more functionality and customization increases the chance of rabbit holing.

### More Information

This decision is specifically for displaying project metrics such as downtime counts and number of found bugs.

## Frontend Decision: Use a blue-and-white color scheme with a simple UI

### Context and Problem Statement

WatchTower needs a dashboard, login page, and homepage that are easy to read and not visually overloaded. The frontend team wants users to get straight to their metrics and outage information without a distracting UI.

What visual direction should the frontend use so the product feels clear and focused?

### Decision Drivers

* The UI should not feel overloaded.
* The product is meant to track metrics and notify users about outages.
* The interface should stay clear across the login page, homepage, and dashboard.
* The team wants the visual style to match our existing theme.

### Considered Options

* Blue-and-white color scheme with a simple interface
* A more colorful and animation-heavy monitoring dashboard style similar to PostHog

### Decision Outcome

Chosen option: "Blue-and-white color scheme with a simple interface", because the frontend team found that more overloaded dashboards are not useful for an app that is mainly meant to track metrics and notify users about outages.

#### Consequences

* Good, because users can focus more easily on status, errors, and uptime data.
* Good, because the same visual direction can be used across the login page, homepage, and dashboard.
* Good, because the blue can match the arcade blue from the team's Google Slides theme.
* Bad, because the UI may feel less expressive than more animated or visually dense monitoring tools.

#### Confirmation

* The main pages should share a consistent blue-and-white style.
* User-facing pages should emphasize the most important monitoring information rather than decorative visual elements.

### Pros and Cons of the Options

#### Blue-and-white color scheme with a simple interface

This option uses a blue-and-white color scheme for every page on the website, including the login page, homepage, and dashboard.

* Good, because the blue is an arcade blue similar to the team's theme from the Google Slides.
* Good, because it keeps the UI simpler and more focused.
* Good, because it supports the product goal of helping users quickly understand their metrics and outages.
* Bad, because it may offer less visual variety than more elaborate UI systems.

#### A more colorful and animation-heavy dashboard style

This option takes inspiration from more visually dense tools such as PostHog.

* Good, because it could feel more feature-rich or dynamic.
* Bad, because the frontend team decided PostHog's UI was very overloaded with colors and animations.
* Bad, because the team found that style not very useful for an app meant to track metrics and notify users of outages.

## Backend Decision: Use email and password for login information

### Context and Problem Statement

WatchTower needs an account system so it can track specific apps for each user, support monitoring of multiple projects at the same time, and notify users when their app goes down.

What login information should be collected from users for the MVP?

### Decision Drivers

* The system needs to associate apps and metrics with a specific user.
* The system should support multiple projects per user.
* The team wants to notify users when their app goes down.
* The login flow should stay simple for the MVP.

### Considered Options

* Email and user-selected password
* Email, username, and password

### Decision Outcome

Chosen option: "Email and user-selected password", because it is standard information to collect from a user and it is enough for account management, project tracking, and notifications.

#### Consequences

* Good, because login information allows WatchTower to track specific apps of a user.
* Good, because it enables users to track multiple projects' uptime metrics at the same time.
* Good, because having an email allows the system to notify the user if their app goes down.
* Good, because it avoids adding a username field that is not necessary for the current scope.
* Bad, because secure password handling is still required in implementation.
* Neutral, because the team could have asked for a username, but did not consider it necessary for the current scope.

#### Confirmation

* A user account should be able to own multiple monitored applications or projects.
* The system should be able to send notifications to the email address attached to the account.
* The login form should only require email and password.

### Pros and Cons of the Options

#### Email and user-selected password

This option collects an email address and a password chosen by the user.

* Good, because email and password is standard information to collect from a user.
* Good, because the email can be used for notifications.
* Good, because it is enough for the project's current scope.
* Bad, because password storage and authentication still require secure implementation.

#### Email, username, and password

This option would add a username on top of email and password.

* Good, because it offers another user identifier.
* Bad, because the team does not see it as necessary for the scope of the project.

### More Information

The original project notes explicitly stated that this was not seen as a major risk, but rather as something unnecessary for the scope of the project.

## Backend Decision: Use Node.js as the backend runtime

### Context and Problem Statement

WatchTower needs a backend runtime to handle database work, serve pages, and support Express.js endpoints for data retrieval and data collection.

What runtime should the backend use to support the collector APIs and the rest of the application?

### Decision Drivers

* The backend needs to handle database access and page serving.
* The team wants to build data retrieval and collection endpoints with Express.js.
* The team wants a technology it has already learned in labs.
* The runtime should be lightweight.
* Industry support and JavaScript ecosystem compatibility matter to the team.

### Considered Options

* Node.js
* Flask
* Django

### Decision Outcome

Chosen option: "Node.js", because the team has already learned Node.js in its labs, it is lightweight, and it provides stronger JavaScript ecosystem support for the planned Express.js backend than Flask or Django.

#### Consequences

* Good, because Node.js can be used as the JavaScript runtime to handle database work and serving pages.
* Good, because Node.js can run Express.js for data retrieval and collection endpoints.
* Good, because the team already has familiarity with Node.js from labs.
* Good, because the team considers it lightweight and expects it not to slow down the user's website or application.
* Good, because the team views Node.js as the most used in industry among the compared options and sees wider support for JavaScript functionality.
* Bad, because the team is committing to a JavaScript-centric backend stack, which may narrow later backend choices.

#### Confirmation

* The backend should be able to serve pages and expose Express.js endpoints.
* The backend should support database interactions needed by the project.
* The team should be able to implement the collector API and retrieval API within the Node.js runtime.

### Pros and Cons of the Options

#### Node.js

Node.js is a JavaScript runtime that can be used with Express.js for backend APIs and page serving.

* Good, because all team members have learned about Node.js in their labs.
* Good, because it is lightweight.
* Good, because the team expects it will not slow down the user's website or application.
* Good, because it has wide industry usage and wider support for JavaScript functionality.
* Good, because it works naturally with Express.js for collection and retrieval endpoints.
* Bad, because choosing Node.js means the team is less likely to explore non-JavaScript backend stacks for this project.

#### Flask

Flask is a Python web framework considered as a comparison point.

* Good, because it is a common backend framework.
* Bad, because the team preferred Node.js for stronger JavaScript alignment and industry familiarity.

#### Django

Django is a larger Python web framework considered as a comparison point.

* Good, because it is a common backend framework.
* Bad, because the team preferred a lighter-weight runtime with stronger JavaScript ecosystem alignment.

## Backend Decision: Use MongoDB for backend storage

### Context and Problem Statement

WatchTower needs a database to store login information and other project data associated with the monitored applications. The team wants a storage approach it already understands, but it also wants a fallback in case the preferred database is not allowed.

What database should the backend use for storing login and monitoring data?

### Decision Drivers

* The system needs to store login information.
* The team wants a database it is already familiar with.
* The project should remain practical for the MVP.
* The team wants a fallback option if the preferred database is not allowed.

### Considered Options

* MongoDB
* SQLite

### Decision Outcome

Chosen option: "MongoDB", because the backend team is most familiar with it from past projects and believes it is the best fit for the current backend plan.

#### Consequences

* Good, because MongoDB can store login information.
* Good, because the backend team is more familiar with MongoDB from past projects than with other ways to store user information.
* Good, because the team also has experience using MongoDB from its slot machine app from Warmup 2.
* Good, because familiarity has reduced uncertainty compared to the team's earlier MongoDB experience.
* Neutral, because if MongoDB is not allowed, the team can switch to storing the information in SQLite.
* Bad, because the team had some trouble with MongoDB in its warmup.

#### Confirmation

* The backend should be able to store login information in MongoDB.
* The backend team should be able to implement and use the database without major blockers.
* If MongoDB is unavailable in the deployment or class environment, SQLite should remain a documented fallback.

### Pros and Cons of the Options

#### MongoDB

MongoDB is the planned backend database for login and monitoring data.

* Good, because the backend team was most familiar with MongoDB from past projects as opposed to other ways to store user information.
* Good, because the team had experience with MongoDB from the slot machine app from Warmup 2.
* Good, because the team's uncertainty around MongoDB has shrunk as it became more experienced with it.
* Bad, because the team had some trouble with MongoDB in the warmup.

#### SQLite

SQLite is the fallback storage option if MongoDB is not allowed.

* Good, because it can serve as a backup plan.
* Good, because it keeps the project viable if MongoDB cannot be used.
* Bad, because it is not the backend team's preferred or most familiar choice.

### More Information

Since our app won't be a full fledged production app, if MongoDB is not allowed we can switch to storing the info in SQLite.

## Backend Decision: Migrate from MongoDB to Neon PostgreSQL with Drizzle ORM

### Context and Problem Statement

The backend was originally built on MongoDB via Mongoose. As the project matured, the team needed a hosted relational database that integrates cleanly with the Node.js stack, supports a serverless connection model, and eliminates the need to run a local database process for testing.

What database and ORM should replace MongoDB for the WatchTower backend?

### Decision Drivers

* The team wants a hosted database that requires no local setup.
* Tests should run against an isolated database branch rather than production data.
* The ORM should work without TypeScript-specific codegen tooling, since this project is plain JavaScript.
* The connection model should be compatible with serverless and edge environments.
* Migration files should be versioned and committed alongside the code.

### Considered Options

* Neon PostgreSQL + Drizzle ORM
* Neon PostgreSQL + Prisma ORM
* PlanetScale MySQL + Drizzle ORM

### Decision Outcome

Chosen option: "Neon PostgreSQL + Drizzle ORM", because Neon provides free database branching (copy-on-write forks with independent connection strings) which solves the test isolation problem without any extra tooling, and Drizzle's query API is plain-JavaScript-friendly with no binary engine or separate schema file required.

#### Consequences

* Good, because Neon's branching feature gives each environment (production, test) its own isolated database without spinning up a local server.
* Good, because Drizzle uses Neon's HTTP driver natively — no connection pooling workarounds in a serverless context.
* Good, because migration files (`backend/migrations/`) are versioned SQL and committed to the repo; running `npm start` applies any pending migrations automatically via `drizzle-kit migrate`.
* Good, because removing Mongoose also removes `mongodb-memory-server` from the test setup, which was a heavy dev dependency.
* Good, because IDs are now UUID v4 values generated by PostgreSQL, which are globally unique and URL-safe.
* Bad, because the switch required updating all schema files, controllers, and two event endpoint files that relied on Mongoose's `_id` field naming convention.
* Bad, because FK constraints in PostgreSQL enforce referential integrity that MongoDB silently ignored; tests using orphaned UUIDs required removing FK constraints from `apps.owner_id` and `events.app_id` to preserve the original test design intent.

#### Confirmation

* `npm start` should apply pending migrations and start the server without errors.
* `npm test` should pass all 47 tests against the Neon test branch configured in `.env.test`.
* API responses now use `id` (UUID string) instead of `_id` (MongoDB ObjectId string) and do not include a `__v` versioning field.

### Pros and Cons of the Options

#### Neon PostgreSQL + Drizzle ORM

* Good, because Drizzle has no binary engine and works with plain JavaScript.
* Good, because Neon's HTTP driver is stateless — no connect/disconnect lifecycle.
* Good, because Neon's free tier includes database branching for test isolation.
* Bad, because Drizzle's migration workflow (generate then migrate) is a two-step process compared to Prisma's single `migrate dev` command.

#### Neon PostgreSQL + Prisma ORM

* Good, because Prisma has a more mature ecosystem and richer documentation.
* Bad, because Prisma's main advantage is TypeScript codegen, which does not apply to this JavaScript project.
* Bad, because Prisma requires a binary query engine and a separate `.prisma` schema file, adding tooling overhead.

#### PlanetScale MySQL + Drizzle ORM

* Good, because PlanetScale also offers branching and a serverless driver.
* Bad, because MySQL syntax differs from PostgreSQL and the team had no prior MySQL experience.
* Bad, because PlanetScale removed its free tier.
