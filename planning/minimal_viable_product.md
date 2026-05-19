# Minimal Viable Product
For our Minimal viable product we will organize it as follows

- Provide a user story representing a feature we want our MVP to have
- How we will implement this feature with details from our [Backend architecture PDF](architecture_decisions\Architecture-decision-record.md)

We have assembled 12user stories spanning features users would want from our backend, UI, and quality of life features. These are what our product should have at a minimum.

# Frontend

## As a user, I want a homepage, login page, and a dashboard in order to view my projects
- The frontend team will create the pages for these
- The login page will allow the collection of the users login info to send to the database in the backend
- The dashboard will be connected with Graph.js

## As a user, I want a simple flow of the application, meaning I want a clear path to get my apps errors and not a lot of fluff in order to get straight to my metrics and errors
- This user story matches the ADR's frontend decision to avoid an overloaded interface with too many colors, animations, or unnecessary features.
- We can design the site so that the main flow is straightforward: log in, select a project, and immediately see the dashboard with uptime, errors, and performance metrics.
- The navigation bar should stay simple, with only the most useful tabs such as Dashboard, Documentation, and Settings.
- The dashboard itself can prioritize the most important information first, such as current uptime status, recent errors, and performance charts, while secondary details stay in optional widgets or lower sections.

## As a user I would want a simple dashboard, with only a symbol telling me whether my site is down, with errors, or is up, with not a lot of clutter, in order to easily tell when my website is up
- This matches the ADR's frontend choice to avoid a crowded interface and keep the design focused on useful information.
- We can make the main dashboard center around a single status indicator that clearly shows whether the site is up, down, or experiencing errors.
- A simple implementation would use one large symbol with color-coded states, for example green for up, red for down, and yellow for warning or active errors.
- More detailed charts, logs, and widgets can still exist, but they should be placed below the main indicator or hidden behind optional views so the first screen stays uncluttered.
- Using basic JavaScript or React, we can update this status symbol in real time based on the latest uptime and error data coming from the backend.

## As a developer I want to be able to monitor multiple projects and switch between them so that its easy for me to simultaneously monitor those projects
- This user story follows directly from the ADR note that login information should allow users to track specific apps and multiple projects at the same time.
- We can model this in MongoDB by associating one user account with many projects, where each project has its own metrics, uptime history, versions, and error logs.
- The frontend dashboard can include a project selector such as a dropdown or sidebar list that lets the developer switch between projects without leaving the main dashboard.
- Once a project is selected, the dashboard can request that specific project's data from the backend and redraw the charts, widgets, and logs using Chart.js and table views.
- This keeps the experience simple for the MVP because one account can manage multiple monitored apps through the same login while the backend keeps each project's data separated.

## As a developer, I want a documentation page on the website so that I know how to set up the watchtower in my software and answer any questions I have about how it works
- We can add a Documentation tab to the main navigation bar using basic HTML, CSS, and JavaScript.
- This page can explain how the app sends data to our centralized `POST /api/collect` endpoint, what format the JSON payload should use, and what metrics WatchTower expects.
- Since the ADR already separates frontend and backend responsibilities, this page can mirror that structure with sections like setup, authentication, sending metrics, and reading dashboard results.

## As a developer, I want to monitor website uptime and service availability so that I can detect outages or inaccessible services and ensure the application remains operational for users.
- This can be implemented by having WatchTower periodically check whether a developer's site or API endpoint is reachable and record the result in MongoDB.
- These uptime checks can be stored with timestamps so the dashboard can show when outages happened and how long they lasted.
- On the frontend, Chart.js can display uptime trends over time, while a table can list recent outages and availability checks.
- This also works well with the alert system, since repeated failed checks can automatically trigger notifications to the developer.

# Backend

