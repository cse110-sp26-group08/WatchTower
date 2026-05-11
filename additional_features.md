# Addtional features

This is for features that are out of the scope of the minimal viable product, but if we have time would be nice to have for the user.




## As a developer I would want to see who pushed the changes that caused the error in order to better understand how to fix the error
- We can support this by extending the collector data model so each deployed app version is associated with metadata such as commit ID, version number, deployment time, and the developer who pushed the change.
- MongoDB can store this deployment metadata alongside the project's uptime and error records, which lets us connect a spike in errors back to a specific release.
- When an error is logged, the backend can match its timestamp and app version to the deployment record that was active at that time.
- On the dashboard, we can show the developer name, version, and deployment information next to each major error event or inside the version stability widget.
- For the MVP, a simple implementation would be to let the collector file include the version and commit information in its JSON payload, then display that data in a table so developers can quickly see which release likely introduced the issue.

## As a developer who wants to be able to clearly trace the origin of errors, I would want metrics that capture the error origin in extreme detail, including the app version, timestamps, page that the error is from, etc.
- This can be built by defining a richer JSON format for the collector file to send into `POST /api/collect`.
- Each error event can include fields such as app version, timestamp, route or page name, error message, stack trace, browser or runtime environment, and severity level.
- MongoDB is a good fit for this because the stored documents can hold structured error details without forcing a rigid schema early in the project.
- On the dashboard, we can create a log table that lets the developer inspect each error event and filter by version, page, or time range.
- This would work well with the version stability widget described earlier, since the same collected metadata can help explain why one app version is less stable than another.

## As a developer I would want a widget with a log of different versions of my website and the uptime rate and number of bugs in order to assess which version of my app is most stable.
- This can be implemented as a dashboard widget backed by MongoDB, where each metric record includes fields like app version, timestamp, uptime percentage, and bug count.
- The client app sending data to `POST /api/collect` should include a version number in its JSON payload so the backend can group metrics by release.
- On the frontend, we can display this as either a table or a Chart.js graph so developers can compare versions side by side.
- A useful first version would be a table showing version number, total uptime, number of reported bugs, and the most recent check-in time.
- We are following the ADR direction of keeping the system simple. One collector endpoint gathers the data, MongoDB stores it, and Chart.js or a table component displays it on the dashboard.

## As a user I would want to be able to change how my data is represented through different buttons that can switch between a bar chart line graph and then, customize which charts and widgets appear on my dashboard, tabular etc, in order to more suit my preferences on how I like seeing data.
- This feature fits directly with the ADR decision to use Chart.js for graphs, charts, and tables because Chart.js can render multiple chart types from the same JSON data.
- We can create buttons on the dashboard that let the user switch a widget between bar chart, line graph, and table views without changing the backend data source.
- The frontend can request metric data from the backend, then reuse that response to redraw the selected visualization in JavaScript.
- For dashboard customization, we can let users show or hide widgets through toggle buttons or checkboxes, and store those preferences in MongoDB so their layout stays saved across sessions.