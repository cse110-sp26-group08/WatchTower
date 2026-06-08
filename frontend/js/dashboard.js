/* global average */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard().catch((error) => {
        console.error('Dashboard failed to initialize:', error);
        setStatus('DOWN', 'No app data was available for this dashboard.');
    });
});

// Millisecond offsets for the three time-window options
const RANGE_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

// Module-level state shared across refresh cycles
let dashboardState = null;
let refreshAbortController = null;

// More than this many critical errors in 24h flips the badge from UP to WARN
const WARNING_CRITICAL_THRESHOLD = 5;

/**
 * Bootstraps the dashboard: resolves the current app, sets up the API key
 * widget, registers lifecycle listeners, and kicks off the first data load.
 */
async function initDashboard() {
    const selectedApp = await resolveSelectedApp();

    if (!selectedApp?.id) {
        setProjectName('No project selected');
        setStatus('DOWN', 'Return to app selection and choose a project.');
        renderHealthBars([], []);
        return;
    }

    setProjectName(selectedApp.name || 'Selected project');
    populateProjectDetails({ app: selectedApp });
    bindApiKeyWidget(selectedApp.id);
    bindHealthScoreNavigation();
    bindPageLifecycle();
    await refreshDashboard(selectedApp, { force: true });
}

// URL ?appId takes priority over localStorage so that direct links (e.g. from
// email alerts) always open the intended app, even if the user had a different
// app selected. The URL is stored back to localStorage so subsequent page loads
// without the query param still open the same app.
// The URL field is resolved from the stored app when the API record has no url,
// because app_selection.js stores a user-supplied URL that the server doesn't save.
async function resolveSelectedApp() {
    const queryAppId = new URLSearchParams(window.location.search).get('appId');
    const storedApp = readJsonStorage('watchtowerSelectedApp');

    if (queryAppId) {
        try {
            const response = await fetch(`/api/apps/${queryAppId}`);
            const data = await response.json();

            if (response.ok && data.app) {
                const resolvedUrl = data.app.url || (storedApp?.id === data.app.id ? storedApp.url : undefined);
                const appWithUrl = { ...data.app, url: resolvedUrl };
                localStorage.setItem('watchtowerSelectedApp', JSON.stringify(appWithUrl));
                return appWithUrl;
            }
        } catch (error) {
            console.error('Failed to fetch selected app:', error);
        }
    }

    return storedApp;
}

/**
 * Pauses and resumes data polling based on tab visibility, and aborts
 * in-flight requests when the user navigates away.
 * Avoids unnecessary network traffic while the tab is hidden.
 */
function bindPageLifecycle() {
    document.addEventListener('visibilitychange', async () => {
        if (document.hidden) {
            abortActiveRefresh();
            return;
        }

        const selectedApp = readJsonStorage('watchtowerSelectedApp');
        if (selectedApp?.id) {
            await refreshDashboard(selectedApp, { force: true });
        }
    });

    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });
}

/**
 * Resolves the href for a dashboard sub-page, accounting for whether we're
 * running through Express or a static file server.
 * Uses the dash_navbar script src as the base rather than window.location so
 * it works consistently regardless of which page we're currently on.
 *
 * @param {'performance' | 'errors'} key
 * @returns {string}
 */
function getNavHref(key) {
    const scriptEl = document.querySelector('script[src*="components/dash_navbar.js"]');
    const isStatic = scriptEl && new URL(scriptEl.src).pathname.endsWith('/frontend/js/components/dash_navbar.js');
    const base = scriptEl ? scriptEl.src : '';
    if (key === 'performance') {
        return isStatic
            ? new URL('../../webpages/advanced_performance_metrics.html', base).href
            : '/advanced-performance-metrics';
    }
    return isStatic
        ? new URL('../../webpages/advanced_error_metrics.html', base).href
        : '/advanced-error-metrics';
}

