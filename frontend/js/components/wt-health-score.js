class WtHealthScore extends HTMLElement {
    connectedCallback() {
        const title = this.getAttribute('title') || '';
        const prefix = this.getAttribute('prefix') || '';
        const iconPath = this.getAttribute('icon-path') || '';
        const supportText = this.getAttribute('support-text') || '';
        const eyebrow = this.getAttribute('eyebrow') || '';

        this.innerHTML = `
            <div class="health-score">
                <div class="health-score-header">
                    ${eyebrow ? `<p class="status-eyebrow">${eyebrow}</p>` : ''}
                    <h2 class="health-score-heading">${title}</h2>
                </div>
                <div class="health-ring score-red" id="${prefix}-bar-fill" aria-label="${title} score">
                    <div class="health-score-center">
                        <strong class="health-score-value" id="${prefix}-bar-value">0</strong>
                        <span class="health-score-label" id="${prefix}-score-label">Poor</span>
                    </div>
                </div>
                <div class="score-support-row">
                    <span class="support-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <path d="${iconPath}"></path>
                        </svg>
                    </span>
                    <span>${supportText}</span>
                </div>
            </div>
        `;
    }
}

if (!customElements.get('wt-health-score')) {
    customElements.define('wt-health-score', WtHealthScore);
}
