/**
 * `<wt-metric-card>` — compact metric display card used on the dashboard.
 * Renders a metric name, current value, a comparison row, and an optional sparkline.
 *
 * dashboard.js updates the value and comparison elements by ID after each data load.
 *
 * Attributes:
 *   card-class    - Extra CSS class on the outer .metric element (for per-metric theming).
 *   name          - Display label for the metric.
 *   value-id      - ID given to the value element.
 *   value-class   - Extra class on the value element (e.g. for color coding).
 *   compare-id    - ID given to the comparison text element.
 *   compare-text  - Static comparison label (e.g. "vs. yesterday").
 *   img-src       - Optional up/down arrow image shown next to the comparison text.
 *                   When absent, only the comparison text is rendered.
 *   sparkline-id  - ID given to the <canvas> sparkline element. Omit to skip the canvas.
 */
class WtMetricCard extends HTMLElement {
    connectedCallback() {
        const cardClass = this.getAttribute('card-class') || '';
        const name = this.getAttribute('name') || '';
        const valueId = this.getAttribute('value-id') || '';
        const valueClass = this.getAttribute('value-class') || '';
        const compareId = this.getAttribute('compare-id') || '';
        const compareText = this.getAttribute('compare-text') || '';
        const imgSrc = this.getAttribute('img-src') || '';
        const sparklineId = this.getAttribute('sparkline-id') || '';

        const valueClasses = ['metric-val', valueClass].filter(Boolean).join(' ');
        // When an image src is provided, show the icon alongside the comparison text
        const compareContent = imgSrc
            ? `<img src="${imgSrc}" alt="up/down"><p id="${compareId}">${compareText}</p>`
            : `<p>${compareText}</p>`;

        this.innerHTML = `
            <div class="metric ${cardClass}">
                <h2 class="metric-name">${name}</h2>
                <h2 class="${valueClasses}" id="${valueId}">0</h2>
                <div class="compare-yesterday">
                    ${compareContent}
                </div>
                ${sparklineId ? `<canvas id="${sparklineId}" class="sparkline-canvas"></canvas>` : ''}
            </div>
        `;
    }
}

if (!customElements.get('wt-metric-card')) {
    customElements.define('wt-metric-card', WtMetricCard);
}
