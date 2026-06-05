/* global flatpickr, escapeHtml */

const RANGE_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};
const AUTO_REFRESH_MS = 5000;

let advancedState = {
  app: null,
  errors: [],
};
let errorChart = null;
let refreshAbortController = null;
let refreshIntervalId = null;

document.addEventListener('DOMContentLoaded', () => {
  initAdvancedErrorMetrics().catch((error) => {
    console.error('Advanced error metrics failed to initialize:', error);
    setProjectName('Selected project');
    setStatus('DOWN', 'Could not load error metrics.', 'No backend error data was available for this page.');
    renderEmptyState('Could not load error data.');
  });
});

async function initAdvancedErrorMetrics() {
  initDatePicker();
  bindAdvancedErrorControls();
  const selectedApp = await resolveSelectedApp();
  if (!selectedApp?.id) {
    setProjectName('Selected project');
    setStatus('DOWN', 'No selected project.', 'Return to app selection and choose a project.');
    renderEmptyState('No selected app.');
    return;
  }

  setProjectName(selectedApp.name || 'Selected project');
  setStatus('UP', `Checking ${selectedApp.name || 'project'}...`, 'Refreshing error telemetry from the backend.');
  await refreshAdvancedErrorMetrics(selectedApp, { force: true });
  startAutoRefresh();
}

function initDatePicker() {
  if (!window.flatpickr) {
    return;
  }

  flatpickr('#date-range', {
    mode: 'range',
    dateFormat: 'm/d/Y',
    defaultDate: [
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date(),
    ],
    onChange: () => {
      redrawFromState();
    },
  });
}

