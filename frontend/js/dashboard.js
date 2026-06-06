/* global average */

document.addEventListener('DOMContentLoaded', () => {
    initDashboard().catch((error) => {
        console.error('Dashboard failed to initialize:', error);
        setStatus('DOWN', 'Could not load dashboard data.', 'No app data was available for this dashboard.');
    });
});

const RANGE_MS = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

let dashboardChart = null;
let selectedChartView = 'line';
let dashboardState = null;
let refreshAbortController = null;
const EMPTY_VALUE = 'No data';
const WARNING_CRITICAL_THRESHOLD = 5;

async function initDashboard() {
    const selectedApp = await resolveSelectedApp();

    if (!selectedApp?.id) {
        setStatus('DOWN', 'No selected project.', 'Return to app selection and choose a project.');
        renderEmptyLogs('No selected app.');
        populateProjectDetails({ app: null, owner: null, errors: [], performanceEvents: [] });
        renderHealthBars([], []);
        return;
    }

    setProjectName(selectedApp.name || 'Selected project');
    populateProjectDetails({
        app: selectedApp,
        owner: null,
        errors: [],
        performanceEvents: [],
    });
    bindDashboardControls();
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

function bindDashboardControls() {
    document.getElementById('refresh-dashboard').addEventListener('click', async () => {
        const selectedApp = readJsonStorage('watchtowerSelectedApp');
        if (selectedApp?.id) {
            await refreshDashboard(selectedApp, { force: true });
        }
    });

    document.getElementById('time-range').addEventListener('change', () => redrawFromState());
    document.getElementById('severity-filter').addEventListener('change', () => redrawFromState());
    document.querySelector('wt-date-filter')?.addEventListener('datechange', () => redrawFromState());

    document.querySelectorAll('.graph-setting').forEach((setting) => {
        setting.addEventListener('click', () => {
            selectedChartView = setting.dataset.chartView || 'line';
            document.querySelectorAll('.graph-setting').forEach((item) => item.classList.remove('active'));
            setting.classList.add('active');
            redrawFromState();
        });
    });

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

    setStatus('UP', `Checking ${selectedApp.name || 'project'}...`, 'Refreshing dashboard statistics from recent events.');

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

        if (appResponse.status === 404) {
            localStorage.removeItem('watchtowerSelectedApp');
            window.location.replace('/apps');
            return;
        }

        const app = appResponse.ok && appData.app
            ? { ...appData.app, url: selectedApp.url }
            : selectedApp;
        const owner = await fetchOwner(app.ownerId);
        const errors = Array.isArray(errorData.events) ? errorData.events : [];
        const performanceEvents = Array.isArray(performanceData.events) ? performanceData.events : [];

        dashboardState = {
            app,
            owner,
            errors,
            performanceEvents,
        };

        redrawFromState();
    } catch (error) {
        if (error.name !== 'AbortError') {
            console.error('Error refreshing dashboard:', error);
            setStatus('DOWN', 'Could not refresh dashboard.', 'The latest monitoring events could not be loaded.');
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


// Both current-period and previous-period sets are derived here so that
// each render function (metrics, chart, logs) can compute deltas without
// re-filtering independently.
function redrawFromState() {
    if (!dashboardState) {
        return;
    }

    const { app, owner, errors, performanceEvents } = dashboardState;
    const range = document.getElementById('time-range').value;
    const severity = document.getElementById('severity-filter').value;
    const filteredErrors = filterErrors(errors, range, severity);
    const previousErrors = filterErrorsForPreviousPeriod(errors, range, severity);
    const filteredPerformance = filterPerformance(performanceEvents, range);
    const previousPerformance = filterPerformanceForPreviousPeriod(performanceEvents, range);

    populateProjectDetails({
        app,
        owner,
        errors: filteredErrors,
        performanceEvents: filteredPerformance,
    });
    renderStatus(app, filteredErrors, filteredPerformance);
    renderMetrics(errors, filteredErrors, previousErrors, filteredPerformance, previousPerformance);
    renderHealthBars(filteredErrors, filteredPerformance);
    renderGraph(filteredErrors, filteredPerformance);
    renderLogs(app, filteredErrors, filteredPerformance);
}

function getSelectedDateRange() {
    const filter = document.querySelector('wt-date-filter');
    const from = filter?.from;
    const to = filter?.to;
    if (!from || !to) return null;
    const start = new Date(from);
    const end = new Date(to);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { startTime: start.getTime(), endTime: end.getTime() };
}

function filterErrors(errors, range, severity) {
    const dateRange = getSelectedDateRange();
    const cutoff = Date.now() - RANGE_MS[range];

    return errors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        if (!Number.isFinite(timestamp)) return false;
        const eventSeverity = normalizeSeverityBucket(event.metadata?.severity);
        const withinRange = dateRange
            ? timestamp >= dateRange.startTime && timestamp <= dateRange.endTime
            : timestamp >= cutoff;
        const severityMatch = severity === 'all' || eventSeverity === severity;
        return withinRange && severityMatch;
    });
}

function filterErrorsForPreviousPeriod(errors, range, severity) {
    const dateRange = getSelectedDateRange();
    let start, end;
    if (dateRange) {
        const span = dateRange.endTime - dateRange.startTime;
        end = dateRange.startTime - 1;
        start = end - span;
    } else {
        end = Date.now() - RANGE_MS[range];
        start = end - RANGE_MS[range];
    }

    return errors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        const eventSeverity = normalizeSeverityBucket(event.metadata?.severity);
        const withinRange = Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
        const severityMatch = severity === 'all' || eventSeverity === severity;
        return withinRange && severityMatch;
    });
}