## As a developer who values security, I want my data to be protected my email and encrypted password through a login system, so that I can be worry free using watchtower in my apps.
- This user story connects directly to the ADR decision to use email and password as login information for each account.
- We can store the user's email in MongoDB and store only a hashed and salted version of the password rather than the raw password itself.
- On the backend, JavaScript libraries such as `bcrypt` can be used to encrypt password data before saving it in the database.
- This keeps the account system simple for the MVP while still following standard security practices for user authentication.

## As a developer, I want to use a performance metric app that doesn't slow down my own app, so that the performance errors I see are due to my app and not WatchTower slowing my app down
- We should keep the WatchTower client lightweight by sending small JSON payloads asynchronously so the monitored app does not block while reporting metrics.
- The collector design from the ADR supports this because the app only needs to send data to one centralized endpoint instead of doing heavy processing on the client side.
- On the frontend side of the monitored app, any WatchTower reporting script should run in the background with minimal logic, mostly collecting basic metrics and forwarding them to the backend.
- On the backend, MongoDB and the collector endpoint can handle storing and processing the data after it is received, which moves work away from the user's application.
- In this MVP, we limit the tracked metrics to essential values such as uptime, version, and bug count so the monitoring remains simple and low-overhead.

## As a developer, I want to receive notifications when the application experiences high error rates, downtime, or severe performance degradation so that I can quickly respond before they significantly impact users.
- We can support this by having the backend monitor incoming data from the collector endpoint and compare it against simple alert thresholds.
- For example, if uptime checks fail repeatedly, error count rises above a set limit, or response times become too high, the backend can trigger a notification.
- Because the ADR already uses email as part of login information, email is a natural first notification method for the MVP.
- MongoDB can store each user's notification preferences and alert thresholds so alerts can be customized per app.
- A simple first implementation would send email alerts when an outage is detected or when error counts spike over a short period of time.

## As a user, I would want to avoid false alarms from my website going down, I would want the application to periodically check for downtime and if the app is down for more than 3 checks, notify me. I want this in order to minimize being notified even when the website is experiencing infrequent downtime that resolves by itself.
- We can implement this by having WatchTower run scheduled uptime checks against the user's website or service endpoint and store the result of each check in MongoDB.
- Instead of sending an alert after a single failed check, the backend can wait until the app fails more than 3 checks in a row before marking the incident as a real outage.
- This reduces false alarms caused by short network interruptions, brief restarts, or other temporary issues that resolve on their own.
- Once the failed-check threshold is reached, the backend can trigger an email notification using the account email already stored for the user.
- On the dashboard, we can also show the recent check history so the user can see whether the outage was a one-time failure or part of a longer downtime period.

# UI/UX

## As a developer, I want not make much changes to my existing code and want to just add a single collector file to my repo to collect performance/error data, so that my code stays clean and adding watchtower is not a cumbersome process
- This fits very well with the ADR's centralized `POST /api/collect` endpoint because it allows us to keep the integration layer small.
- We can provide one collector file written in JavaScript that developers import into their project and configure with their app ID or API key.
- That file can expose a few simple functions such as `trackError()`, `trackPerformance()`, and `trackUptime()` that send JSON payloads to the backend.
- This keeps WatchTower adoption lightweight because the developer only needs to place one file in their repo and call a few helper functions where needed.
- A documentation tab on the website can explain exactly how to install this collector file and what data shape should be sent to the backend.

## As a developer, I want to be able to send errors, performance metrics, avalabillity data to the watchtowers apis so that I can see them in the visual dashboards which it provides.
- This should be achieved through the ADR's centralized `POST /api/collect` endpoint, which acts as the main entry point for all monitoring data sent from a developer's app.
- The developer should only need to add a lightweight collector file to their project that gathers error events, performance metrics, and uptime or availability information, then sends that data as JSON to the WatchTower backend.
- The JSON payload can include fields such as project ID, app version, timestamp, error details, response times, and uptime status so the backend has enough information to organize the data correctly.
- On the backend, MongoDB can store these incoming records by user and project so WatchTower can support multiple apps under the same account.
