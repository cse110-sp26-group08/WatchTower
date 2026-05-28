class WtKpiCard extends HTMLElement {
    connectedCallback() {
        const cardTitle = this.getAttribute('card-title') || '';
        const iconClass = this.getAttribute('icon-class') || '';
        const iconSrc = this.getAttribute('icon-src') || '';
        const iconAlt = this.getAttribute('icon-alt') || '';
        const valueId = this.getAttribute('value-id') || '';
        const changeId = this.getAttribute('change-id') || '';
        const sparklineId = this.getAttribute('sparkline-id') || '';

        this.innerHTML = `
            <div class="kpi-card">
                <div class="kpi-header">
                    <h3>${cardTitle}</h3>
                    <div class="kpi-icon ${iconClass}">
                        <img src="${iconSrc}" alt="${iconAlt}">
                    </div>
                </div>
                <p id="${valueId}" class="kpi-value">Loading...</p>
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