function filterPerformance(events, range) {
    const dateRange = getSelectedDateRange();
    const cutoff = Date.now() - RANGE_MS[range];

    return events.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        if (!Number.isFinite(timestamp)) return false;
        return dateRange
            ? timestamp >= dateRange.startTime && timestamp <= dateRange.endTime
            : timestamp >= cutoff;
    });
}

function filterPerformanceForPreviousPeriod(events, range) {
    const dateRange = getSelectedDateRange();
    let start, end;
    if (dateRange) {
        const span = dateRange.endTime - dateRange.startTime;
        end = dateRange.startTime - 1;
        start = end - span;
    } else {
        end = Date.now() - RANGE_MS[range];
        start = end - RANGE_MS[range];
    }

    return events.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
    });
}

function renderStatus(app, filteredErrors, filteredPerformance) {
    const criticalErrors = filteredErrors.filter(isCriticalError);

    if (criticalErrors.length > WARNING_CRITICAL_THRESHOLD) {
        setStatus(
            'WARN',
            `${app.name || 'Project'} is up with elevated critical errors.`,
            `${criticalErrors.length} critical errors were captured recently.`
        );
        return;
    }

    if (criticalErrors.length > 0) {
        setStatus(
            'UP',
            `${app.name || 'Project'} is up with critical issues to review.`,
            `${criticalErrors.length} critical errors were captured recently.`
        );
        return;
    }

    if (filteredErrors.length > 0) {
        setStatus(
            'UP',
            `${app.name || 'Project'} is up with recent non-critical issues.`,
            `${filteredErrors.length} non-critical errors were recorded in the selected range.`
        );
        return;
    }

    if (filteredPerformance.length > 0) {
        setStatus(
            'UP',
            `${app.name || 'Project'} is up.`,
            'Recent performance telemetry is flowing and no matching errors were found.'
        );
        return;
    }

    setStatus(
        'DOWN',
        `${app.name || 'Project'} has no recent telemetry.`,
        'No recent error or performance events were found for the selected range.'
    );
}

