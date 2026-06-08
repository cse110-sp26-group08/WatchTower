/**
 * `<wt-kpi-card>` — KPI metric card used on the performance page.
 * Renders a card with a title, icon, metric value, period-over-period change,
 * date range label, and an optional sparkline canvas.
 *
 * performance.js looks up the value, change, and sparkline elements by the IDs
 * provided via attributes and updates them directly after each data load.
 *
 * Attributes:
 *   card-title   - Heading shown at the top of the card.
 *   icon-class   - CSS class applied to the icon wrapper (for color theming).
 *   icon-src     - Image URL for the metric icon.
 *   icon-alt     - Alt text for the icon image.
 *   value-id     - ID given to the metric value element. Also controls layout:
 *                  "slowest-endpoint" gets an extra CSS class for truncated text.
 *   change-id    - ID given to the period-over-period change element.
 *   sparkline-id - ID given to the <canvas> element for the sparkline.
 */
class WtKpiCard extends HTMLElement {
    connectedCallback() {
        const cardTitle = this.getAttribute('card-title') || '';
        const iconClass = this.getAttribute('icon-class') || '';
        const iconSrc = this.getAttribute('icon-src') || '';
        const iconAlt = this.getAttribute('icon-alt') || '';
        const valueId = this.getAttribute('value-id') || '';
        const changeId = this.getAttribute('change-id') || '';
        const sparklineId = this.getAttribute('sparkline-id') || '';
        // Slowest endpoint values are long URLs that need different overflow handling
        const valueClass = valueId === 'slowest-endpoint' ? 'kpi-value kpi-value-endpoint' : 'kpi-value';

        this.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-header">
                    <h3>${cardTitle}</h3>
                    <div class="kpi-icon ${iconClass}">
                        <img src="${iconSrc}" alt="${iconAlt}">
                    </div>
                </div>
                <p id="${valueId}" class="${valueClass}" title="Loading...">Loading...</p>
                <p id="${changeId}" class="kpi-change">Loading...</p>
                <p class="kpi-period">Selected date range</p>
                <canvas id="${sparklineId}" class="sparkline-canvas"></canvas>
            </div>
        `;
    }
}

if (!customElements.get('wt-kpi-card')) {
    customElements.define('wt-kpi-card', WtKpiCard);
}