/**
 * Makes the performance and reliability health score rings clickable,
 * navigating to their respective detail pages.
 */
function bindHealthScoreNavigation() {
    [
        { prefix: 'performance', key: 'performance' },
        { prefix: 'reliability', key: 'errors' },
    ].forEach(({ prefix, key }) => {
        const el = document.querySelector(`wt-health-score[prefix="${prefix}"]`);
        if (!el) return;
        const card = el.querySelector('.health-score');
        if (!card) return;
        card.classList.add('health-score-clickable');
        card.addEventListener('click', () => {
            window.location.href = getNavHref(key);
        });
    });
}

/**
 * Sets up the API key reveal/hide toggle and copy button.
 * The key is fetched lazily on first toggle — no need to load it until
 * the user actually wants to see it.
 *
 * @param {number} appId
 */
function bindApiKeyWidget(appId) {
    const toggleBtn = document.getElementById('apikey-toggle');
    const valueEl = document.getElementById('apikey-value');
    const copyBtn = document.getElementById('apikey-copy');
    if (!toggleBtn || !valueEl) return;

    const MASK = '•'.repeat(16);
    const EYE_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    const EYE_OFF_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    const COPY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
    const CHECK_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

    let realKey = null;
    let visible = false;

    // Fetch once and cache — null means "not fetched yet", '' means "no key available"
    async function loadKey() {
        if (realKey !== null) return;
        try {
            const response = await fetch(`/api/apps/${appId}/apikey`, { cache: 'no-store' });
            const data = await response.json();
            realKey = (response.ok && data.apiKey) ? data.apiKey : '';
        } catch {
            realKey = '';
        }
    }

    toggleBtn.addEventListener('click', async () => {
        await loadKey();
        visible = !visible;
        valueEl.textContent = (visible && realKey) ? realKey : MASK;
        toggleBtn.innerHTML = visible ? EYE_OFF_SVG : EYE_SVG;
        toggleBtn.setAttribute('aria-label', visible ? 'Hide API key' : 'Show API key');
        if (copyBtn) {
            copyBtn.hidden = !(visible && realKey);
            copyBtn.innerHTML = COPY_SVG;
        }
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            await loadKey();
            if (!realKey) return;
            try {
                await navigator.clipboard.writeText(realKey);
                copyBtn.innerHTML = CHECK_SVG;
                setTimeout(() => { copyBtn.innerHTML = COPY_SVG; }, 2000);
            } catch {
                // clipboard access denied — fail silently
            }
        });
    }
}

/**
 * Fetches fresh app, error, and performance data from the API and stores the
 * result in dashboardState for redraws.
 *
 * Uses an AbortController so a quick tab-switch doesn't leave two concurrent
 * fetches racing each other. { force: true } aborts any in-flight request
 * before starting a new one; without it, concurrent non-forced calls are
 * dropped entirely.
 *
 * @param {{ id: number, name?: string, url?: string }} selectedApp
 * @param {{ force?: boolean }} [options]
 */
async function refreshDashboard(selectedApp, options = {}) {
    if (!selectedApp?.id || document.hidden) {
        return;
    }

    if (refreshAbortController) {
        if (!options.force) {
            return;
        }
        refreshAbortController.abort();
    }

    refreshAbortController = new AbortController();
    const { signal } = refreshAbortController;

    setStatus('UP', `Checking ${selectedApp.name || 'project'}...`);

    try {
        const [appResponse, errorResponse, performanceResponse] = await Promise.all([
            fetch(`/api/apps/${selectedApp.id}`, { cache: 'no-store', signal }),
            fetch(`/api/events/error/apps/${selectedApp.id}`, { cache: 'no-store', signal }),
            fetch(`/api/events/performance/apps/${selectedApp.id}`, { cache: 'no-store', signal }),
        ]);

        const [appData, errorData, performanceData] = await Promise.all([
            appResponse.json(),
            errorResponse.json(),
            performanceResponse.json(),
        ]);

        // Merge the user-supplied URL back in if the server record doesn't have one
        const app = appResponse.ok && appData.app
            ? { ...appData.app, url: selectedApp.url }
            : selectedApp;
        const errors = Array.isArray(errorData.events) ? errorData.events : [];
        const performanceEvents = Array.isArray(performanceData.events) ? performanceData.events : [];

        dashboardState = {
            app,
            errors,
            performanceEvents,
        };

        redrawFromState();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error refreshing dashboard:', error);
            setStatus('DOWN', 'The latest monitoring events could not be loaded.');
        }
    } finally {
        if (refreshAbortController?.signal === signal) {
            refreshAbortController = null;
        }
    }
}

