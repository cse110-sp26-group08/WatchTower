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