function bindAdvancedErrorControls() {
  document.getElementById('refresh-dashboard')?.addEventListener('click', async () => {
    const selectedApp = advancedState.app || await resolveSelectedApp();
    if (selectedApp?.id) {
      await refreshAdvancedErrorMetrics(selectedApp, { force: true });
    }
  });

  document.getElementById('time-range')?.addEventListener('change', redrawFromState);
  document.getElementById('severity-filter')?.addEventListener('change', redrawFromState);

  const autoRefreshToggle = document.querySelector('.toggle-switch input');
  const toggleStatus = document.querySelector('.toggle-status');
  if (autoRefreshToggle && toggleStatus) {
    toggleStatus.textContent = autoRefreshToggle.checked ? 'ON' : 'OFF';
    autoRefreshToggle.addEventListener('change', () => {
      toggleStatus.textContent = autoRefreshToggle.checked ? 'ON' : 'OFF';

      if (autoRefreshToggle.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  }

  document.addEventListener('visibilitychange', async () => {
    if (document.hidden) {
      abortActiveRefresh();
      stopAutoRefresh();
      return;
    }

    const selectedApp = advancedState.app || await resolveSelectedApp();
    if (selectedApp?.id) {
      await refreshAdvancedErrorMetrics(selectedApp, { force: true });
      startAutoRefresh();
    }
  });

  window.addEventListener('beforeunload', () => {
    abortActiveRefresh();
    stopAutoRefresh();
  });
}

async function refreshCurrentErrors(options = {}) {
  const selectedApp = advancedState.app || await resolveSelectedApp();
  if (selectedApp?.id) {
    await refreshAdvancedErrorMetrics(selectedApp, options);
  }
}

function startAutoRefresh() {
  stopAutoRefresh();

  const autoRefreshToggle = document.querySelector('.toggle-switch input');
  if (!autoRefreshToggle?.checked || document.hidden) {
    return;
  }

  refreshIntervalId = window.setInterval(() => {
    refreshCurrentErrors();
  }, AUTO_REFRESH_MS);
}

function stopAutoRefresh() {
  if (refreshIntervalId) {
    window.clearInterval(refreshIntervalId);
    refreshIntervalId = null;
  }
}

async function refreshAdvancedErrorMetrics(selectedApp, options = {}) {
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

  setStatus('UP', `Checking ${selectedApp.name || 'project'}...`, 'Refreshing error telemetry from the backend.');

  try {
    const [appResponse, errorResponse] = await Promise.all([
      fetch(`/api/apps/${selectedApp.id}`, { cache: 'no-store', signal }),
      fetch(`/api/events/error/apps/${selectedApp.id}`, { cache: 'no-store', signal }),
    ]);

    const [appData, errorData] = await Promise.all([
      appResponse.json(),
      errorResponse.json(),
    ]);

    const app = appResponse.ok && appData.app
      ? {
        ...appData.app,
        url: appData.app.url || selectedApp.url,
      }
      : selectedApp;

    const errors = Array.isArray(errorData.events)
      ? errorData.events.filter((event) => event.type === 'error' || !event.type)
      : [];

    advancedState = { app, errors };
    localStorage.setItem('watchtowerSelectedApp', JSON.stringify(app));
    redrawFromState();
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('Error refreshing advanced error metrics:', error);
      setStatus('DOWN', 'Could not refresh error metrics.', 'The latest backend error events could not be loaded.');
      renderEmptyState('Could not load error data.');
    }
  } finally {
    if (refreshAbortController?.signal === signal) {
      refreshAbortController = null;
    }
  }
}

function abortActiveRefresh() {
  if (refreshAbortController) {
    refreshAbortController.abort();
    refreshAbortController = null;
  }
}

function redrawFromState() {
  const { app, errors } = advancedState;

  if (!app) {
    renderEmptyState('No selected app.');
    return;
  }

  setProjectName(app.name || 'Selected project');

  const filteredErrors = getFilteredErrors(errors);

  renderSeverityBreakdown(filteredErrors);
  renderErrorsTable(filteredErrors);
  renderGraph(filteredErrors);
  renderStatus(app, filteredErrors, errors);
  updateLastUpdated(new Date());
}

function renderStatus(app, filteredErrors, allErrors) {
  const criticalErrors = filteredErrors.filter((event) => normalizeSeverity(event.metadata?.severity) === 'critical');

  if (criticalErrors.length > 0) {
    setStatus(
      'UP',
      `${app.name || 'Project'} has critical errors to review.`,
      `${criticalErrors.length} critical error${criticalErrors.length === 1 ? '' : 's'} in the current filters.`,
    );
    return;
  }

  if (filteredErrors.length > 0) {
    setStatus(
      'UP',
      `${app.name || 'Project'} has recent error activity.`,
      '0 critical errors in the current filters.',
    );
    return;
  }

  if (allErrors.length > 0) {
    setStatus(
      'UP',
      `${app.name || 'Project'} has no errors in this range.`,
      'Try changing the time range or severity filter.',
    );
    return;
  }

  setStatus(
    'UP',
    `${app.name || 'Project'} has no recorded error events.`,
    'The backend returned no error events for this application yet.',
  );
}

async function resolveSelectedApp() {
  const queryAppId = new URLSearchParams(window.location.search).get('appId');
  const storedApp = readJsonStorage('watchtowerSelectedApp');
  if (queryAppId) {
    try {
      const response = await fetch(`/api/apps/${queryAppId}`, { cache: 'no-store' });
      const data = await response.json();
      if (response.ok && data.app) {
        const resolvedUrl = data.app.url || (storedApp?.id === data.app.id ? storedApp.url : undefined);
        const appWithUrl = { ...data.app, url: resolvedUrl };
        localStorage.setItem('watchtowerSelectedApp', JSON.stringify(appWithUrl));
        return appWithUrl;
      }
    } catch (error) {
      console.error('Failed to resolve selected app:', error);
    }
  }

  return storedApp;
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
    localStorage.removeItem(key);
    return null;
  }
}

function getFilteredErrors(errors) {
  const range = document.getElementById('time-range')?.value || '24h';
  const severity = document.getElementById('severity-filter')?.value || 'all';
  const selectedDateRange = getSelectedDateRange();
  const cutoff = Date.now() - (RANGE_MS[range] || RANGE_MS['24h']);

  return errors.filter((event) => {
    const timestamp = Date.parse(event.timestamp || event.receivedAt || 0);
    const eventSeverity = normalizeSeverity(event.metadata?.severity);
    const withinRange = selectedDateRange
      ? timestamp >= selectedDateRange.startTime && timestamp <= selectedDateRange.endTime
      : timestamp >= cutoff;
    const severityMatch = severity === 'all' || eventSeverity === severity;
    return Number.isFinite(timestamp) && withinRange && severityMatch;
  });
}

function getSelectedDateRange() {
  const dateRangeValue = document.getElementById('date-range')?.value?.trim() || '';
  if (!dateRangeValue || !dateRangeValue.includes(' to ')) {
    return null;
  }

  const [startValue, endValue] = dateRangeValue.split(' to ');
  const startDate = new Date(startValue);
  const endDate = new Date(endValue);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return null;
  }

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startTime: startDate.getTime(),
    endTime: endDate.getTime(),
  };
}