function renderMetrics(allErrors, filteredErrors, previousErrors, filteredPerformance, previousPerformance) {
    const todayErrors = allErrors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp) && timestamp >= Date.now() - RANGE_MS['24h'];
    }).length;
    const yesterdayErrors = allErrors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp)
            && timestamp >= Date.now() - (2 * RANGE_MS['24h'])
            && timestamp < Date.now() - RANGE_MS['24h'];
    }).length;

    const avgResponse = average(getResponseTimes(filteredPerformance));
    const previousAvgResponse = average(getResponseTimes(previousPerformance));
    const criticalErrors = filteredErrors.filter(isCriticalError).length;
    const activeUrls = countUniqueUrls(filteredErrors, filteredPerformance);

    document.getElementById('errors-today-value').textContent = String(todayErrors);
    document.getElementById('errors-today-compare').textContent = buildDeltaText(todayErrors, yesterdayErrors, 'from yesterday');
    document.getElementById('avg-response-value').textContent = avgResponse ? `${Math.round(avgResponse)} ms` : EMPTY_VALUE;
    document.getElementById('avg-response-compare').textContent = buildDeltaText(Math.round(avgResponse || 0), Math.round(previousAvgResponse || 0), 'from previous period');
    document.getElementById('critical-errors-value').textContent = String(criticalErrors);
    document.getElementById('critical-errors-compare').textContent = `${filteredErrors.length} total matching errors`;
    document.getElementById('active-urls-value').textContent = String(activeUrls);
    document.getElementById('active-urls-compare').textContent = activeUrls ? 'unique endpoints in range' : 'no tracked URLs';
}

function renderHealthBars(filteredErrors, filteredPerformance) {
    const performanceScore = calculatePerformanceScore(filteredPerformance);
    const reliabilityScore = calculateReliabilityScore(filteredErrors, filteredPerformance);

    setHealthBar('performance', performanceScore);
    setHealthBar('reliability', reliabilityScore);
}

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

function renderGraph(filteredErrors, filteredPerformance) {
    const graphTitle = document.getElementById('graph-title');
    const graphSummary = document.getElementById('graph-summary');
    const chartCanvasShell = document.getElementById('chart-canvas-shell');
    const chartTableShell = document.getElementById('chart-table-shell');
    const noEvents = !filteredErrors.length && !filteredPerformance.length;

    if (selectedChartView === 'table') {
        graphTitle.textContent = 'Recent event table';
        graphSummary.textContent = filteredErrors.length
            ? `${filteredErrors.length} matching errors shown in tabular form.`
            : 'No matching error events in the selected range.';
        chartCanvasShell.hidden = true;
        chartTableShell.hidden = false;
        renderChartTable(filteredErrors);
        destroyChart();
        return;
    }

    chartCanvasShell.hidden = false;
    chartTableShell.hidden = true;

    graphTitle.textContent = 'Error volume over time';
    graphSummary.textContent = noEvents
        ? 'No recent error or performance events were found for the selected range.'
        : 'Recent error volume grouped by day or hour for the selected range.';
    renderLineChart(filteredErrors);
}

function renderLogs(app, filteredErrors, filteredPerformance) {
    const logsBody = document.getElementById('logs-table-body');
    const recentRows = [
        ...filteredErrors.map((event) => ({
            time: event.timestamp || event.receivedAt,
            project: app.name || 'Selected project',
            status: normalizeSeverity(event.metadata?.severity),
            message: event.metadata?.message || 'Error event',
        })),
        ...filteredPerformance.slice(-5).map((event) => ({
            time: event.timestamp || event.receivedAt,
            project: app.name || 'Selected project',
            status: 'UP',
            message: buildPerformanceMessage(event),
        })),
    ]
        .sort((left, right) => Date.parse(right.time || 0) - Date.parse(left.time || 0))
        .slice(0, 10);

    if (!recentRows.length) {
        renderEmptyLogs('No recent logs or outages for the selected range.');
        return;
    }

    const fragment = document.createDocumentFragment();

    recentRows.forEach((row) => {
        const tableRow = document.createElement('tr');
        const values = [formatTimestamp(row.time), row.project, row.status, row.message];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            if (index === values.length - 1) {
                cell.className = 'logs-message-cell';
                cell.title = value;
            }
            cell.textContent = value;
            tableRow.appendChild(cell);
        });

        fragment.appendChild(tableRow);
    });

    logsBody.replaceChildren(fragment);
}

