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