function stopAutoRefresh() {
    abortActiveRefresh();
}

function abortActiveRefresh() {
    if (refreshAbortController) {
        refreshAbortController.abort();
        refreshAbortController = null;
    }
}

/**
 * Re-renders all dashboard sections from dashboardState without re-fetching.
 * Called after every successful refresh and after filter changes.
 */
function redrawFromState() {
    if (!dashboardState) {
        return;
    }

    const { app, errors, performanceEvents } = dashboardState;
    const filteredErrors = filterErrors(errors, '24h', 'all');
    const filteredPerformance = filterPerformance(performanceEvents, '24h');

    populateProjectDetails({ app });
    renderStatus(app, filteredErrors, filteredPerformance);
    renderHealthBars(filteredErrors, filteredPerformance);
}

/**
 * Filters error events to a time window and optional severity bucket.
 *
 * @param {object[]} errors
 * @param {'24h' | '7d' | '30d'} range
 * @param {'all' | 'critical' | 'warning' | 'error'} severity
 * @returns {object[]}
 */
function filterErrors(errors, range, severity) {
    const cutoff = Date.now() - RANGE_MS[range];

    return errors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        const eventSeverity = normalizeSeverityBucket(event.metadata?.severity);
        const withinRange = Number.isFinite(timestamp) && timestamp >= cutoff;
        const severityMatch = severity === 'all' || eventSeverity === severity;
        return withinRange && severityMatch;
    });
}

/**
 * @param {object[]} events
 * @param {'24h' | '7d' | '30d'} range
 * @returns {object[]}
 */
function filterPerformance(events, range) {
    const cutoff = Date.now() - RANGE_MS[range];

    return events.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
}

/**
 * Determines the overall UP / WARN / DOWN badge using a priority chain:
 *
 * 1. Latest uptime check result (HTTP ping) — authoritative if present
 * 2. Critical error count vs WARNING_CRITICAL_THRESHOLD
 * 3. Any errors at all
 * 4. Performance telemetry as a fallback signal when no URL is configured
 *
 * @param {{ downOrNot?: boolean[] }} app
 * @param {object[]} filteredErrors
 * @param {object[]} filteredPerformance
 */
function renderStatus(app, filteredErrors, filteredPerformance) {
    const criticalErrors = filteredErrors.filter(isCriticalError);

    // Use the downOrNot array (HTTP uptime check results) as the primary signal.
    // latestCheck is true (up), false (down), or null (no URL / no checks yet).
    const downOrNot = Array.isArray(app.downOrNot) ? app.downOrNot : [];
    const latestCheck = downOrNot.length > 0 ? downOrNot[downOrNot.length - 1] : null;

    if (latestCheck === false) {
        setStatus('DOWN', 'The most recent uptime check failed to reach the service.');
        return;
    }

    if (criticalErrors.length > WARNING_CRITICAL_THRESHOLD) {
        setStatus('WARN', `${criticalErrors.length} critical errors were captured recently.`);
        return;
    }

    if (criticalErrors.length > 0) {
        setStatus('UP', `${criticalErrors.length} critical errors were captured recently.`);
        return;
    }

    if (filteredErrors.length > 0) {
        setStatus('UP', `${filteredErrors.length} non-critical errors were recorded in the last 24h.`);
        return;
    }

    if (latestCheck === true) {
        setStatus(
            'UP',
            filteredPerformance.length > 0
                ? 'Performance telemetry is flowing and no errors were found.'
                : 'The service is reachable and no errors were found.'
        );
        return;
    }

    // No URL configured — fall back to telemetry as the only signal.
    if (filteredPerformance.length > 0) {
        setStatus('UP', 'Performance telemetry is flowing and no errors were found.');
        return;
    }

    setStatus('DOWN', 'No recent error or performance events were found.');
}

