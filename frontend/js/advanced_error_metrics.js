/*
 * This file is loaded alongside dashboard.js on the Advanced Error Metrics page.
 * It reads dashboardState and utility functions from dashboard.js's global scope
 * (both scripts run without ES modules, so they share the same window scope).
 *
 * The window.* assignments below are page-level overrides intended to intercept
 * dashboard.js's render cycle. Currently dashboard.js calls its own local render
 * functions, so these overrides act as explicit declarations of which functions
 * this page customises. If dashboard.js is ever updated to dispatch via window.*,
 * these overrides will take effect automatically.
 *
 * window.startAutoRefresh is intentionally a no-op — this page does not use
 * the auto-refresh interval that the main dashboard page runs.
 */
/* global dashboardState, createOrUpdateChart, escapeHtml, filterErrors, formatTimestamp */

const typeFilter = document.getElementById('type-filter');
let lastDashboardStateRef = null;

window.startAutoRefresh = function () {};

window.renderMetrics = function renderMetrics(_allErrors, filteredErrors) {
  renderSeverityBreakdown(filteredErrors || []);
};

window.renderLogs = function renderLogs() {
  renderErrorsTable();
};

window.setProjectName = function setProjectName(name) {
  setElementText('errors-project-name', name || 'Selected project');
  const dashNav = document.querySelector('watchtower-dash-navbar');
  if (dashNav) dashNav.setAttribute('app-name', name || '');
};

window.setStatus = function setStatus(status, description, detail) {
  const fallbackStatus = status === 'DOWN'
    ? 'Attention needed for the selected project.'
    : 'Live telemetry active for the selected project.';

  setElementText('errors-page-status', description || fallbackStatus);
  setElementText('errors-page-detail', detail || 'Waiting for recent error data.');
};

window.renderEmptyLogs = function renderEmptyLogs(message) {
  const emptyMessage = message || 'No error data available.';

  setErrorsTableEmpty(emptyMessage);
  setErrorsTableSummary(emptyMessage);
  resetSeverityBreakdown();
  updateTypeFilter([]);
  updateLastUpdated(null);
  setElementText('graph-summary', emptyMessage);
};

if (typeFilter) {
  typeFilter.addEventListener('change', () => {
    renderErrorsTable();
  });
}

window.renderGraph = function renderGraph(filteredErrors) {
  const range = document.getElementById('time-range')?.value || '24h';
  const chartCanvas = document.getElementById('errors-chart-canvas-shell');
  const graphTitle = document.getElementById('graph-title');
  const graphSummary = document.getElementById('graph-summary');

  updateTypeFilter(dashboardState?.errors || []);
  if (dashboardState !== lastDashboardStateRef) {
    updateLastUpdated(new Date());
    lastDashboardStateRef = dashboardState;
  }

  if (!graphTitle || !graphSummary || !chartCanvas) {
    return;
  }

  chartCanvas.hidden = false;

  graphTitle.textContent = 'Error volume by severity';
  graphSummary.textContent = `${filteredErrors.length} error${filteredErrors.length === 1 ? '' : 's'} in the selected range.`;
  renderSeverityLineChart(filteredErrors, range);
};

function renderSeverityLineChart(filteredErrors, range) {
  const severities = ['critical', 'high', 'medium', 'low'];
  const colors = {
    critical: '#f04438',
    high: '#f79009',
    medium: '#eab308',
    low: '#16a34a',
  };

  const allBuckets = createErrorIntervalBuckets(range);

  const datasets = severities.map((severityLevel) => {
    const severityErrors = filteredErrors.filter((event) => {
      return normalizeSeverity(event.metadata?.severity) === severityLevel;
    });

    return {
      label: severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1),
      data: countErrorsInBuckets(severityErrors, allBuckets),
      borderColor: colors[severityLevel],
      backgroundColor: `${colors[severityLevel]}22`,
      tension: 0,
      fill: false,
      pointRadius: 3,
    };
  });

  createOrUpdateChart('line', {
    labels: allBuckets.labels,
    datasets,
  });
}

function createErrorIntervalBuckets(range) {
  const intervals = {
    '24h': 60 * 60 * 1000,
    '7d': 24 * 60 * 60 * 1000,
    '30d': 2 * 24 * 60 * 60 * 1000,
  };
  const ranges = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };

  const intervalMs = intervals[range] || intervals['24h'];
  const rangeMs = ranges[range] || ranges['24h'];
  const endTime = Date.now();
  const startTime = endTime - rangeMs;
  const firstBucketStart = Math.floor(startTime / intervalMs) * intervalMs;
  const buckets = [];

  for (let bucketStart = firstBucketStart; bucketStart <= endTime; bucketStart += intervalMs) {
    buckets.push({
      key: String(bucketStart),
      label: formatBucketLabel(bucketStart, range),
    });
  }

  return {
    intervalMs,
    startTime,
    endTime,
    labels: buckets.map((bucket) => bucket.label),
    keys: buckets.map((bucket) => bucket.key),
  };
}

function countErrorsInBuckets(errors, bucketSet) {
  const countsByKey = new Map(bucketSet.keys.map((key) => [key, 0]));

  errors.forEach((event) => {
    const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);

    if (!Number.isFinite(timestamp) || timestamp < bucketSet.startTime || timestamp > bucketSet.endTime) {
      return;
    }

    const bucketKey = String(Math.floor(timestamp / bucketSet.intervalMs) * bucketSet.intervalMs);
    countsByKey.set(bucketKey, (countsByKey.get(bucketKey) || 0) + 1);
  });

  return bucketSet.keys.map((key) => countsByKey.get(key) || 0);
}

