/* global flatpickr, Chart, getStoredUser, escapeHtml, average */

let refreshIntervalId = null;
const AUTO_REFRESH_MS = 5000;
let latencyChart = null;
let endpointChart = null;
let currentAppId = null;

document.addEventListener('DOMContentLoaded', () => {
    initPerformancePage();
});

/**
 * Entry point. Redirects to /login if no user session exists, then
 * sets up the date picker, control bindings, and kicks off the first data load.
 */
async function initPerformancePage() {
    const user = getStoredUser();

    if (!user?.id) {
        window.location.href = '/login';
        return;
    }

    const selectedApp = getStoredSelectedApp();

    if (!selectedApp?.id) {
        clearDashboard();
        return;
    }

    currentAppId = selectedApp.id;

    const layout = document.querySelector('wt-dash-layout');
    if (layout && selectedApp.name) layout.setAttribute('app-name', selectedApp.name);

    initDatePicker();
    bindControls();

    await loadSelectedAppPerformance();
    startAutoRefresh();
}

/**
 * @returns {{ id: number, name?: string } | null}
 */
function getStoredSelectedApp() {
    const raw = localStorage.getItem('watchtowerSelectedApp');

    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error('Failed to parse stored selected app:', error);
        return null;
    }
}

/**
 * Initializes flatpickr on the date range input.
 * Defaults to the last 7 days. Updates KPI period labels and reloads data on change.
 */
function initDatePicker() {
    flatpickr('#date-range', {
        mode: 'range',
        dateFormat: 'm/d/Y',
        defaultDate: [
            new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            new Date()
        ],
        onReady: () => updateKpiPeriods(),
        onChange: () => {
            updateKpiPeriods();
            loadSelectedAppPerformance();
        }
    });
}

/**
 * Wires up the metric line toggle (which series to show on the latency chart)
 * and the auto-refresh toggle switch.
 */
function bindControls() {
    document.querySelector('#line-toggle').addEventListener('change', loadSelectedAppPerformance);

    const autoRefreshToggle = document.querySelector('.toggle-switch input');

    const toggleStatus = document.querySelector('.toggle-status');
    toggleStatus.textContent = autoRefreshToggle.checked ? 'ON' : 'OFF';
    autoRefreshToggle.addEventListener('change', () => {

        toggleStatus.textContent =
            autoRefreshToggle.checked ? 'ON' : 'OFF';

        if (autoRefreshToggle.checked) {
            startAutoRefresh();
        } else {
            stopAutoRefresh();
        }
    });
}

async function loadSelectedAppPerformance() {
    const appId = currentAppId;

    if (!appId) {
        clearDashboard();
        return;
    }

    await loadPerformanceData(appId);
}

/**
 * Fetches all performance events for an app, filters them to the selected
 * date range, then drives every rendered section from the result.
 *
 * @param {number} appId
 */
async function loadPerformanceData(appId) {
    try {
        const response = await fetch(`/api/events/performance/apps/${appId}`, {
            cache: 'no-store'
        });

        const data = await response.json();
        const events = Array.isArray(data.events) ? data.events : [];
        const filteredEvents = filterEventsByDateRange(events);

        updateKpiPeriods();
        renderKpis(filteredEvents, events);
        renderSparklines(filteredEvents, events);
        renderBottleneckInsights(filteredEvents);
        renderSlowRequestsTable(filteredEvents);
        renderLatencyChart(filteredEvents);
        renderEndpointPerformanceChart(filteredEvents);
    } catch (error) {
        console.error('Failed to load performance data:', error);
        clearDashboard();
    }
}

/**
 * Filters events to the currently selected date range.
 * End of day (23:59:59.999) is applied so events on the last selected
 * day are included. Returns the full set if no range is selected.
 *
 * @param {object[]} events
 * @returns {object[]}
 */
function filterEventsByDateRange(events) {
    const dateRangeValue = document.querySelector('#date-range').value;

    if (!dateRangeValue || !dateRangeValue.includes(' to ')) {
        return events;
    }

    const [startValue, endValue] = dateRangeValue.split(' to ');
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    endDate.setHours(23, 59, 59, 999);

    return events.filter((event) => {
        const eventDate = new Date(event.timestamp || event.receivedAt);
        return eventDate >= startDate && eventDate <= endDate;
    });
}

