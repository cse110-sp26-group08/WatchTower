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
let refreshIntervalId = null;
let isRefreshing = false;
const AUTO_REFRESH_MS = 5000;

async function initDashboard() {
    const selectedApp = await resolveSelectedApp();

    if (!selectedApp?._id) {
        setStatus('DOWN', 'No selected project.', 'Return to app selection and choose a project.');
        renderEmptyLogs('No selected app.');
        return;
    }

    setProjectName(selectedApp.name || 'Selected project');
    bindDashboardControls();
    await refreshDashboard(selectedApp);
    startAutoRefresh();
}

async function resolveSelectedApp() {
    const queryAppId = new URLSearchParams(window.location.search).get('appId');
    const storedApp = readJsonStorage('watchtowerSelectedApp');

    if (queryAppId) {
        try {
            const response = await fetch(`/api/apps/${queryAppId}`);
            const data = await response.json();

            if (response.ok && data.app) {
                const appWithUrl = storedApp && storedApp._id === data.app._id
                    ? { ...data.app, url: storedApp.url }
                    : data.app;
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
        if (selectedApp?._id) {
            await refreshDashboard(selectedApp);
        }
    });

    document.getElementById('time-range').addEventListener('change', () => redrawFromState());
    document.getElementById('severity-filter').addEventListener('change', () => redrawFromState());

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
            return;
        }

        const selectedApp = readJsonStorage('watchtowerSelectedApp');
        if (selectedApp?._id) {
            await refreshDashboard(selectedApp);
        }
    });

    window.addEventListener('beforeunload', () => {
        stopAutoRefresh();
    });
}

async function refreshDashboard(selectedApp) {
    if (isRefreshing) {
        return;
    }

    isRefreshing = true;
    setStatus('UP', `Checking ${selectedApp.name || 'project'}...`, 'Refreshing dashboard statistics from recent events.');

    try {
        const [errorResponse, performanceResponse] = await Promise.all([
            fetch(`/api/events/error/apps/${selectedApp._id}`, { cache: 'no-store' }),
            fetch(`/api/events/performance/apps/${selectedApp._id}`, { cache: 'no-store' }),
        ]);

        const errorData = await errorResponse.json();
        const performanceData = await performanceResponse.json();

        const errors = Array.isArray(errorData.events) ? errorData.events : [];
        const performanceEvents = Array.isArray(performanceData.events) ? performanceData.events : [];

        dashboardState = {
            app: selectedApp,
            errors,
            performanceEvents,
        };

        redrawFromState();
    } finally {
        isRefreshing = false;
    }
}

function startAutoRefresh() {
    stopAutoRefresh();
    refreshIntervalId = window.setInterval(async () => {
        const selectedApp = readJsonStorage('watchtowerSelectedApp');
        if (!selectedApp?._id || document.hidden) {
            return;
        }

        await refreshDashboard(selectedApp);
    }, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
    if (refreshIntervalId) {
        window.clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
}

function redrawFromState() {
    if (!dashboardState) {
        return;
    }

    const { app, errors, performanceEvents } = dashboardState;
    const range = document.getElementById('time-range').value;
    const severity = document.getElementById('severity-filter').value;
    const filteredErrors = filterErrors(errors, range, severity);
    const previousErrors = filterErrorsForPreviousPeriod(errors, range, severity);
    const filteredPerformance = filterPerformance(performanceEvents, range);
    const previousPerformance = filterPerformanceForPreviousPeriod(performanceEvents, range);

    renderStatus(app, filteredErrors, filteredPerformance);
    renderMetrics(errors, filteredErrors, previousErrors, filteredPerformance, previousPerformance);
    renderGraph(filteredErrors, filteredPerformance);
    renderLogs(app, filteredErrors, filteredPerformance);
}

function filterErrors(errors, range, severity) {
    const cutoff = Date.now() - RANGE_MS[range];

    return errors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        const eventSeverity = String(event.metadata?.severity || '').toLowerCase();
        const withinRange = Number.isFinite(timestamp) && timestamp >= cutoff;
        const severityMatch = severity === 'all' || eventSeverity === severity;
        return withinRange && severityMatch;
    });
}

function filterErrorsForPreviousPeriod(errors, range, severity) {
    const end = Date.now() - RANGE_MS[range];
    const start = end - RANGE_MS[range];

    return errors.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        const eventSeverity = String(event.metadata?.severity || '').toLowerCase();
        const withinRange = Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
        const severityMatch = severity === 'all' || eventSeverity === severity;
        return withinRange && severityMatch;
    });
}