function formatBucketLabel(bucketStart, range) {
  const date = new Date(bucketStart);
  const options = range === '24h'
    ? { hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric' };

  return date.toLocaleString(undefined, options);
}

function renderSeverityBreakdown(filteredErrors) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  filteredErrors.forEach((event) => {
    const severity = normalizeSeverity(event.metadata?.severity);
    counts[severity] += 1;
  });

  setElementText('sev-critical', String(counts.critical));
  setElementText('sev-high', String(counts.high));
  setElementText('sev-medium', String(counts.medium));
  setElementText('sev-low', String(counts.low));
  setElementText('sev-total', String(filteredErrors.length));
}

function resetSeverityBreakdown() {
  setElementText('sev-critical', '0');
  setElementText('sev-high', '0');
  setElementText('sev-medium', '0');
  setElementText('sev-low', '0');
  setElementText('sev-total', '0');
}

function renderErrorsTable() {
  if (!dashboardState) {
    setErrorsTableSummary('No error data available.');
    return;
  }

  const range = document.getElementById('time-range')?.value || '24h';
  const severity = document.getElementById('severity-filter')?.value || 'all';
  const selectedType = typeFilter?.value || 'all';

  let filteredErrors = filterErrors(dashboardState.errors, range, severity);

  if (selectedType !== 'all') {
    filteredErrors = filteredErrors.filter((event) => {
      return normalizeErrorType(event.metadata?.errorType) === selectedType;
    });
  }

  const tableBody = document.getElementById('errors-table-body');

  if (!tableBody) {
    return;
  }

  if (!filteredErrors.length) {
    const emptyMessage = 'No errors match the selected filters.';
    setErrorsTableEmpty(emptyMessage);
    setErrorsTableSummary(emptyMessage);
    return;
  }

  setErrorsTableSummary(`${filteredErrors.length} matching error${filteredErrors.length === 1 ? '' : 's'} in the selected range.`);

  tableBody.innerHTML = filteredErrors
    .slice()
    .sort((leftEvent, rightEvent) => {
      return Date.parse(rightEvent.timestamp || rightEvent.receivedAt || 0)
        - Date.parse(leftEvent.timestamp || leftEvent.receivedAt || 0);
    })
    .map((event, index) => {
      const severityLabel = normalizeSeverity(event.metadata?.severity);
      const errorType = escapeHtml(normalizeErrorType(event.metadata?.errorType));
      const message = escapeHtml(event.metadata?.message || 'Error event');
      const url = escapeHtml(event.url || '-');
      const stack = event.metadata?.stack;
      const time = escapeHtml(formatTimestamp(event.timestamp || event.receivedAt));

      return `
        <tr class="error-row">
          <td class="time-column" style="font-size:0.82rem;color:var(--muted);">${time}</td>
          <td class="severity-column"><span class="severity-badge sev-${severityLabel}">${severityLabel}</span></td>
          <td class="compact-left-column"><span class="error-type-badge">${errorType}</span></td>
          <td class="message-column" style="font-size:0.88rem;">${message}</td>
          <td class="url-cell" title="${url}">${url}</td>
          <td class="stack-column">${stack
    ? `<button class="stack-toggle" type="button" onclick="toggleStack(${index})">view</button>`
    : '-'
}</td>
        </tr>
        ${stack
    ? `<tr>
          <td colspan="6" style="padding:0 10px 14px;">
            <div class="stack-trace" id="stack-${index}">${escapeHtml(stack)}</div>
          </td>
        </tr>`
    : ''
}
      `;
    })
    .join('');
}

function updateTypeFilter(errors) {
  if (!typeFilter) {
    return;
  }

  const previousValue = typeFilter.value || 'all';
  const errorTypes = Array.from(new Set(
    errors.map((event) => normalizeErrorType(event.metadata?.errorType)),
  )).sort((leftType, rightType) => leftType.localeCompare(rightType));

  typeFilter.innerHTML = '';
  typeFilter.appendChild(new Option('All Types', 'all'));
  errorTypes.forEach((errorType) => {
    typeFilter.appendChild(new Option(errorType, errorType));
  });
  typeFilter.value = errorTypes.includes(previousValue) || previousValue === 'all'
    ? previousValue
    : 'all';
}

function setErrorsTableEmpty(message) {
  const tableBody = document.getElementById('errors-table-body');

  if (!tableBody) {
    return;
  }

  tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(message)}</td></tr>`;
}

function setErrorsTableSummary(message) {
  setElementText('errors-table-summary', message);
}

function updateLastUpdated(date) {
  const lastUpdated = document.getElementById('errors-last-updated');

  if (!lastUpdated) {
    return;
  }

  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    lastUpdated.textContent = 'Not refreshed yet';
    return;
  }

  lastUpdated.textContent = `Last refreshed ${date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  })}`;
}

function setElementText(id, value) {
  const element = document.getElementById(id);

  if (element) {
    element.textContent = value;
  }
}

function normalizeSeverity(value) {
  const normalizedValue = String(value || '').toLowerCase();

  if (['critical', 'high', 'medium', 'low'].includes(normalizedValue)) {
    return normalizedValue;
  }

  return 'low';
}

function normalizeErrorType(value) {
  const trimmedValue = String(value || '').trim();
  return trimmedValue || 'Error';
}

function toggleStack(index) {
  document.getElementById(`stack-${index}`)?.classList.toggle('open');
}

window.toggleStack = toggleStack;