function renderEmptyLogs(message) {
    const logsBody = document.getElementById('logs-table-body');
    const row = document.createElement('tr');
    const cell = document.createElement('td');

    cell.colSpan = 4;
    cell.textContent = message;
    row.appendChild(cell);
    logsBody.replaceChildren(row);
}

function renderChartTable(filteredErrors) {
    const tableBody = document.getElementById('chart-table-body');

    if (!filteredErrors.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');

        cell.colSpan = 4;
        cell.textContent = 'No matching error events in the selected range.';
        row.appendChild(cell);
        tableBody.replaceChildren(row);
        return;
    }

    const fragment = document.createDocumentFragment();
    const sortedErrors = [...filteredErrors]
        .sort((left, right) => Date.parse(right.timestamp || 0) - Date.parse(left.timestamp || 0));

    sortedErrors.forEach((event) => {
        const row = document.createElement('tr');
        const values = [
            formatTimestamp(event.timestamp || event.receivedAt),
            normalizeSeverity(event.metadata?.severity),
            event.metadata?.message || 'Error event',
            event.url || 'N/A',
        ];

        values.forEach((value, index) => {
            const cell = document.createElement('td');
            if (index >= 2) {
                cell.className = index === 2 ? 'chart-message-cell' : 'chart-url-cell';
                cell.title = value;
            }
            cell.textContent = value;
            row.appendChild(cell);
        });

        fragment.appendChild(row);
    });

    tableBody.replaceChildren(fragment);
}

function renderLineChart(filteredErrors) {
    const dateRange = getSelectedDateRange();
    const range = document.getElementById('time-range').value;
    const spanDays = dateRange ? (dateRange.endTime - dateRange.startTime) / 86400000 : null;
    const bucketSize = (spanDays !== null ? spanDays : (range === '24h' ? 0 : 1)) <= 1 ? 'hour' : 'day';
    const buckets = bucketErrors(filteredErrors, bucketSize);

    createOrUpdateChart('line', {
        labels: buckets.labels,
        datasets: [{
            label: 'Errors',
            data: buckets.values,
            borderColor: '#1f49ff',
            backgroundColor: 'rgba(31, 73, 255, 0.18)',
            tension: 0.3,
            fill: true,
        }],
    });
}

function createOrUpdateChart(type, data) {
    const context = document.getElementById('dashboard-chart');

    destroyChart();
    dashboardChart = new window.Chart(context, {
        type,
        data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type !== 'line',
                },
            },
            scales: type === 'pie' ? {} : {
                y: {
                    beginAtZero: true,
                },
            },
        },
    });
}

function destroyChart() {
    if (dashboardChart) {
        dashboardChart.destroy();
        dashboardChart = null;
    }
}

