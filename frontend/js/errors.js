/* eslint-env browser */

/**
 * @fileoverview Behavior for the WatchTower errors page.
 *
 * graphs.js still owns app selection, refresh timing, and backend fetching.
 * This file adapts those shared hooks to the errors-specific UI so the page
 * can safely consume /api/events/error/apps/:appId and redraw as new data
 * arrives.
 */

const typeFilter = document.getElementById('type-filter');
let lastDashboardStateRef = null;

window.renderMetrics = function renderMetrics() {};
window.renderLogs = function renderLogs() {};

window.setProjectName = function setProjectName(name) {
  const projectName = document.getElementById('errors-project-name');

  if (projectName) {
    projectName.textContent = name || 'Selected project';
  }
};

window.setStatus = function setStatus(status, description, detail) {
  const statusText = document.getElementById('errors-page-status');
  const statusDescription = document.getElementById('errors-page-description');
  const statusDetail = document.getElementById('errors-page-detail');

  if (statusText) {
    statusText.textContent = status === 'DOWN' ? 'Attention needed' : 'Live telemetry active';
  }

  if (statusDescription) {
    statusDescription.textContent = description || 'Loading error telemetry.';
  }

  if (statusDetail) {
    statusDetail.textContent = detail || 'Waiting for recent error data.';
  }
};

window.renderEmptyLogs = function renderEmptyLogs(message) {
  setErrorsTableEmpty(message || 'No error data available.');
  resetSeverityBreakdown();
  updateTypeFilter([]);
  updateLastUpdated(null);

  const summary = document.getElementById('graph-summary');
  if (summary) {
    summary.textContent = message || 'No error data available.';
  }
};

if (typeFilter) {
  typeFilter.addEventListener('change', () => {
    renderErrorsTable();
  });
}

window.renderGraph = function renderGraph(filteredErrors) {
  const range = document.getElementById('time-range').value;
  const bucketSize = range === '24h' ? 'hour' : 'day';
  const chartCanvas = document.getElementById('chart-canvas-shell');
  const chartTable = document.getElementById('chart-table-shell');
  const graphTitle = document.getElementById('graph-title');
  const graphSummary = document.getElementById('graph-summary');

  updateTypeFilter(dashboardState?.errors || []);
  if (dashboardState !== lastDashboardStateRef) {
    updateLastUpdated(new Date());
    lastDashboardStateRef = dashboardState;
  }

  if (selectedChartView === 'table') {
    graphTitle.textContent = 'Recent error table';
    graphSummary.textContent = `${filteredErrors.length} matching errors shown in tabular form.`;
    chartCanvas.hidden = true;
    chartTable.hidden = false;
    renderChartTable(filteredErrors);
    destroyChart();
    renderSeverityBreakdown(filteredErrors);
    renderErrorsTable();
    return;
  }

  chartCanvas.hidden = false;
  chartTable.hidden = true;

  if (selectedChartView === 'pie') {
    graphTitle.textContent = 'Error severity breakdown';
    graphSummary.textContent = 'Distribution of matching errors by severity.';
    renderPieChart(filteredErrors);
    renderSeverityBreakdown(filteredErrors);
    renderErrorsTable();
    return;
  }

  if (selectedChartView === 'bar') {
    graphTitle.textContent = 'Errors by type';
    graphSummary.textContent = 'Error count grouped by error type.';
    renderErrorTypeBarChart(filteredErrors);
    renderSeverityBreakdown(filteredErrors);
    renderErrorsTable();
    return;
  }

  graphTitle.textContent = 'Error volume by severity';
  graphSummary.textContent = `${filteredErrors.length} error${filteredErrors.length === 1 ? '' : 's'} in the selected range.`;
  renderSeverityLineChart(filteredErrors, bucketSize);
  renderSeverityBreakdown(filteredErrors);
  renderErrorsTable();
};

