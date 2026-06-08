/**
 * `<wt-insight-item>` — small bottleneck insight card used on the performance page.
 * Renders a label, a primary value (e.g. endpoint name), and a secondary metric
 * (e.g. average latency). Both value and metric elements are given IDs so
 * performance.js can update them without re-rendering the component.
 *
 * Attributes:
 *   card-id     - ID on the outer wrapper div (used for severity class toggling).
 *   label       - Static display label for the insight type.
 *   insight-id  - ID on the primary value element (e.g. endpoint name).
 *   metric-id   - ID on the secondary metric element (e.g. "320 ms avg").
 */
class WtInsightItem extends HTMLElement {
    connectedCallback() {
        const cardId = this.getAttribute('card-id') || '';
        const label = this.getAttribute('label') || '';
        const insightId = this.getAttribute('insight-id') || '';
        const metricId = this.getAttribute('metric-id') || '';

        this.innerHTML = `
            <div class="insight-item" id="${cardId}">
                <div>
                    <p class="insight-label">${label}</p>
                    <p id="${insightId}" class="insight-value">N/A</p>
                </div>
                <p id="${metricId}" class="insight-metric">No data</p>
            </div>
        `;
    }
}

if (!customElements.get('wt-insight-item')) {
    customElements.define('wt-insight-item', WtInsightItem);
}
