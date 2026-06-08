/**
 * `<wt-health-score>` — circular score ring for performance and reliability metrics.
 * The ring fill is driven by a CSS custom property (--score-angle) set by dashboard.js
 * after the score is calculated. The component itself just provides the markup structure.
 *
 * Attributes:
 *   title        - Heading text above the ring.
 *   prefix       - Used to generate element IDs (e.g. "performance" → "performance-bar-fill").
 *                  dashboard.js looks these up by ID to update values.
 *   icon-path    - SVG path data for the support icon shown below the ring.
 *   support-text - Caption text shown next to the support icon.
 *   eyebrow      - Optional small label above the title.
 */
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