function renderSeverityLineChart(filteredErrors, bucketSize) {
  const severities = ['critical', 'high', 'medium', 'low'];
  const colors = {
    critical: '#f04438',
    high: '#f79009',
    medium: '#eab308',
    low: '#16a34a',
  };

  const allBuckets = bucketErrors(filteredErrors, bucketSize);

  const datasets = severities.map((severityLevel) => {
    const severityErrors = filteredErrors.filter((event) => {
      return normalizeSeverity(event.metadata?.severity) === severityLevel;
    });
    const severityBuckets = bucketErrors(severityErrors, bucketSize);

    const data = allBuckets.labels.map((label) => {
      const labelIndex = severityBuckets.labels.indexOf(label);
      return labelIndex === -1 ? 0 : severityBuckets.values[labelIndex];
    });

    return {
      label: severityLevel.charAt(0).toUpperCase() + severityLevel.slice(1),
      data,
      borderColor: colors[severityLevel],
      backgroundColor: `${colors[severityLevel]}22`,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
    };
  });

  createOrUpdateChart('line', {
    labels: allBuckets.labels,
    datasets,
  });
}

function renderErrorTypeBarChart(filteredErrors) {
  const countsByType = {};

  filteredErrors.forEach((event) => {
    const errorType = normalizeErrorType(event.metadata?.errorType);
    countsByType[errorType] = (countsByType[errorType] || 0) + 1;
  });

  const entries = Object.entries(countsByType).sort(([, leftCount], [, rightCount]) => {
    return rightCount - leftCount;
  });

  createOrUpdateChart('bar', {
    labels: entries.map(([errorType]) => errorType),
    datasets: [{
      label: 'Count',
      data: entries.map(([, count]) => count),
      backgroundColor: entries.map(([errorType]) => getTypeColor(errorType)),
    }],
  });
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

  document.getElementById('sev-critical').textContent = String(counts.critical);
  document.getElementById('sev-high').textContent = String(counts.high);
  document.getElementById('sev-medium').textContent = String(counts.medium);
  document.getElementById('sev-low').textContent = String(counts.low);
  document.getElementById('sev-total').textContent = String(filteredErrors.length);
}

function resetSeverityBreakdown() {
  document.getElementById('sev-critical').textContent = '0';
  document.getElementById('sev-high').textContent = '0';
  document.getElementById('sev-medium').textContent = '0';
  document.getElementById('sev-low').textContent = '0';
  document.getElementById('sev-total').textContent = '0';
}

function renderErrorsTable() {
  if (!dashboardState) {
    return;
  }

  const range = document.getElementById('time-range').value;
  const severity = document.getElementById('severity-filter').value;
  const selectedType = typeFilter?.value || 'all';

  let filteredErrors = filterErrors(dashboardState.errors, range, severity);

  if (selectedType !== 'all') {
    filteredErrors = filteredErrors.filter((event) => {
      return normalizeErrorType(event.metadata?.errorType) === selectedType;
    });
  }

  const tableBody = document.getElementById('errors-table-body');

  if (!filteredErrors.length) {
    setErrorsTableEmpty('No errors match the selected filters.');
    return;
  }

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
          <td style="font-size:0.82rem;color:var(--muted);">${time}</td>
          <td><span class="severity-badge sev-${severityLabel}">${severityLabel}</span></td>
          <td><span class="error-type-badge">${errorType}</span></td>
          <td style="font-size:0.88rem;">${message}</td>
          <td class="url-cell" title="${url}">${url}</td>
          <td>${stack
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
  typeFilter.appendChild(new Option('All types', 'all'));
  errorTypes.forEach((errorType) => {
    typeFilter.appendChild(new Option(errorType, errorType));
  });
  typeFilter.value = errorTypes.includes(previousValue) || previousValue === 'all'
    ? previousValue
    : 'all';
}

function setErrorsTableEmpty(message) {
  const tableBody = document.getElementById('errors-table-body');
  tableBody.innerHTML = `<tr><td colspan="6" class="empty-state">${escapeHtml(message)}</td></tr>`;
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

function getTypeColor(errorType) {
  const colorMap = {
    TypeError: '#f04438',
    ReferenceError: '#f79009',
    SyntaxError: '#eab308',
    RangeError: '#16a34a',
    Error: '#1f49ff',
  };

  return colorMap[errorType] || '#1f49ff';
}

function toggleStack(index) {
  document.getElementById(`stack-${index}`)?.classList.toggle('open');
}

window.toggleStack = toggleStack;