/**
 * Renders all five KPI cards with current period values and period-over-period
 * change indicators. allEvents is the full unfiltered set used to compute the
 * previous period for the delta arrows.
 *
 * @param {object[]} events - Events in the selected date range.
 * @param {object[]} [allEvents] - Full event set for previous-period comparison.
 */
function renderKpis(events, allEvents = events) {
    const previousEvents = filterEventsByPreviousDateRange(allEvents);

    const avgResponseTime = average(getNumbers(events, 'apiLatencyMs'));
    const previousAvgResponseTime = average(getNumbers(previousEvents, 'apiLatencyMs'));

    const p95Latency = percentile(getNumbers(events, 'apiLatencyMs'), 95);
    const previousP95Latency = percentile(getNumbers(previousEvents, 'apiLatencyMs'), 95);

    const avgPageLoadTime = average(getNumbers(events, 'loadTimeMs'));
    const previousAvgPageLoadTime = average(getNumbers(previousEvents, 'loadTimeMs'));

    const avgMemoryUsage = average(getNumbers(events, 'memoryMB'));
    const previousAvgMemoryUsage = average(getNumbers(previousEvents, 'memoryMB'));

    document.querySelector('#avg-response-time').textContent =
        avgResponseTime ? `${Math.round(avgResponseTime)} ms` : 'No data';

    document.querySelector('#p95-latency').textContent =
        p95Latency ? `${Math.round(p95Latency)} ms` : 'No data';

    document.querySelector('#avg-page-load-time').textContent =
        avgPageLoadTime ? `${Math.round(avgPageLoadTime)} ms` : 'No data';

    document.querySelector('#avg-memory-usage').textContent =
        avgMemoryUsage ? `${Math.round(avgMemoryUsage)} MB` : 'No data';

    const slowest = getSlowestEndpoint(events);

    document.querySelector('#slowest-endpoint').textContent =
        getSlowestEndpoint(events).endpoint;
    document.querySelector('#slowest-endpoint').title =
        getSlowestEndpoint(events).endpoint;

    setChangeText('#avg-response-change', avgResponseTime, previousAvgResponseTime, 'ms');
    setChangeText('#p95-latency-change', p95Latency, previousP95Latency, 'ms');
    setChangeText('#avg-page-load-change', avgPageLoadTime, previousAvgPageLoadTime, 'ms');
    setChangeText('#avg-memory-change', avgMemoryUsage, previousAvgMemoryUsage, 'MB');

    const slowestCurrent = getSlowestEndpoint(events).latency;
    const slowestPrevious = getSlowestEndpoint(previousEvents).latency;

    setChangeText('#slowest-endpoint-change', slowestCurrent, slowestPrevious, 'ms');
}

/**
 * Fills the bottleneck insight cards with the slowest endpoint and highest
 * average TTFB endpoint, then colors the cards by severity.
 *
 * @param {object[]} events
 */
function renderBottleneckInsights(events) {
    const slowest = getSlowestEndpoint(events);
    const highestTtfb = getHighestAverageEndpoint(events, 'ttfbMs');

    updateInsightCardColors(slowest, highestTtfb);

    document.querySelector('#slowest-endpoint-insight').textContent =
        formatEndpoint(slowest.endpoint);

    document.querySelector('#slowest-endpoint-latency').textContent =
        slowest.latency ? `${Math.round(slowest.latency)} ms avg` : 'No data';

    document.querySelector('#highest-ttfb-endpoint').textContent =
        formatEndpoint(highestTtfb.endpoint);

    document.querySelector('#highest-ttfb-value').textContent =
        highestTtfb.value ? `${Math.round(highestTtfb.value)} ms avg` : 'No data';
}

/**
 * Applies severity CSS classes to the two bottleneck insight cards.
 *
 * @param {{ latency: number }} slowest
 * @param {{ value: number }} highestTtfb
 */
function updateInsightCardColors(slowest, highestTtfb) {
    applySeverity(
        'slowest-endpoint-card',
        'slowest-endpoint-latency',
        getLatencySeverity(slowest.latency)
    );

    applySeverity(
        'highest-ttfb-card',
        'highest-ttfb-value',
        getTtfbSeverity(highestTtfb.value)
    );
}

/**
 * Removes old severity classes from a card and applies the new one.
 *
 * @param {string} cardId
 * @param {string} metricId - Unused here but kept for future per-metric styling.
 * @param {'critical' | 'warning' | 'healthy' | 'neutral'} severity
 */