function filterPerformance(events, range) {
    const cutoff = Date.now() - RANGE_MS[range];

    return events.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp) && timestamp >= cutoff;
    });
}

function filterPerformanceForPreviousPeriod(events, range) {
    const end = Date.now() - RANGE_MS[range];
    const start = end - RANGE_MS[range];

    return events.filter((event) => {
        const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
        return Number.isFinite(timestamp) && timestamp >= start && timestamp < end;
    });
}

function renderStatus(app, filteredErrors, filteredPerformance) {
    const criticalErrors = filteredErrors.filter(isCriticalError);

    if (criticalErrors.length > 0) {
        setStatus(
            'DOWN',
            `${app.name || 'Project'} has critical errors in the selected range.`,
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
    const uptime = calculateUptime(filteredErrors, filteredPerformance);
    const activeUrls = countUniqueUrls(filteredErrors, filteredPerformance);

    document.getElementById('errors-today-value').textContent = String(todayErrors);
    document.getElementById('errors-today-compare').textContent = buildDeltaText(todayErrors, yesterdayErrors, 'from yesterday');
    document.getElementById('avg-response-value').textContent = avgResponse ? `${Math.round(avgResponse)} ms` : 'No data';
    document.getElementById('avg-response-compare').textContent = buildDeltaText(Math.round(avgResponse || 0), Math.round(previousAvgResponse || 0), 'from previous period');
    document.getElementById('critical-errors-value').textContent = String(criticalErrors);
    document.getElementById('critical-errors-compare').textContent = `${filteredErrors.length} total matching errors`;
    document.getElementById('uptime-value').textContent = `${uptime}%`;
    document.getElementById('uptime-compare').textContent = 'derived from event coverage';
    document.getElementById('active-urls-value').textContent = String(activeUrls);
    document.getElementById('active-urls-compare').textContent = activeUrls ? 'unique endpoints in range' : 'no tracked URLs';
}

function renderGraph(filteredErrors, filteredPerformance) {
    const graphTitle = document.getElementById('graph-title');
    const graphSummary = document.getElementById('graph-summary');
    const chartCanvasShell = document.getElementById('chart-canvas-shell');
    const chartTableShell = document.getElementById('chart-table-shell');

    if (selectedChartView === 'table') {
        graphTitle.textContent = 'Recent event table';
        graphSummary.textContent = `${filteredErrors.length} matching errors shown in tabular form.`;
        chartCanvasShell.hidden = true;
        chartTableShell.hidden = false;
        renderChartTable(filteredErrors);
        destroyChart();
        return;
    }

    chartCanvasShell.hidden = false;
    chartTableShell.hidden = true;

    if (selectedChartView === 'pie') {
        graphTitle.textContent = 'Error severity breakdown';
        graphSummary.textContent = 'Distribution of matching errors by severity.';
        renderPieChart(filteredErrors);
        return;
    }

    if (selectedChartView === 'bar') {
        graphTitle.textContent = 'Response time snapshot';
        graphSummary.textContent = 'Average response times for recent performance signals.';
        renderBarChart(filteredPerformance);
        return;
    }

    graphTitle.textContent = 'Error volume over time';
    graphSummary.textContent = 'Recent error volume grouped by day or hour for the selected range.';
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

    logsBody.innerHTML = recentRows.map((row) => `
        <tr>
            <td>${escapeHtml(formatTimestamp(row.time))}</td>
            <td>${escapeHtml(row.project)}</td>
            <td>${escapeHtml(row.status)}</td>
            <td>${escapeHtml(row.message)}</td>
        </tr>
    `).join('');
}

function renderEmptyLogs(message) {
    document.getElementById('logs-table-body').innerHTML = `
        <tr>
            <td colspan="4">${escapeHtml(message)}</td>
        </tr>
    `;
}

function renderChartTable(filteredErrors) {
    const tableBody = document.getElementById('chart-table-body');

    if (!filteredErrors.length) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="4">No matching error events in the selected range.</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = filteredErrors
        .sort((left, right) => Date.parse(right.timestamp || 0) - Date.parse(left.timestamp || 0))
        .map((event) => `
            <tr>
                <td>${escapeHtml(formatTimestamp(event.timestamp || event.receivedAt))}</td>
                <td>${escapeHtml(normalizeSeverity(event.metadata?.severity))}</td>
                <td>${escapeHtml(event.metadata?.message || 'Error event')}</td>
                <td>${escapeHtml(event.url || 'N/A')}</td>
            </tr>
        `)
        .join('');
}

function renderLineChart(filteredErrors) {
    const range = document.getElementById('time-range').value;
    const bucketSize = range === '24h' ? 'hour' : 'day';
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

function renderPieChart(filteredErrors) {
    const counts = {
        critical: 0,
        error: 0,
        warning: 0,
        other: 0,
    };

    filteredErrors.forEach((event) => {
        const severity = String(event.metadata?.severity || '').toLowerCase();
        if (severity in counts) {
            counts[severity] += 1;
        } else {
            counts.other += 1;
        }
    });

    createOrUpdateChart('pie', {
        labels: ['Critical', 'Error', 'Warning', 'Other'],
        datasets: [{
            data: [counts.critical, counts.error, counts.warning, counts.other],
            backgroundColor: ['#b42318', '#f04438', '#f79009', '#98a2b3'],
        }],
    });
}

function renderBarChart(filteredPerformance) {
    const responseTimes = getResponseTimes(filteredPerformance);
    const loadTimes = filteredPerformance
        .map((event) => Number(event.metadata?.loadTimeMs))
        .filter((value) => Number.isFinite(value));

    createOrUpdateChart('bar', {
        labels: ['API latency', 'Load time'],
        datasets: [{
            label: 'Milliseconds',
            data: [
                Math.round(average(responseTimes) || 0),
                Math.round(average(loadTimes) || 0),
            ],
            backgroundColor: ['#1f49ff', '#00a38c'],
        }],
    });
}

function createOrUpdateChart(type, data) {
    const context = document.getElementById('dashboard-chart');

    destroyChart();
    dashboardChart = new Chart(context, {
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

function calculateUptime(filteredErrors, filteredPerformance) {
    const range = document.getElementById('time-range').value;
    const bucketCount = range === '24h' ? 24 : (range === '7d' ? 7 : 30);
    const bucketSizeMs = RANGE_MS[range] / bucketCount;
    const start = Date.now() - RANGE_MS[range];
    let healthyBuckets = 0;

    for (let index = 0; index < bucketCount; index += 1) {
        const bucketStart = start + (index * bucketSizeMs);
        const bucketEnd = bucketStart + bucketSizeMs;
        const hasCritical = filteredErrors.some((event) => {
            const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
            return Number.isFinite(timestamp) && timestamp >= bucketStart && timestamp < bucketEnd && isCriticalError(event);
        });
        const hasSignal = filteredErrors.some((event) => {
            const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
            return Number.isFinite(timestamp) && timestamp >= bucketStart && timestamp < bucketEnd;
        }) || filteredPerformance.some((event) => {
            const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
            return Number.isFinite(timestamp) && timestamp >= bucketStart && timestamp < bucketEnd;
        });

        if (hasSignal && !hasCritical) {
            healthyBuckets += 1;
        }
    }

    return Math.round((healthyBuckets / bucketCount) * 100);
}

function countUniqueUrls(filteredErrors, filteredPerformance) {
    const urls = new Set();

    [...filteredErrors, ...filteredPerformance].forEach((event) => {
        if (event.url) {
            urls.add(event.url);
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
}

function setStatus(status, description, detail) {
    const statusText = document.getElementById('status-text');
    const statusDescription = document.getElementById('status-description');
    const statusContainer = document.querySelector('.status-container');

    statusText.textContent = status;
    statusDescription.textContent = detail;
    statusContainer.classList.remove('status-up', 'status-down');
    statusContainer.classList.add(status === 'DOWN' ? 'status-down' : 'status-up');
    document.getElementById('status-project').textContent = description;
}

function isCriticalError(event) {
    const severity = String(event.metadata?.severity || '').toLowerCase();
    return severity === 'critical' || severity === 'high';
}

function normalizeSeverity(severity) {
    if (!severity) {
        return 'ERROR';
    }

    return String(severity).toUpperCase();
}

function buildPerformanceMessage(event) {
    const apiLatency = Number(event.metadata?.apiLatencyMs);
    const loadTime = Number(event.metadata?.loadTimeMs);

    if (Number.isFinite(apiLatency)) {
        return `API latency ${Math.round(apiLatency)} ms`;
    }

    if (Number.isFinite(loadTime)) {
        return `Load time ${Math.round(loadTime)} ms`;
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

function average(values) {
    if (!values.length) {
        return 0;
    }

    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildDeltaText(current, previous, suffix) {
    const delta = current - previous;

    if (delta === 0) {
        return `No change ${suffix}`;
    }

    const direction = delta > 0 ? '+' : '';
    return `${direction}${delta} ${suffix}`;
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

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