function renderGraph(filteredErrors) {
  const range = document.getElementById('time-range')?.value || '24h';
  const chartCanvasShell = document.getElementById('errors-chart-canvas-shell');
  const graphTitle = document.getElementById('graph-title');
  const graphSummary = document.getElementById('graph-summary');
  if (!chartCanvasShell || !graphTitle || !graphSummary) {
    return;
  }
  graphTitle.textContent = 'Error volume by severity';
  graphSummary.textContent = `${filteredErrors.length} error${filteredErrors.length === 1 ? '' : 's'} in the selected range.`;
  chartCanvasShell.hidden = false;
  renderSeverityLineChart(filteredErrors, range);
}

function renderSeverityLineChart(filteredErrors, range) {
  const severities = ['critical', 'high', 'medium', 'low'];
  const colors = {
    critical: '#f04438',
    high: '#f79009',
    medium: '#eab308',
    low: '#16a34a',
  };
  const bucketSet = createErrorIntervalBuckets(range);
  const datasets = severities.map((severityLevel) => {
    const severityErrors = filteredErrors.filter((event) => {
      return normalizeSeverity(event.metadata?.severity) === severityLevel;
    });
    return {
      label: severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1),
      data: countErrorsInBuckets(severityErrors, bucketSet),
      borderColor: colors[severityLevel],
      backgroundColor: `${colors[severityLevel]}22`,
      tension: 0,
      fill: false,
      pointRadius: 3,
    };
  });

  createOrUpdateChart('line', {
    labels: bucketSet.labels,
    datasets,
  });
}

function createOrUpdateChart(type, data) {
  const context = document.getElementById('dashboard-chart');
  if (!context || !window.Chart) {
    return;
  }
  destroyChart();
  errorChart = new window.Chart(context, {
    type,
    data,
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });
}

