# Minimal Viable Product
For our Minimal viable product we will organize it as follows

- Provide a user story representing a feature we want our MVP to have
- How we will implement this feature with details from our [Backend architecture PDF](architecture_decisions\Architecture-decision-record.md)

We have assembled 18 user stories spanning features users would want from our backend, UI, and quality of life features

# User Stories

## As a developer, I want a documentation tab on the website so that I know how to set up the watchtower in my software and answer any questions I have about how it works
- We can add a Documentation tab to the main navigation bar using basic HTML, CSS, and JavaScript.
- This page can explain how the app sends data to our centralized `POST /api/collect` endpoint, what format the JSON payload should use, and what metrics WatchTower expects.
- Since the ADR already separates frontend and backend responsibilities, this page can mirror that structure with sections like setup, authentication, sending metrics, and reading dashboard results.

## As a user I would want to be able to change how my data is represented through different buttons that can switch between a bar chart line graph and then, customize which charts and widgets appear on my dashboard, tabular etc, in order to more suit my preferences on how I like seeing data.
- This feature fits directly with the ADR decision to use Chart.js for graphs, charts, and tables because Chart.js can render multiple chart types from the same JSON data.
- We can create buttons on the dashboard that let the user switch a widget between bar chart, line graph, and table views without changing the backend data source.
- The frontend can request metric data from the backend, then reuse that response to redraw the selected visualization in JavaScript.
- For dashboard customization, we can let users show or hide widgets through toggle buttons or checkboxes, and store those preferences in MongoDB so their layout stays saved across sessions.

## As a developer I would want a widget with a log of different versions of my website and the uptime rate and number of bugs in order to assess which version of my app is most stable.
- This can be implemented as a dashboard widget backed by MongoDB, where each metric record includes fields like app version, timestamp, uptime percentage, and bug count.
- The client app sending data to `POST /api/collect` should include a version number in its JSON payload so the backend can group metrics by release.
- On the frontend, we can display this as either a table or a Chart.js graph so developers can compare versions side by side.
- A useful first version would be a table showing version number, total uptime, number of reported bugs, and the most recent check-in time.
- This follows the ADR direction of keeping the system simple: one collector endpoint gathers the data, MongoDB stores it, and Chart.js or a table component displays it on the dashboard.

## As a developer, I want to use a performance metric app that doesn't slow down my own app, so that the performance errors I see are due to my app and not WatchTower slowing my app down
- We should keep the WatchTower client lightweight by sending small JSON payloads asynchronously so the monitored app does not block while reporting metrics.
- The collector design from the ADR supports this because the app only needs to send data to one centralized endpoint instead of doing heavy processing on the client side.
- On the frontend side of the monitored app, any WatchTower reporting script should run in the background with minimal logic, mostly collecting basic metrics and forwarding them to the backend.
- On the backend, MongoDB and the collector endpoint can handle storing and processing the data after it is received, which moves work away from the user's application.
- For the MVP, we can limit the tracked metrics to essential values such as uptime, version, and bug count so the monitoring remains simple and low-overhead.

## As a developer who values security, I want my data to be protected my email and encrypted password, so that I can be worry free using watchtower in my apps.
- This user story connects directly to the ADR decision to use email and password as login information for each account.
- We can store the user's email in MongoDB and store only a hashed and salted version of the password rather than the raw password itself.
- On the backend, JavaScript libraries such as `bcrypt` can be used to encrypt password data before saving it in the database.
- We should also validate login input, use HTTPS when sending login requests, and create authenticated sessions or tokens so only the correct user can access their apps and metrics.
- This keeps the account system simple for the MVP while still following standard security practices for user authentication.

## As a developer, I want not make much changes to my existing code and want to just add a single collector file to my repo to collect performance/error data, so that my code stays clean and adding watchtower is not a cumbersome process
- This fits very well with the ADR's centralized `POST /api/collect` endpoint because it allows us to keep the integration layer small.
- We can provide one collector file written in JavaScript that developers import into their project and configure with their app ID or API key.
- That file can expose a few simple functions such as `trackError()`, `trackPerformance()`, and `trackUptime()` that send JSON payloads to the backend.
- This keeps WatchTower adoption lightweight because the developer only needs to place one file in their repo and call a few helper functions where needed.
- A documentation tab on the website can explain exactly how to install this collector file and what data shape should be sent to the backend.

## As a developer, I want to receive notifications when the application experiences high error rates, downtime, or severe performance degradation so that I can quickly respond before they significantly impact users.
- We can support this by having the backend monitor incoming data from the collector endpoint and compare it against simple alert thresholds.
- For example, if uptime checks fail repeatedly, error count rises above a set limit, or response times become too high, the backend can trigger a notification.
- Because the ADR already uses email as part of login information, email is a natural first notification method for the MVP.
- MongoDB can store each user's notification preferences and alert thresholds so alerts can be customized per app.
- A simple first implementation would send email alerts when an outage is detected or when error counts spike over a short period of time.

## As a developer, I want to monitor website uptime and service availability so that I can detect outages or inaccessible services and ensure the application remains operational for users.
- This can be implemented by having WatchTower periodically check whether a developer's site or API endpoint is reachable and record the result in MongoDB.
- These uptime checks can be stored with timestamps so the dashboard can show when outages happened and how long they lasted.
- On the frontend, Chart.js can display uptime trends over time, while a table can list recent outages and availability checks.
- This also works well with the alert system, since repeated failed checks can automatically trigger notifications to the developer.
- The result is a simple monitoring pipeline: scheduled checks create uptime data, MongoDB stores it, and the dashboard visualizes it.

## As a developer, I would want a performance metric app that does not have any significant performance impact on my own software, so that the metrics that I observe from WatchTower are accurate to the app itself and not affected by the running of WatchTower.
- We can satisfy this by making the collector file small, asynchronous, and focused only on gathering essential metrics before sending them to the backend.
- The monitored app should not do expensive chart rendering, heavy computation, or large logging operations as part of the collector logic.
- Instead, the backend should handle aggregation and longer-term analysis after the data reaches the centralized endpoint.
- This keeps the instrumentation clean and helps ensure that WatchTower itself does not distort the performance results it is meant to observe.
- For the MVP, this means starting with a narrow set of metrics and optimizing the collector for minimal overhead.

## As a developer who wants to be able to clearly trace the origin of errors, I would want metrics that capture the error origin in extreme detail, including the app version, timestamps, page that the error is from, etc.
- This can be built by defining a richer JSON format for the collector file to send into `POST /api/collect`.
- Each error event can include fields such as app version, timestamp, route or page name, error message, stack trace, browser or runtime environment, and severity level.
- MongoDB is a good fit for this because the stored documents can hold structured error details without forcing a rigid schema early in the project.
- On the dashboard, we can create a log table that lets the developer inspect each error event and filter by version, page, or time range.
- This would work well with the version stability widget described earlier, since the same collected metadata can help explain why one app version is less stable than another.

## As a developer I want to be able to monitor multiple projects and switch between them so that its easy for me to simultaneously monitor those projects
- This user story follows directly from the ADR note that login information should allow users to track specific apps and multiple projects at the same time.
- We can model this in MongoDB by associating one user account with many projects, where each project has its own metrics, uptime history, versions, and error logs.
- The frontend dashboard can include a project selector such as a dropdown or sidebar list that lets the developer switch between projects without leaving the main dashboard.
- Once a project is selected, the dashboard can request that specific project's data from the backend and redraw the charts, widgets, and logs using Chart.js and table views.
- This keeps the experience simple for the MVP because one account can manage multiple monitored apps through the same login while the backend keeps each project's data separated.
  
