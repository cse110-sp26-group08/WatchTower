/* eslint-env browser */

/**
 * @fileoverview JS for the WatchTower errors page.
 * Depends on graphs.js being loaded first (uses dashboardState,
 * refreshDashboard, filterErrors, escapeHtml, formatTimestamp,
 * readJsonStorage).
 */

// ── Hook into graphs.js redraw ─────────────────────────────────────────────
// Wrapping redrawFromState so our extras (breakdown cards + full errors table)
// update whenever the time range, severity, or chart view filter changes.

const _originalRedraw = window.redrawFromState;

window.redrawFromState = function () {
  _originalRedraw?.();
  renderSeverityBreakdown();
  renderErrorsTable();
};

// ── Severity breakdown cards ───────────────────────────────────────────────

/**
 * Counts errors by severity using the current filters and updates
 * the five breakdown cards (critical / high / medium / low / total).
 */
function renderSeverityBreakdown() {
  if (!dashboardState) return;

  const range    = document.getElementById('time-range').value;
  const severity = document.getElementById('severity-filter').value;
  const filtered = filterErrors(dashboardState.errors, range, severity);

  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  filtered.forEach(e => {
    const sev = String(e.metadata?.severity || '').toLowerCase();
    if (sev in counts) counts[sev]++;
  });

  document.getElementById('sev-critical').textContent = counts.critical;
  document.getElementById('sev-high').textContent     = counts.high;
  document.getElementById('sev-medium').textContent   = counts.medium;
  document.getElementById('sev-low').textContent      = counts.low;
  document.getElementById('sev-total').textContent    = filtered.length;
}

// ── Full errors table ──────────────────────────────────────────────────────

const typeFilter = document.getElementById('type-filter');
typeFilter.addEventListener('change', renderErrorsTable);

/**
 * Renders the full errors table using the current time range, severity,
 * and error type filters. Reads from graphs.js dashboardState.
 */
function renderErrorsTable() {
  if (!dashboardState) return;

  const range    = document.getElementById('time-range').value;
  const severity = document.getElementById('severity-filter').value;
  const type     = typeFilter.value;

  let filtered = filterErrors(dashboardState.errors, range, severity);

  if (type !== 'all') {
    filtered = filtered.filter(e => String(e.metadata?.errorType || '') === type);
  }

  const tbody = document.getElementById('errors-table-body');

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No errors match the selected filters</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered
    .sort((a, b) => Date.parse(b.timestamp || 0) - Date.parse(a.timestamp || 0))
    .map((e, i) => {
      const sev     = String(e.metadata?.severity  || 'low').toLowerCase();
      const errType = escapeHtml(e.metadata?.errorType || 'Error');
      const msg     = escapeHtml(e.metadata?.message   || 'Error event');
      const url     = escapeHtml(e.url || '—');
      const stack   = e.metadata?.stack;
      const time    = escapeHtml(formatTimestamp(e.timestamp || e.receivedAt));

      return `
        <tr class="error-row">
          <td style="font-size:0.82rem;color:var(--muted);">${time}</td>
          <td><span class="severity-badge sev-${sev}">${sev}</span></td>
          <td><span class="error-type-badge">${errType}</span></td>
          <td style="font-size:0.88rem;">${msg}</td>
          <td class="url-cell" title="${url}">${url}</td>
          <td>${stack
            ? `<button class="stack-toggle" onclick="toggleStack(${i})">view</button>`
            : '—'
          }</td>
        </tr>
        ${stack ? `
        <tr>
          <td colspan="6" style="padding:0 10px 14px;">
            <div class="stack-trace" id="stack-${i}">${escapeHtml(stack)}</div>
          </td>
        </tr>` : ''}
      `;
    })
    .join('');
}

/**
 * Toggles the visibility of a stack trace row.
 * Called inline from table rows.
 * @param {number} i - Row index matching the stack-{i} element id.
 */
function toggleStack(i) {
  document.getElementById(`stack-${i}`)?.classList.toggle('open');
}