function applySeverity(cardId, metricId, severity) {
    const card = document.getElementById(cardId);

    if (!card) return;

    card.classList.remove(
        'critical',
        'warning',
        'healthy',
        'neutral'
    );

    card.classList.add(severity);
}

/**
 * Thresholds: > 800ms → critical, > 300ms → warning, otherwise healthy.
 *
 * @param {number} value - Average latency in ms.
 * @returns {'critical' | 'warning' | 'healthy' | 'neutral'}
 */
function getLatencySeverity(value) {
    if (!value) return 'neutral';
    if (value > 800) return 'critical';
    if (value > 300) return 'warning';
    return 'healthy';
}

/**
 * Thresholds: > 500ms → critical, > 200ms → warning, otherwise healthy.
 * TTFB is more sensitive than overall latency — a slow first byte means
 * the server itself is slow, not just the network.
 *
 * @param {number} value - Average TTFB in ms.
 * @returns {'critical' | 'warning' | 'healthy' | 'neutral'}
 */
function getTtfbSeverity(value) {
    if (!value) return 'neutral';
    if (value > 500) return 'critical';
    if (value > 200) return 'warning';
    return 'healthy';
}

/**
 * Renders the top-10 slowest API requests table sorted by apiLatencyMs descending.
 * Uses innerHTML with escapeHtml rather than DOM APIs because the table is
 * rebuilt entirely on each refresh and the escaping is simpler to audit in a template.
 *
 * @param {object[]} events
 */
