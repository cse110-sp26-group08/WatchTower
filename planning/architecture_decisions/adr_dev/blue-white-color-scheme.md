---
title: Use a blue-and-white color scheme with a simple UI
status: accepted
date: 2026-05-10
decision-makers: Team seven ate nine
type: frontend
---

# Frontend Decision: Use a blue-and-white color scheme with a simple UI

## Context and Problem Statement

WatchTower needs a dashboard, login page, and homepage that are easy to read and not visually overloaded. The frontend team wants users to get straight to their metrics and outage information without a distracting UI.

What visual direction should the frontend use so the product feels clear and focused?

## Decision Drivers

* The UI should not feel overloaded.
* The product is meant to track metrics and notify users about outages.
* The interface should stay clear across the login page, homepage, and dashboard.
* The team wants the visual style to match our existing theme.

## Considered Options

* Blue-and-white color scheme with a simple interface
* A more colorful and animation-heavy monitoring dashboard style similar to PostHog

## Decision Outcome

Chosen option: "Blue-and-white color scheme with a simple interface", because the frontend team found that more overloaded dashboards are not useful for an app that is mainly meant to track metrics and notify users about outages.

### Consequences

* Good, because users can focus more easily on status, errors, and uptime data.
* Good, because the same visual direction can be used across the login page, homepage, and dashboard.
* Good, because the blue can match the arcade blue from the team's Google Slides theme.
* Bad, because the UI may feel less expressive than more animated or visually dense monitoring tools.

### Confirmation

* The main pages should share a consistent blue-and-white style.
* User-facing pages should emphasize the most important monitoring information rather than decorative visual elements.

## Pros and Cons of the Options

### Blue-and-white color scheme with a simple interface

This option uses a blue-and-white color scheme for every page on the website, including the login page, homepage, and dashboard.

* Good, because the blue is an arcade blue similar to the team's theme from the Google Slides.
* Good, because it keeps the UI simpler and more focused.
* Good, because it supports the product goal of helping users quickly understand their metrics and outages.
* Bad, because it may offer less visual variety than more elaborate UI systems.

### A more colorful and animation-heavy dashboard style

This option takes inspiration from more visually dense tools such as PostHog.

* Good, because it could feel more feature-rich or dynamic.
* Bad, because the frontend team decided PostHog's UI was very overloaded with colors and animations.
* Bad, because the team found that style not very useful for an app meant to track metrics and notify users of outages.