function destroyChart() {
  if (errorChart) {
    errorChart.destroy();
    errorChart = null;
  }
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

function renderErrorsTable(filteredErrors) {
  const tableBody = document.getElementById('errors-table-body');

  if (!tableBody) {
    return;
  }

  if (!filteredErrors.length) {
    const emptyMessage = 'No errors in the selected filters.';
    setErrorsTableEmpty(emptyMessage);
    setErrorsTableSummary(emptyMessage);
    return;
  }

  setErrorsTableSummary(`${filteredErrors.length} matching error${filteredErrors.length === 1 ? '' : 's'} in the selected range.`);
  const fragment = document.createDocumentFragment();
  filteredErrors
    .slice()
    .sort((leftEvent, rightEvent) => {
      return Date.parse(rightEvent.timestamp || rightEvent.receivedAt || 0)
        - Date.parse(leftEvent.timestamp || leftEvent.receivedAt || 0);
    })
    .forEach((event, index) => {
      const severityLabel = normalizeSeverity(event.metadata?.severity);
      const errorType = normalizeErrorType(event.metadata?.errorType);
      const message = event.metadata?.message || 'Error event';
      const url = event.url || '-';
      const stack = event.metadata?.stack;
      const time = formatTimestamp(event.timestamp || event.receivedAt);

      const row = document.createElement('tr');
      row.className = 'error-row';

      const timeCell = document.createElement('td');
      timeCell.className = 'time-column';
      timeCell.style.fontSize = '0.82rem';
      timeCell.style.color = 'var(--muted)';
      timeCell.textContent = time;
      row.appendChild(timeCell);

      const severityCell = document.createElement('td');
      severityCell.className = 'severity-column';
      const severityBadge = document.createElement('span');
      severityBadge.className = `severity-badge sev-${severityLabel}`;
      severityBadge.textContent = severityLabel;
      severityCell.appendChild(severityBadge);
      row.appendChild(severityCell);

      const typeCell = document.createElement('td');
      typeCell.className = 'compact-left-column';
      const typeBadge = document.createElement('span');
      typeBadge.className = 'error-type-badge';
      typeBadge.textContent = errorType;
      typeCell.appendChild(typeBadge);
      row.appendChild(typeCell);

      const messageCell = document.createElement('td');
      messageCell.className = 'message-column';
      messageCell.style.fontSize = '0.88rem';
      messageCell.textContent = message;
      row.appendChild(messageCell);

      const urlCell = document.createElement('td');
      urlCell.className = 'url-cell';
      urlCell.title = url;
      urlCell.textContent = url;
      row.appendChild(urlCell);

      const stackCell = document.createElement('td');
      stackCell.className = 'stack-column';

      if (stack) {
        const stackButton = document.createElement('button');
        stackButton.className = 'stack-toggle';
        stackButton.type = 'button';
        stackButton.textContent = 'view';
        stackButton.addEventListener('click', () => {
          toggleStack(index);
        });
        stackCell.appendChild(stackButton);
      } else {
        stackCell.textContent = '-';
      }

      row.appendChild(stackCell);
      fragment.appendChild(row);

      if (stack) {
        const stackRow = document.createElement('tr');
        const stackRowCell = document.createElement('td');
        stackRowCell.colSpan = 6;
        stackRowCell.style.padding = '0 10px 14px';

        const stackTrace = document.createElement('div');
        stackTrace.className = 'stack-trace';
        stackTrace.id = `stack-${index}`;
        stackTrace.textContent = stack;

        stackRowCell.appendChild(stackTrace);
        stackRow.appendChild(stackRowCell);
        fragment.appendChild(stackRow);
      }
    });

  tableBody.replaceChildren(fragment);
}

function renderEmptyState(message) {
  setErrorsTableEmpty(message);
  setErrorsTableSummary(message);
  resetSeverityBreakdown();
  updateLastUpdated(null);
  setElementText('graph-summary', message);
  destroyChart();
}

function setProjectName(name) {
  setElementText('errors-project-name', name || 'Selected project');
  const layout = document.querySelector('wt-dash-layout');
  if (layout) {
    layout.setAttribute('app-name', name || '');
  }
}

function setStatus(status, description, detail) {
  const fallbackStatus = status === 'DOWN'
    ? 'Attention needed for the selected project.'
    : 'Live telemetry active for the selected project.';
  setElementText('errors-page-status', description || fallbackStatus);
  setElementText('errors-page-detail', detail || 'Waiting for recent error data.');
}

function setErrorsTableEmpty(message) {
  const tableBody = document.getElementById('errors-table-body');

  if (!tableBody) {
    return;
  }
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.className = 'empty-state';
  cell.textContent = message;
  row.appendChild(cell);
  tableBody.replaceChildren(row);
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

function toggleStack(index) {
  document.getElementById(`stack-${index}`)?.classList.toggle('open');
}

window.toggleStack = toggleStack;