function renderSlowRequestsTable(events) {
    const tbody = document.querySelector('#slow-requests-body');

    const slowRequests = [...events]
        .filter((event) => Number.isFinite(Number(event.metadata?.apiLatencyMs)))
        .sort((a, b) => Number(b.metadata.apiLatencyMs) - Number(a.metadata.apiLatencyMs))
        .slice(0, 10);

    if (!slowRequests.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">No performance data found.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = slowRequests.map((event) => `
        <tr>
            <td>${formatTimestamp(event.timestamp || event.receivedAt)}</td>
            <td class="endpoint-cell">
                <a
                    href="${escapeHtml(event.metadata?.apiEndpoint || event.url || '#')}"
                    target="_blank"
                    title="${escapeHtml(event.metadata?.apiEndpoint || event.url || 'N/A')}"
                >
                    ${escapeHtml(formatEndpoint(event.metadata?.apiEndpoint || event.url || 'N/A'))}
                </a>
            </td>
            <td>${formatMetric(event.metadata?.apiLatencyMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.loadTimeMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.ttfbMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.memoryMB, 'MB')}</td>
        </tr>
    `).join('');
}

/**
 * Extracts numeric values for a given metadata field from an event array.
 * Non-finite values (NaN, Infinity, missing) are dropped.
 *
 * @param {object[]} events
 * @param {string} field - Key inside event.metadata.
 * @returns {number[]}
 */
function getNumbers(events, field) {
    return events
        .map((event) => Number(event.metadata?.[field]))
        .filter((value) => Number.isFinite(value));
}

/**
 * Computes the Nth percentile of a sorted numeric array.
 * Uses ceiling-based index so p95 of a 20-element array is index 19 (worst of first 19).
 *
 * @param {number[]} values
 * @param {number} percentileNumber - e.g. 95 for p95.
 * @returns {number} 0 if the array is empty.
 */
function percentile(values, percentileNumber) {
    if (!values.length) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentileNumber / 100) * sorted.length) - 1;

    return sorted[index];
}

/**
 * Convenience wrapper — slowest endpoint is just the highest average apiLatencyMs.
 *
 * @param {object[]} events
 * @returns {{ endpoint: string, latency: number }}
 */
function getSlowestEndpoint(events) {
    return getHighestAverageEndpoint(events, 'apiLatencyMs', 'latency');
}

/**
 * Finds the endpoint with the highest average value for a given metadata field.
 * Groups by endpoint URL, computes per-group averages, then returns the winner.
 * Returns { endpoint: 'N/A', [valueKey]: 0 } when no data matches.
 *
 * @param {object[]} events
 * @param {string} field - Metadata field to aggregate (e.g. 'apiLatencyMs').
 * @param {string} [valueKey='value'] - Key name for the result value.
 * @returns {{ endpoint: string, [valueKey]: number }}
 */
function getHighestAverageEndpoint(events, field, valueKey = 'value') {
    const endpointMap = new Map();

    events.forEach((event) => {
        const endpoint = event.metadata?.apiEndpoint || event.url;
        const value = Number(event.metadata?.[field]);

        if (!endpoint || !Number.isFinite(value)) return;

        const current = endpointMap.get(endpoint) || { total: 0, count: 0 };
        current.total += value;
        current.count += 1;
        endpointMap.set(endpoint, current);
    });

    let result = {
        endpoint: 'N/A',
        [valueKey]: 0,
    };

    endpointMap.forEach((stats, endpoint) => {
        const avg = stats.total / stats.count;

        if (avg > result[valueKey]) {
            result = {
                endpoint,
                [valueKey]: avg,
            };
        }
    });

    return result;
}

/**
 * Starts polling at AUTO_REFRESH_MS if the toggle is checked.
 * Always stops any existing interval first to prevent stacking.
 */
function startAutoRefresh() {
    stopAutoRefresh();

    const autoRefreshToggle = document.querySelector('.toggle-switch input');

    if (!autoRefreshToggle.checked) return;

    refreshIntervalId = window.setInterval(loadSelectedAppPerformance, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
    if (refreshIntervalId) {
        window.clearInterval(refreshIntervalId);
        refreshIntervalId = null;
    }
}

/**
 * Renders sparklines for all five KPI cards.
 * Each sparkline is colored based on whether current performance is better or
 * worse than the previous period: green = improved, red = regressed, purple = baseline.
 *
 * @param {object[]} events - Current period events.
 * @param {object[]} [allEvents] - Full set used to derive the previous period.
 */
function renderSparklines(events, allEvents = events) {
    const previousEvents = filterEventsByPreviousDateRange(allEvents);

    renderSparkline(
        'avg-response-sparkline',
        getNumbers(events, 'apiLatencyMs'),
        getComparisonColor(
            average(getNumbers(events, 'apiLatencyMs')),
            average(getNumbers(previousEvents, 'apiLatencyMs'))
        )
    );

    renderSparkline(
        'p95-latency-sparkline',
        getNumbers(events, 'apiLatencyMs'),
        getComparisonColor(
            percentile(getNumbers(events, 'apiLatencyMs'), 95),
            percentile(getNumbers(previousEvents, 'apiLatencyMs'), 95)
        )
    );

    // Slowest endpoint sparkline is always red — it represents the worst case
    renderSparkline(
        'slowest-endpoint-sparkline',
        getNumbers(events, 'apiLatencyMs'),
        '#c86468'
    );

    renderSparkline(
        'avg-page-load-sparkline',
        getNumbers(events, 'loadTimeMs'),
        getComparisonColor(
            average(getNumbers(events, 'loadTimeMs')),
            average(getNumbers(previousEvents, 'loadTimeMs'))
        )
    );

    renderSparkline(
        'avg-memory-sparkline',
        getNumbers(events, 'memoryMB'),
        getComparisonColor(
            average(getNumbers(events, 'memoryMB')),
            average(getNumbers(previousEvents, 'memoryMB'))
        )
    );
}

// Raw canvas instead of Chart.js: sparklines need to be very lightweight
// (many on screen at once) and don't need axes, tooltips, or animations.
/**
 * Draws a minimal line sparkline on a canvas element.
 * Values are normalized to fill the canvas height so the shape is visible
 * regardless of the absolute value range.
 *
 * @param {string} canvasId
 * @param {number[]} values
 * @param {string} [color='#8b5cf6'] - CSS color for the stroke.
 */
function renderSparkline(canvasId, values, color = '#8b5cf6') {
    const canvas = document.getElementById(canvasId);

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth || 200;
    const height = canvas.clientHeight || 42;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    if (!values || values.length < 2) {
        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText('No data available', width / 2, height / 2);
        return;
    }

    const min = Math.min(...values);
    const max = Math.max(...values);
    // Avoid division by zero when all values are identical
    const range = max - min || 1;

    ctx.beginPath();

    values.forEach((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * height;

        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });

    ctx.lineWidth = 3;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.stroke();
}

/**
 * Renders the main latency line chart. Supports three series (avg, p95, avg page load)
 * controlled by the #line-toggle select. Shows a "no data" message on an empty canvas
 * rather than an empty chart with just axes.
 *
 * @param {object[]} events
 */
function renderLatencyChart(events) {
    const canvas = document.getElementById('latency-chart');
    const selectedMetric = document.getElementById('line-toggle').value;

    if (!canvas || !window.Chart) return;

    if (!events.length) {
        if (latencyChart) {
            latencyChart.destroy();
            latencyChart = null;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth || 600;
        canvas.height = canvas.clientHeight || 260;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No latency data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const grouped = groupEventsByDate(events);
    const labels = grouped.map((item) => item.label);
    const datasets = [];

    if (selectedMetric === 'all' || selectedMetric === 'avg-latency') {
        datasets.push({
            label: 'Average Latency',
            data: grouped.map((item) => item.avgLatency),
            borderWidth: 2,
            tension: 0.35,
            pointRadius: grouped.length === 1 ? 6 : 3,
            pointHoverRadius: 8
        });
    }

    if (selectedMetric === 'all' || selectedMetric === 'p95-latency') {
        datasets.push({
            label: 'P95 Response Time (Typical worst-case latency)',
            data: grouped.map((item) => item.p95Latency),
            borderWidth: 2,
            tension: 0.35,
            pointRadius: grouped.length === 1 ? 6 : 3,
            pointHoverRadius: 8
        });
    }

    if (selectedMetric === 'all' || selectedMetric === 'avg-page-load-time') {
        datasets.push({
            label: 'Average Page Load Time',
            data: grouped.map((item) => item.avgLoadTime),
            borderWidth: 2,
            tension: 0.35,
            pointRadius: grouped.length === 1 ? 6 : 3,
            pointHoverRadius: 8
        });
    }

    if (latencyChart) {
        latencyChart.destroy();
    }

    latencyChart = new Chart(canvas, {
        type: 'line',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            spanGaps: false,

            plugins: {
                legend: {
                    position: 'top',
                    align: 'start',

                    labels: {
                        boxWidth: 12,
                        boxHeight: 12,
                        padding: 20,
                        font: {
                            size: 13,
                            weight: '600'
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `${value} ms`
                    }
                }
            }
        }
    });
}

/**
 * Renders a horizontal bar chart of average latency per endpoint, sorted
 * slowest first. Bar color is determined by getEndpointBarColor thresholds.
 *
 * @param {object[]} events
 */
function renderEndpointPerformanceChart(events) {
    const canvas = document.getElementById('endpoint-performance-chart');

    if (!canvas || !window.Chart) return;

    if (!events.length) {
        if (endpointChart) {
            endpointChart.destroy();
            endpointChart = null;
        }

        const ctx = canvas.getContext('2d');
        canvas.width = canvas.clientWidth || 600;
        canvas.height = canvas.clientHeight || 260;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No endpoint performance data available', canvas.width / 2, canvas.height / 2);
        return;
    }

    const endpointStats = groupEventsByEndpoint(events)
        .sort((a, b) => b.avgLatency - a.avgLatency);

    let labels = endpointStats.map((item) => formatEndpoint(item.endpoint));
    let values = endpointStats.map((item) => item.avgLatency);

    if (endpointChart) {
        endpointChart.destroy();
    }

    endpointChart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Average Latency',
                data: values,
                borderRadius: 5,
                backgroundColor: values.map((value) => getEndpointBarColor(value))
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: false
                }
            },

            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        callback: (value) => `${value} ms`
                    }
                },
                y: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Color thresholds for the endpoint bar chart.
 * ≥ 700ms → red, ≥ 400ms → orange, ≥ 250ms → yellow, < 250ms → teal.
 *
 * @param {number} value - Average latency in ms.
 * @returns {string} CSS hex color.
 */
function getEndpointBarColor(value) {
    if (value >= 700) return '#c86468';
    if (value >= 400) return '#f97316';
    if (value >= 250) return '#f5ce60';
    return '#0ac2a3';
}

/**
 * Groups events by calendar date and computes average latency, p95, and average
 * page load time per day. Entries are sorted chronologically for the chart.
 * Null is used (instead of 0) when a bucket has no data for a metric so
 * Chart.js renders a gap rather than a misleading zero.
 *
 * @param {object[]} events
 * @returns {Array<{ label: string, avgLatency: number|null, p95Latency: number|null, avgLoadTime: number|null }>}
 */
function groupEventsByDate(events) {
    const map = new Map();

    events.forEach((event) => {
        const date = new Date(event.timestamp || event.receivedAt);
        const key = date.toISOString().slice(0, 10);
        const label = date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
        });

        if (!map.has(key)) {
            map.set(key, {
                label,
                latencies: [],
                loadTimes: []
            });
        }

        const bucket = map.get(key);

        const latency = Number(event.metadata?.apiLatencyMs);
        const loadTime = Number(event.metadata?.loadTimeMs);

        if (Number.isFinite(latency)) bucket.latencies.push(latency);
        if (Number.isFinite(loadTime)) bucket.loadTimes.push(loadTime);
    });

    return [...map.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, bucket]) => ({
            label: bucket.label,
            avgLatency: bucket.latencies.length ? Math.round(average(bucket.latencies)) : null,
            p95Latency: bucket.latencies.length ? Math.round(percentile(bucket.latencies, 95)) : null,
            avgLoadTime: bucket.loadTimes.length ? Math.round(average(bucket.loadTimes)) : null,
        }));
}

/**
 * Groups events by endpoint and computes average API latency per endpoint.
 * Events without an apiEndpoint or url are skipped.
 *
 * @param {object[]} events
 * @returns {Array<{ endpoint: string, avgLatency: number }>}
 */
function groupEventsByEndpoint(events) {
    const map = new Map();

    events.forEach((event) => {
        const endpoint = event.metadata?.apiEndpoint || event.url;
        if (!endpoint) return;

        if (!map.has(endpoint)) {
            map.set(endpoint, { endpoint, latencies: [] });
        }

        const latency = Number(event.metadata?.apiLatencyMs);
        if (Number.isFinite(latency)) map.get(endpoint).latencies.push(latency);
    });

    return [...map.values()].map((bucket) => ({
        endpoint: bucket.endpoint,
        avgLatency: Math.round(average(bucket.latencies)),
    }));
}

/**
 * Resets all KPI values to "No data" and clears charts.
 * Called when no app is selected or the data fetch fails.
 */
function clearDashboard() {
    document.querySelector('#avg-response-time').textContent = 'No data';
    document.querySelector('#p95-latency').textContent = 'No data';
    document.querySelector('#slowest-endpoint').textContent = 'N/A';
    document.querySelector('#slowest-endpoint').title = 'N/A';
    document.querySelector('#avg-page-load-time').textContent = 'No data';
    document.querySelector('#avg-memory-usage').textContent = 'No data';

    applySeverity('slowest-endpoint-card', 'slowest-endpoint-latency', 'neutral');
    applySeverity('highest-ttfb-card', 'highest-ttfb-value', 'neutral');

    document.querySelector('#highest-ttfb-endpoint').textContent = 'N/A';
    document.querySelector('#highest-ttfb-value').textContent = 'No data';

    renderSparklines([]);
    renderLatencyChart([]);
    renderEndpointPerformanceChart([]);

    document.querySelector('#slowest-endpoint-insight').textContent = 'N/A';
    document.querySelector('#slowest-endpoint-latency').textContent = 'No data';

    document.querySelector('#slow-requests-body').innerHTML = `
        <tr>
            <td colspan="6">No performance data found.</td>
        </tr>
    `;
}

/**
 * @param {string | null | undefined} value - ISO timestamp or epoch string.
 * @returns {string}
 */
function formatTimestamp(value) {
    if (!value) return 'Unknown time';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Unknown time';

    return date.toLocaleString();
}

/**
 * Formats a numeric metric with its unit. Returns 'N/A' for non-finite values.
 *
 * @param {number | string | null | undefined} value
 * @param {string} unit - e.g. 'ms' or 'MB'.
 * @returns {string}
 */
function formatMetric(value, unit) {
    const number = Number(value);

    if (!Number.isFinite(number)) return 'N/A';

    return `${Math.round(number)} ${unit}`;
}

/**
 * Updates the "vs. [date range]" period label shown under each KPI card.
 */
function updateKpiPeriods() {
    const dateRangeValue = document.querySelector('#date-range').value;
    const periods = document.querySelectorAll('.kpi-period');

    periods.forEach((period) => {
        period.textContent = dateRangeValue || 'Selected date range';
    });
}

/**
 * Derives the previous date range by shifting the selected window one full
 * period backward. Used to compute period-over-period delta arrows.
 * Returns null if no range is selected.
 *
 * @returns {{ previousStartDate: Date, previousEndDate: Date } | null}
 */
function getPreviousDateRange() {
    const dateRangeValue = document.querySelector('#date-range').value;

    if (!dateRangeValue || !dateRangeValue.includes(' to ')) {
        return null;
    }

    const [startValue, endValue] = dateRangeValue.split(' to ');
    const startDate = new Date(startValue);
    const endDate = new Date(endValue);

    const rangeMs = endDate - startDate;

    const previousEndDate = new Date(startDate);
    previousEndDate.setDate(previousEndDate.getDate() - 1);

    const previousStartDate = new Date(previousEndDate);
    previousStartDate.setTime(previousEndDate.getTime() - rangeMs);

    previousEndDate.setHours(23, 59, 59, 999);

    return { previousStartDate, previousEndDate };
}

/**
 * Filters events to the previous period window for delta comparison.
 * Returns an empty array if no date range is selected (delta arrows show "No previous data").
 *
 * @param {object[]} events
 * @returns {object[]}
 */
function filterEventsByPreviousDateRange(events) {
    const previousRange = getPreviousDateRange();

    if (!previousRange) return [];

    return events.filter((event) => {
        const eventDate = new Date(event.timestamp || event.receivedAt);

        return (
            eventDate >= previousRange.previousStartDate &&
            eventDate <= previousRange.previousEndDate
        );
    });
}

/**
 * Formats the change between two values as "↑/↓ N unit (X%)".
 * Returns "No previous data" if either value is missing.
 *
 * @param {number} currentValue
 * @param {number} previousValue
 * @param {string} unit
 * @returns {string}
 */
function formatChange(currentValue, previousValue, unit) {
    if (!currentValue || !previousValue) return 'No previous data';

    const difference = currentValue - previousValue;
    const percent = Math.abs((difference / previousValue) * 100).toFixed(1);

    const arrow = difference <= 0 ? '↓' : '↑';
    const absoluteDifference = Math.abs(Math.round(difference));

    return `${arrow} ${absoluteDifference} ${unit} (${percent}%)`;
}

/**
 * Writes the formatted change string to a DOM element and applies
 * "positive" or "negative" classes. For performance metrics, lower is better —
 * a decrease gets the "positive" class (green), an increase gets "negative" (red).
 *
 * @param {string} elementId - CSS selector string (e.g. '#avg-response-change').
 * @param {number} currentValue
 * @param {number} previousValue
 * @param {string} unit
 */
function setChangeText(elementId, currentValue, previousValue, unit) {
    const element = document.querySelector(elementId);
    if (!element) return;
    const difference = currentValue - previousValue;

    element.textContent = formatChange(currentValue, previousValue, unit);

    element.classList.remove('positive', 'negative');

    if (!currentValue || !previousValue) {
        return;
    }

    if (difference <= 0) {
        element.classList.add('positive');
    } else {
        element.classList.add('negative');
    }
}

/**
 * Returns a sparkline stroke color based on whether the current value is
 * better (lower), worse (higher), or unchanged vs the previous period.
 * Returns the neutral purple when either value is missing.
 *
 * @param {number} currentValue
 * @param {number} previousValue
 * @returns {string} CSS hex color.
 */
function getComparisonColor(currentValue, previousValue) {
    if (!currentValue || !previousValue) {
        return '#8b5cf6';
    }

    // lower is better
    if (currentValue < previousValue) {
        return '#0ac2a3';
    }

    // higher is worse
    if (currentValue > previousValue) {
        return '#c86468';
    }

    return '#8b5cf6';
}

/**
 * Truncates an endpoint URL to just the hostname for display in charts.
 * Falls back to the raw string if it isn't a parseable URL (e.g. relative paths).
 * Hostnames longer than 18 chars are clipped with an ellipsis.
 *
 * @param {string | null | undefined} endpoint
 * @returns {string}
 */
function formatEndpoint(endpoint) {
    if (!endpoint || endpoint === 'N/A') {
        return 'N/A';
    }

    try {
        const hostname = new URL(endpoint).hostname;

        return hostname.length > 18
            ? hostname.slice(0, 18) + '...'
            : hostname;
    } catch {
        return endpoint;
    }
}