/**
 * @param {object[]} filteredErrors
 * @param {object[]} filteredPerformance
 */
function renderHealthBars(filteredErrors, filteredPerformance) {
    const performanceScore = calculatePerformanceScore(filteredPerformance);
    const reliabilityScore = calculateReliabilityScore(filteredErrors, filteredPerformance);

    setHealthBar('performance', performanceScore);
    setHealthBar('reliability', reliabilityScore);
}

/**
 * Applies a health score (0–100) to the CSS ring element.
 * The --score-angle custom property drives the conic-gradient fill
 * (0deg = empty, 360deg = full).
 *
 * @param {'performance' | 'reliability'} prefix
 * @param {number} value - Raw score, clamped to [0, 100].
 */
function setHealthBar(prefix, value) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    const scoreRing = document.getElementById(`${prefix}-bar-fill`);
    const scoreValue = document.getElementById(`${prefix}-bar-value`);
    const scoreLabel = document.getElementById(`${prefix}-score-label`);
    const scoreCard = scoreRing.closest('.health-score');
    const scoreMeta = getHealthScoreMeta(safeValue);

    scoreRing.style.setProperty('--score-angle', `${safeValue * 3.6}deg`);
    scoreRing.classList.remove('score-blue', 'score-orange', 'score-red');
    scoreRing.classList.add(scoreMeta.className);
    scoreCard.classList.remove('score-blue', 'score-orange', 'score-red');
    scoreCard.classList.add(scoreMeta.className);
    scoreValue.textContent = String(safeValue);
    scoreLabel.textContent = scoreMeta.label;
}

/**
 * Maps a score to a display label and CSS class name.
 *
 * @param {number} score
 * @returns {{ label: string, className: string }}
 */
function getHealthScoreMeta(score) {
    if (score >= 80) {
        return { label: 'Excellent', className: 'score-blue' };
    }

    if (score >= 60) {
        return { label: 'Good', className: 'score-blue' };
    }

    if (score >= 40) {
        return { label: 'Warning', className: 'score-orange' };
    }

    return { label: 'Poor', className: 'score-red' };
}

/**
 * Performance score based on average response time.
 * Formula: 100 minus a linear penalty starting at 200ms.
 * At 200ms avg → score 100; every 8ms above 200ms → -1 point.
 * Returns 0 when no data is available.
 *
 * @param {object[]} filteredPerformance
 * @returns {number} Score in [0, 100].
 */
function calculatePerformanceScore(filteredPerformance) {
    const responseTimes = getResponseTimes(filteredPerformance);
    if (!responseTimes.length) {
        return 0;
    }

    const avgResponse = average(responseTimes);
    const score = 100 - ((avgResponse - 200) / 8);
    return Math.max(0, Math.min(100, score));
}

/**
 * Reliability score weighted by error severity.
 * Critical errors cost 12 points each, warnings cost 4, other errors cost 6 —
 * all divided by the total signal count (errors + perf events) to normalize
 * for app volume. Returns 0 when there are no events at all.
 *
 * @param {object[]} filteredErrors
 * @param {object[]} filteredPerformance
 * @returns {number} Score in [0, 100].
 */