function bucketErrors(errors, bucketSize) {
    const formatOptions = bucketSize === 'hour'
        ? { hour: 'numeric', month: 'short', day: 'numeric' }
        : { month: 'short', day: 'numeric' };
    const map = new Map();

    errors.forEach((event) => {
        const date = new Date(event.timestamp || event.receivedAt || 0);
        const key = bucketSize === 'hour'
            ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`
            : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        const label = date.toLocaleString(undefined, formatOptions);
        const bucket = map.get(key) || { label, count: 0 };
        bucket.count += 1;
        map.set(key, bucket);
    });

    const sortedBuckets = [...map.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([, value]) => value);
    return {
        labels: sortedBuckets.map((bucket) => bucket.label),
        values: sortedBuckets.map((bucket) => bucket.count),
    };
}

function calculatePerformanceScore(filteredPerformance) {
    const responseTimes = getResponseTimes(filteredPerformance);
    if (!responseTimes.length) {
        return 0;
    }

    const avgResponse = average(responseTimes);
    const score = 100 - ((avgResponse - 200) / 8);
    return Math.max(0, Math.min(100, score));
}

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

function countUniqueUrls(filteredErrors, filteredPerformance) {
    const urls = new Set();

    [...filteredErrors, ...filteredPerformance].forEach((event) => {
        if (event.url) {
            urls.add(event.url);
        }
        if (event.metadata?.apiEndpoint) {
            urls.add(event.metadata.apiEndpoint);
        }
    });

    return urls.size;
}

function getResponseTimes(events) {
    return events
        .map((event) => Number(event.metadata?.apiLatencyMs ?? event.metadata?.loadTimeMs))
        .filter((value) => Number.isFinite(value));
}

function setProjectName(name) {
    document.getElementById('status-project').textContent = name;
    const layout = document.querySelector('wt-dash-layout');
    if (layout) layout.setAttribute('app-name', name || '');
}

function setStatus(status, description, detail) {
    const statusText = document.getElementById('status-text');
    const statusDescription = document.getElementById('status-description');
    const statusContainer = document.querySelector('.status-container');

    statusText.textContent = status;
    statusDescription.textContent = detail;
    document.getElementById('status-project').textContent = description;
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

function isCriticalError(event) {
    return normalizeSeverityBucket(event.metadata?.severity) === 'critical';
}

function normalizeSeverity(severity) {
    return normalizeSeverityBucket(severity).toUpperCase();
}

function buildPerformanceMessage(event) {
    const apiLatency = Number(event.metadata?.apiLatencyMs);
    const loadTime = Number(event.metadata?.loadTimeMs);
    const domContentLoaded = Number(event.metadata?.domContentLoadedMs);
    const ttfb = Number(event.metadata?.ttfbMs);
    const apiEndpoint = event.metadata?.apiEndpoint;

    if (Number.isFinite(apiLatency)) {
        return `${apiEndpoint || 'API'} latency ${Math.round(apiLatency)} ms`;
    }

    if (Number.isFinite(loadTime)) {
        return `Load time ${Math.round(loadTime)} ms`;
    }

    if (Number.isFinite(domContentLoaded)) {
        return `DOM ready ${Math.round(domContentLoaded)} ms`;
    }

    if (Number.isFinite(ttfb)) {
        return `TTFB ${Math.round(ttfb)} ms`;
    }

    return 'Performance event received';
}

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

function buildDeltaText(current, previous, suffix) {
    const delta = current - previous;

    if (delta === 0) {
        return `No change ${suffix}`;
    }

    const direction = delta > 0 ? '+' : '';
    return `${direction}${delta} ${suffix}`;
}

async function fetchOwner(ownerId) {
    if (!ownerId) {
        return null;
    }

    try {
        const response = await fetch(`/api/users/${ownerId}`, { cache: 'no-store' });
        const data = await response.json();
        return response.ok ? data.user || null : null;
    } catch (error) {
        console.error('Failed to fetch owner:', error);
        return null;
    }
}

function populateProjectDetails({ app, owner, errors, performanceEvents }) {
    const events = [...errors, ...performanceEvents];
    const latestEvent = events
        .sort((left, right) => Date.parse(right.timestamp || right.receivedAt || 0)
            - Date.parse(left.timestamp || left.receivedAt || 0))[0];
    const latestRelease = findLatestRelease(events);

    document.getElementById('more-info-title').textContent = `${app?.name || 'Project'} info`;
    document.getElementById('detail-app-name').textContent = app?.name || EMPTY_VALUE;
    document.getElementById('detail-owner-name').textContent = owner?.username || owner?.email || EMPTY_VALUE;
    document.getElementById('detail-project-url').textContent = app?.url || EMPTY_VALUE;
    document.getElementById('detail-latest-release').textContent = latestRelease || EMPTY_VALUE;
    document.getElementById('detail-last-event').textContent = latestEvent
        ? `${formatTimestamp(latestEvent.timestamp || latestEvent.receivedAt)} (${latestEvent.type})`
        : EMPTY_VALUE;
}

function findLatestRelease(events) {
    for (const event of events) {
        if (event.metadata?.release) {
            return String(event.metadata.release);
        }
    }

    return '';
}

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
