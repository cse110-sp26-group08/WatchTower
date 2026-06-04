---
title: Use Chart.js for data visualization
status: accepted
date: 2026-05-10
decision-makers: Team seven ate nine
type: frontend
---

# Frontend Decision: Use Chart.js for data visualization

## Context and Problem Statement

WatchTower needs a way to display collected metrics in graphs, tables, or charts on the dashboard. These metrics might include the number of times the app has gone down within the past 24 hours, the number of found bugs, and other monitoring data.

How should the frontend visualize monitoring data in a way that is simple enough for the team and still useful for the MVP?

## Decision Drivers

* The dashboard needs to display metrics in charts, graphs, or tables.
* The project scope is small, so the team wants to avoid unnecessary complexity.
* The team wants to avoid spending too much time on visualization customization.
* Prior team experience with a tool is valuable.

## Considered Options

* Chart.js
* ECharts

## Decision Outcome

Chosen option: "Chart.js", because it is much simpler than ECharts, it works well with JSON input, and the extra functionality of ECharts does not outweigh the added complexity for this project.

### Consequences

* Good, because Chart.js can display metrics as graphs, tables, or charts.
* Good, because Chart.js only requires a JSON file as input, assuming the JSON follows the correct format.
* Good, because the team believes it fits the practical needs of the project without unnecessary overhead.
* Good, because Chart.js was also chosen in the CSE 135 project as noted by Ki.
* Bad, because Chart.js offers less graph variety and less customization than ECharts.
* Bad, because choosing a simpler library may limit future advanced visualizations if the project scope grows.
* Bad, because if the team starts adding many visual variations anyway, it could still lead to rabbit holing.

### Confirmation

* The dashboard should be able to render collected metrics from JSON data into charts or tables.
* The frontend team should be able to create the planned dashboard views without needing a more advanced charting library.
* Sprint work on dashboard implementation should confirm whether Chart.js is sufficient for the graphs the project actually needs.

## Pros and Cons of the Options

### Chart.js

Chart.js is a JavaScript charting library that can render charts using structured JSON data.

* Good, because it is much simpler than the alternatives the team researched.
* Good, because it supports the project need to display metrics in graphs, tables, or charts.
* Good, because it was also chosen in the CSE 135 project as noted by Ki.
* Good, because for practicality the team will not need that many graphs.
* Bad, because it has fewer graphs and less customization than ECharts.
* Bad, because if the project later wants more advanced visualizations, the team may need to revisit the decision.

### ECharts

ECharts is a more customizable charting library that supports more chart types.

* Good, because it allows for more graphs and more customization.
* Bad, because it adds complexity.
* Bad, because given the current scope, more functionality and customization increases the chance of rabbit holing.

## More Information

This decision is specifically for displaying project metrics such as downtime counts and number of found bugs.