function calculateReliabilityScore(filteredErrors, filteredPerformance) {
    const signalCount = filteredErrors.length + filteredPerformance.length;
    if (!signalCount) {
        return 0;
    }

    const criticalCount = filteredErrors.filter(isCriticalError).length;
    const warningCount = filteredErrors.filter((event) => normalizeSeverityBucket(event.metadata?.severity) === 'warning').length;
    const penalty = (criticalCount * 12) + (warningCount * 4) + ((filteredErrors.length - criticalCount - warningCount) * 6);
    const score = 100 - (penalty / signalCount);
    return Math.max(0, Math.min(100, score));
}

/**
 * Pulls numeric response times from performance events.
 * Prefers apiLatencyMs (from the fetch interceptor) and falls back to
 * loadTimeMs (from the page load timing).
 *
 * @param {object[]} events
 * @returns {number[]}
 */
function getResponseTimes(events) {
    return events
        .map((event) => Number(event.metadata?.apiLatencyMs ?? event.metadata?.loadTimeMs))
        .filter((value) => Number.isFinite(value));
}

/**
 * @param {string} name - Text for the project name heading and layout component.
 */
function setProjectName(name) {
    document.getElementById('status-project').textContent = name;
    const layout = document.querySelector('wt-dash-layout');
    if (layout) layout.setAttribute('app-name', name || '');
}

/**
 * Updates the status badge and removes/adds the appropriate status class.
 *
 * @param {'UP' | 'DOWN' | 'WARN'} status
 * @param {string} detail - One-sentence description shown below the badge.
 */
function setStatus(status, detail) {
    const statusText = document.getElementById('status-text');
    const statusDescription = document.getElementById('status-description');
    const statusContainer = document.querySelector('.status-container');

    statusText.textContent = status;
    statusDescription.textContent = detail;
    statusContainer.classList.remove('status-up', 'status-down', 'status-warn');

    if (status === 'DOWN') {
        statusContainer.classList.add('status-down');
        return;
    }

    if (status === 'WARN') {
        statusContainer.classList.add('status-warn');
        return;
    }

    statusContainer.classList.add('status-up');
}

/**
 * @param {object} event - Error event from the API.
 * @returns {boolean}
 */
function isCriticalError(event) {
    return normalizeSeverityBucket(event.metadata?.severity) === 'critical';
}

/**
 * @param {string | null | undefined} value - Raw ISO timestamp or epoch string.
 * @returns {string} Locale-formatted string, or "Unknown time" on bad input.
 */
function formatTimestamp(value) {
    if (!value) {
        return 'Unknown time';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown time';
    }

    return date.toLocaleString();
}

/**
 * Shows or hides the project URL link in the status section.
 *
 * @param {{ app: { url?: string } }} param0
 */
function populateProjectDetails({ app }) {
    const link = document.getElementById('project-url-link');
    if (app?.url) {
        link.href = app.url;
        link.hidden = false;
    } else {
        link.hidden = true;
    }
}

/**
 * Collapses severity strings into three buckets used for scoring and display.
 * "high" maps to "critical" and "low" maps to "warning" to match the collector's
 * output, which uses a four-level scale the dashboard flattens to three.
 *
 * @param {string | null | undefined} severity
 * @returns {'critical' | 'warning' | 'error'}
 */
function normalizeSeverityBucket(severity) {
    const value = String(severity || '').trim().toLowerCase();

    if (!value) {
        return 'error';
    }

    if (value === 'critical' || value === 'high') {
        return 'critical';
    }

    if (value === 'warning' || value === 'low') {
        return 'warning';
    }

    return 'error';
}

/**
 * Reads and parses a JSON value from localStorage.
 * Returns null on missing key or parse failure without throwing.
 *
 * @param {string} key
 * @returns {object | null}
 */
function readJsonStorage(key) {
    const rawValue = localStorage.getItem(key);

    if (!rawValue) {
        return null;
    }

    try {
        return JSON.parse(rawValue);
    } catch (error) {
        console.error(`Failed to parse ${key}:`, error);
        return null;
    }
}
