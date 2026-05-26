console.log('performance.js loaded');

// temp[orary] API base URL - in production, this should be set via environment variable or config
const API_BASE_URL = 'http://localhost:3000';

let refreshIntervalId = null;
const AUTO_REFRESH_MS = 5000;
let latencyChart = null;
let endpointChart = null;

// wait until the HTML is fully loaded before initializing the page
document.addEventListener('DOMContentLoaded', () => {
    initPerformancePage();
});

// Initialize the performance dashboard page
async function initPerformancePage() {
    // Check for stored user session
    const user = getStoredUser();

    // If no valid user session, redirect to login page
    if (!user?.id) {
        window.location.href = '/login';
        return;
    }

    // Initialize date picker, bind event listeners, and load apps for the user
    initDatePicker();
    bindControls();

    // Load apps and performance data for the user
    await loadApps(user.id);
}

function getStoredUser() {
    const rawUser = localStorage.getItem('watchtowerUser');

    if (!rawUser) return null;

    try {
        return JSON.parse(rawUser);
    } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('watchtowerUser');
        return null;
    }
}

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

function bindControls() {
    document.querySelector('#select-app').addEventListener('change', loadSelectedAppPerformance);
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

async function loadApps(ownerId) {
    const selectApp = document.querySelector('#select-app');

    try {
        //temporary direct API call - in production, this should be done via a backend endpoint to avoid CORS issues and to secure the API key
        const response = await fetch(`${API_BASE_URL}/api/apps/users/${ownerId}`);
        const data = await response.json();
        const apps = Array.isArray(data.apps) ? data.apps : [];

        selectApp.innerHTML = '';

        if (!apps.length) {
            selectApp.innerHTML = '<option value="">No apps found</option>';
            clearDashboard();
            return;
        }

        apps.forEach((app) => {
            const option = document.createElement('option');
            option.value = app.id;
            option.textContent = app.name;
            selectApp.appendChild(option);
        });

        await loadSelectedAppPerformance();
        startAutoRefresh();
    } catch (error) {
        console.error('Failed to load apps:', error);
        selectApp.innerHTML = '<option value="">Could not load projects</option>';
        clearDashboard();
    }
}

async function loadSelectedAppPerformance() {
    const appId = document.querySelector('#select-app').value;

    if (!appId) {
        clearDashboard();
        return;
    }

    await loadPerformanceData(appId);
}

async function loadPerformanceData(appId) {
    try {
      //temporary direct API call - in production, this should be done via a backend endpoint to avoid CORS issues and to secure the API key
        const response = await fetch(`${API_BASE_URL}/api/events/performance/apps/${appId}`, {
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

    document.querySelector('#slowest-endpoint').textContent =
        getSlowestEndpoint(events).endpoint;

    setChangeText('#avg-response-change', avgResponseTime, previousAvgResponseTime, 'ms');
    setChangeText('#p95-latency-change', p95Latency, previousP95Latency, 'ms');
    setChangeText('#avg-page-load-change', avgPageLoadTime, previousAvgPageLoadTime, 'ms');
    setChangeText('#avg-memory-change', avgMemoryUsage, previousAvgMemoryUsage, 'MB');

    const slowestCurrent = getSlowestEndpoint(events).latency;
    const slowestPrevious = getSlowestEndpoint(previousEvents).latency;

    setChangeText('#slowest-endpoint-change', slowestCurrent, slowestPrevious, 'ms');
}

function renderBottleneckInsights(events) {
    const slowest = getSlowestEndpoint(events);
    const highestTtfb = getHighestAverageEndpoint(events, 'ttfbMs');
    const mostFrequentSlow = getMostFrequentSlowEndpoint(events);
    const largestIncrease = getLargestLatencyIncrease(events);

    updateInsightCardColors(slowest, highestTtfb, mostFrequentSlow, largestIncrease);
    document.querySelector('#slowest-endpoint-insight').textContent = slowest.endpoint;
    document.querySelector('#slowest-endpoint-latency').textContent =
        slowest.latency ? `${Math.round(slowest.latency)} ms avg` : 'No data';

    document.querySelector('#highest-ttfb-endpoint').textContent = highestTtfb.endpoint;
    document.querySelector('#highest-ttfb-value').textContent =
        highestTtfb.value ? `${Math.round(highestTtfb.value)} ms avg` : 'No data';

    document.querySelector('#most-frequent-slow-endpoint').textContent = mostFrequentSlow.endpoint;
    document.querySelector('#slow-request-count').textContent =

        mostFrequentSlow.count ? `${mostFrequentSlow.count} slow requests` : 'No data';
    document.querySelector('#largest-latency-increase-endpoint').textContent = largestIncrease.endpoint;
    document.querySelector('#largest-latency-increase').textContent =
        largestIncrease.percent ? `↑ ${largestIncrease.percent}%` : 'No data';
}

function updateInsightCardColors(slowest, highestTtfb, mostFrequentSlow, largestIncrease) {
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

    applySeverity(
        'slow-request-card',
        'slow-request-count',
        getSlowRequestSeverity(mostFrequentSlow.count)
    );

    applySeverity(
        'latency-increase-card',
        'largest-latency-increase',
        getIncreaseSeverity(largestIncrease.percent)
    );
}

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

function getLatencySeverity(value) {

    if (!value) return 'neutral';

    if (value > 800) return 'critical';

    if (value > 300) return 'warning';

    return 'healthy';

}

function getTtfbSeverity(value) {

    if (!value) return 'neutral';

    if (value > 500) return 'critical';

    if (value > 200) return 'warning';

    return 'healthy';

}

function getSlowRequestSeverity(value) {

    if (!value) return 'neutral';

    if (value > 100) return 'critical';

    if (value > 20) return 'warning';

    return 'healthy';

}

function getIncreaseSeverity(value) {

    if (!value) return 'neutral';

    if (value > 30) return 'critical';

    if (value > 10) return 'warning';

    return 'healthy';

}

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
            <td>${escapeHtml(event.metadata?.apiEndpoint || event.url || 'N/A')}</td>
            <td>${formatMetric(event.metadata?.apiLatencyMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.loadTimeMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.ttfbMs, 'ms')}</td>
            <td>${formatMetric(event.metadata?.memoryMB, 'MB')}</td>
        </tr>
    `).join('');
}

function getNumbers(events, field) {
    return events
        .map((event) => Number(event.metadata?.[field]))
        .filter((value) => Number.isFinite(value));
}

function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentile(values, percentileNumber) {
    if (!values.length) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentileNumber / 100) * sorted.length) - 1;

    return sorted[index];
}

function getSlowestEndpoint(events) {
    return getHighestAverageEndpoint(events, 'apiLatencyMs', 'latency');
}

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
        value: 0
    };

    endpointMap.forEach((stats, endpoint) => {
        const avg = stats.total / stats.count;

        if (avg > result[valueKey]) {
            result = {
                endpoint,
                [valueKey]: avg,
                value: avg
            };
        }
    });

    return result;
}

function getMostFrequentSlowEndpoint(events) {
    const SLOW_REQUEST_MS = 1000;
    const counts = new Map();

    events.forEach((event) => {
        const endpoint = event.metadata?.apiEndpoint || event.url;
        const latency = Number(event.metadata?.apiLatencyMs);

        if (!endpoint || !Number.isFinite(latency) || latency < SLOW_REQUEST_MS) return;

        counts.set(endpoint, (counts.get(endpoint) || 0) + 1);
    });

    let result = { endpoint: 'N/A', count: 0 };

    counts.forEach((count, endpoint) => {
        if (count > result.count) {
            result = { endpoint, count };
        }
    });

    return result;
}

function getLargestLatencyIncrease(events) {
    const sortedEvents = [...events]
        .filter((event) => Number.isFinite(Number(event.metadata?.apiLatencyMs)))
        .sort((a, b) => new Date(a.timestamp || a.receivedAt) - new Date(b.timestamp || b.receivedAt));

    const midpoint = Math.floor(sortedEvents.length / 2);

    if (midpoint === 0) {
        return { endpoint: 'N/A', percent: 0 };
    }

    const firstHalf = sortedEvents.slice(0, midpoint);
    const secondHalf = sortedEvents.slice(midpoint);
    const endpoints = new Set(sortedEvents.map((event) => event.metadata?.apiEndpoint || event.url));

    let result = { endpoint: 'N/A', percent: 0 };

    endpoints.forEach((endpoint) => {
        if (!endpoint) return;

        const firstAvg = average(
            firstHalf
                .filter((event) => (event.metadata?.apiEndpoint || event.url) === endpoint)
                .map((event) => Number(event.metadata?.apiLatencyMs))
                .filter((value) => Number.isFinite(value))
        );

        const secondAvg = average(
            secondHalf
                .filter((event) => (event.metadata?.apiEndpoint || event.url) === endpoint)
                .map((event) => Number(event.metadata?.apiLatencyMs))
                .filter((value) => Number.isFinite(value))
        );

        if (!firstAvg || !secondAvg) return;

        const percent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);

        if (percent > result.percent) {
            result = { endpoint, percent };
        }
    });

    return result;
}

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

function renderSparkline(canvasId, values, color = '#8b5cf6') {
    const canvas = document.getElementById(canvasId);

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.clientWidth || 200;
    const height = canvas.clientHeight || 42;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // No data state
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

function renderLatencyChart(events) {
    const canvas = document.getElementById('latency-chart');
    const selectedMetric = document.getElementById('line-toggle').value;

    if (!canvas || !window.Chart) return;

    if (!events.length) {
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.clientWidth || 600;
    canvas.height = canvas.clientHeight || 260;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#9ca3af';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.fillText(
        'No latency data available',
        canvas.width / 2,
        canvas.height / 2
    );

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
            pointRadius: 0
        });
    }

    if (selectedMetric === 'all' || selectedMetric === 'p95-latency') {
        datasets.push({
            label: 'P95 Latency',
            data: grouped.map((item) => item.p95Latency),
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0
        });
    }

    if (selectedMetric === 'all' || selectedMetric === 'avg-page-load-time') {
        datasets.push({
            label: 'Average Page Load Time',
            data: grouped.map((item) => item.avgLoadTime),
            borderWidth: 2,
            tension: 0.35,
            pointRadius: 0
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

function renderEndpointPerformanceChart(events) {
    const canvas = document.getElementById('endpoint-performance-chart');

    if (!canvas || !window.Chart) return;

    if (!events.length) {
        const ctx = canvas.getContext('2d');

        canvas.width = canvas.clientWidth || 600;
        canvas.height = canvas.clientHeight || 260;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#9ca3af';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillText(
            'No endpoint performance data available',
            canvas.width / 2,
            canvas.height / 2
        );

        return;
    }

    const endpointStats = groupEventsByEndpoint(events)
        .sort((a, b) => b.avgLatency - a.avgLatency);

    let labels = endpointStats.map((item) => item.endpoint);
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

function getEndpointBarColor(value) {
    if (value >= 700) return '#c86468';
    if (value >= 400) return '#f97316';
    if (value >= 250) return '#f5ce60';
    return '#0ac2a3';
}

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
            avgLatency: Math.round(average(bucket.latencies)),
            p95Latency: Math.round(percentile(bucket.latencies, 95)),
            avgLoadTime: Math.round(average(bucket.loadTimes))
        }));
}

function groupEventsByEndpoint(events) {
    const map = new Map();

    events.forEach((event) => {
        const endpoint = event.metadata?.apiEndpoint || event.url;
        if (!endpoint) return;

        if (!map.has(endpoint)) {
            map.set(endpoint, {
                endpoint,
                latencies: [],
                loadTimes: [],
                ttfbs: []
            });
        }

        const bucket = map.get(endpoint);

        const latency = Number(event.metadata?.apiLatencyMs);
        const loadTime = Number(event.metadata?.loadTimeMs);
        const ttfb = Number(event.metadata?.ttfbMs);

        if (Number.isFinite(latency)) bucket.latencies.push(latency);
        if (Number.isFinite(loadTime)) bucket.loadTimes.push(loadTime);
        if (Number.isFinite(ttfb)) bucket.ttfbs.push(ttfb);
    });

    return [...map.values()].map((bucket) => ({
        endpoint: bucket.endpoint,
        avgLatency: Math.round(average(bucket.latencies)),
        p95Latency: Math.round(percentile(bucket.latencies, 95)),
        avgLoadTime: Math.round(average(bucket.loadTimes)),
        avgTtfb: Math.round(average(bucket.ttfbs))
    }));
}

function clearDashboard() {
    document.querySelector('#avg-response-time').textContent = 'No data';
    document.querySelector('#p95-latency').textContent = 'No data';
    document.querySelector('#slowest-endpoint').textContent = 'N/A';
    document.querySelector('#avg-page-load-time').textContent = 'No data';
    document.querySelector('#avg-memory-usage').textContent = 'No data';

    applySeverity('slowest-endpoint-card', 'slowest-endpoint-latency', 'neutral');
    applySeverity('highest-ttfb-card', 'highest-ttfb-value', 'neutral');
    applySeverity('slow-request-card', 'slow-request-count', 'neutral');
    applySeverity('latency-increase-card', 'largest-latency-increase', 'neutral');

    document.querySelector('#highest-ttfb-endpoint').textContent = 'N/A';
    document.querySelector('#highest-ttfb-value').textContent = 'No data';
    document.querySelector('#most-frequent-slow-endpoint').textContent = 'N/A';
    document.querySelector('#slow-request-count').textContent = 'No data';
    document.querySelector('#largest-latency-increase-endpoint').textContent = 'N/A';
    document.querySelector('#largest-latency-increase').textContent = 'No data';

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

function formatTimestamp(value) {
    if (!value) return 'Unknown time';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 'Unknown time';

    return date.toLocaleString();
}

function formatMetric(value, unit) {
    const number = Number(value);

    if (!Number.isFinite(number)) return 'N/A';

    return `${Math.round(number)} ${unit}`;
}

function escapeHtml(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function updateKpiPeriods() {
    const dateRangeValue = document.querySelector('#date-range').value;
    const periods = document.querySelectorAll('.kpi-period');

    periods.forEach((period) => {
        period.textContent = dateRangeValue || 'Selected date range';
    });
}

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

function formatChange(currentValue, previousValue, unit) {
    if (!currentValue || !previousValue) return 'No previous data';

    const difference = currentValue - previousValue;
    const percent = Math.abs((difference / previousValue) * 100).toFixed(1);

    const arrow = difference <= 0 ? '↓' : '↑';
    const absoluteDifference = Math.abs(Math.round(difference));

    return `${arrow} ${absoluteDifference} ${unit} (${percent}%)`;
}

function setChangeText(elementId, currentValue, previousValue, unit) {
    const element = document.querySelector(elementId);
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